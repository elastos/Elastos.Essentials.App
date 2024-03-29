/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import type { MasterWallet } from '../model/masterwallets/masterwallet';
import type { EVMNetwork } from '../model/networks/evms/evm.network';
import type { AnyNetwork } from '../model/networks/network';
import { Native } from './native.service';
import { LocalStorage } from './storage.service';

export type PriorityNetworkChangeCallback = (newNetwork) => Promise<void>;

type RawLastUsedNetworks = { [networkKey: string]: number }

export type LastUsedNetworks = {
    raw: RawLastUsedNetworks; // map of network key -> last used timestamp
    list: { // Based on the raw entries, ordered list of networks.
        network: AnyNetwork;
        timestamp: number;
    }[];
}

@Injectable({
    providedIn: 'root'
})
export class WalletNetworkService {
    public static instance: WalletNetworkService = null;

    private networks: AnyNetwork[] = [];
    private networkVisibilities: {
        [networkKey: string]: boolean // Key value of network key -> visible in network chooser or not.
    } = {};

    public activeNetwork = new BehaviorSubject<AnyNetwork>(null);
    public lastUsedNetworks = new BehaviorSubject<LastUsedNetworks>({
        raw: {},
        list: []
    });

    /** Notifies whenever the networks list changes (initial registration, custom networks added/removed) */
    public networksList = new BehaviorSubject<AnyNetwork[]>([]);

    private priorityNetworkChangeCallback?: PriorityNetworkChangeCallback = null;

    constructor(
        public events: GlobalEvents,
        public native: Native,
        private globalNetworksService: GlobalNetworksService,
        private globalStorageService: GlobalStorageService,
        private globalFirebaseService: GlobalFirebaseService,
        private localStorage: LocalStorage) {
        WalletNetworkService.instance = this;
    }

    /**
     * Called every time a user signs in
     */
    public async init(): Promise<void> {
        this.networks = [];
        await this.loadNetworkVisibilities();
    }

    /**
     * Called every time a user signs out
     */
    public stop() {
        this.networks = [];
    }

    /**
     * Appends a usable network to the list. We let networks register themselves, we don't
     * use networks in this service, to avoid circular dependencies.
     */
    public async registerNetwork(network: AnyNetwork, useAsDefault = false): Promise<void> {
        this.networks.push(network);

        let savedNetworkKey = await this.localStorage.get('activenetwork') as string;
        const savedNetwork = await this.getNetworkByKey(savedNetworkKey);
        if (this.globalNetworksService.activeNetworkTemplate.value === network.networkTemplate) {
            if (!savedNetwork && useAsDefault) {
                Logger.log("wallet", "WalletNetworkService - Using default network:", network);
                await this.notifyNetworkChange(network); // Normally, elastos
            }
            else if (savedNetworkKey && savedNetworkKey === network.key) {
                Logger.log("wallet", "WalletNetworkService - Reloading network:", savedNetwork);
                await this.notifyNetworkChange(savedNetwork);
            }
        }

        // Order networks list alphabetically
        this.networks.sort((a, b) => {
            return a.name > b.name ? 1 : -1;
        });

        this.networksList.next(this.networks);
    }

    /**
     * Called by the boot sequence when all networks are registered, so we know we have the whole networks list from here.
     */
    public notifyAllNetworksRegistered() {
        void this.loadLastUsedNetworks();
    }

    /**
     * Used to remove a custom network from the network instances, when deleting it.
     */
    public removeNetworkByKey(networkKey: string) {
        this.networks.splice(this.networks.findIndex(n => n.key === networkKey), 1);
        this.networksList.next(this.networks);
    }

    /**
        * Returns the list of all networks.
        * Possibly filter out some unsupported networks:
        * eg: do not support the BTC network when the wallet is imported by EVM private key.
        */
    public getAvailableNetworks(masterWallet: MasterWallet = null, networkTemplate: string = null): AnyNetwork[] {
        if (!networkTemplate)
            networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

        // Keep only networks for the target network template.
        let networks = this.networks.filter(n => n.networkTemplate === networkTemplate);

        if (masterWallet) {
            return networks.filter(n => masterWallet.supportsNetwork(n));
        } else {
            return networks;
        }
    }

    /**
     * Returns the list of available networks, but only for networks that user has chosen
     * to make visible in settings.
     */
    public getDisplayableNetworks(): AnyNetwork[] {
        return this.getAvailableNetworks().filter(n => this.getNetworkVisible(n));
    }

    /**
     * Returns chain ids of networks that belong to the given network template (if passed), or by default,
     * to the active network tempplate.
     */
    public getAvailableEVMChainIDs(networkTemplate: string = null): number[] {
        let availableNetworks = this.getAvailableNetworks(null, networkTemplate);
        let displayableEVMChainIds = availableNetworks
            .filter(n => n.isEVMNetwork())
            .map(n => (<EVMNetwork>n).getMainChainID())
            .filter(chainId => chainId !== -1);

        return displayableEVMChainIds;
    }

    /**
     * Callback set by the wallet service to be informed of network change requests before anyone else
     * and rebuild everything needed first.
     */
    public setPriorityNetworkChangeCallback(callback: PriorityNetworkChangeCallback) {
        this.priorityNetworkChangeCallback = callback;
    }

    public resetPriorityNetworkChangeCallback() {
        this.priorityNetworkChangeCallback = null;
    }

    public async setActiveNetwork(network: AnyNetwork) {
        Logger.log("wallet", "Setting active network to", network);

        // Save choice to local storage
        await this.localStorage.set('activenetwork', network.key);

        // Stats
        void this.globalFirebaseService.logEvent("switch_network_" + network.key);

        // Update the last used date
        void this.updateLastUsedNetworkDate(network);

        await this.notifyNetworkChange(network);
    }

    private async notifyNetworkChange(network: AnyNetwork): Promise<void> {
        // Inform and await the priority callback (wallet service)
        if (this.priorityNetworkChangeCallback) {
            await this.priorityNetworkChangeCallback(network);
            Logger.log("wallet", "Network change handled by the priority callback. Now telling other listeners");
        }

        // Inform other lower priority listeners
        this.activeNetwork.next(network);
    }

    public getNetworkByKey(key: string, networkTemplate: string = null): AnyNetwork {
        if (!networkTemplate)
            networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

        return this.networks.find(n => n.key === key && n.networkTemplate === networkTemplate);
    }

    public getNetworkByChainId(chainId: number): AnyNetwork {
        return this.networks.find(n => n.isEVMNetwork() && (<EVMNetwork>n).getMainChainID() == chainId);
    }

    public getActiveNetworkIndex(): number {
        return this.networks.findIndex(n => {
            console.log("getActiveNetworkIndex ", this.activeNetwork.value.key, n.key);
            return n.key === this.activeNetwork.value.key
        });
    }

    /**
     * Tells if the currently active network is the elastos network MAICHAIN.
     */
    public isActiveNetworkElastosMainchain(): boolean {
        return this.activeNetwork.value && this.activeNetwork.value.key === "elastos";
    }

    /**
     * Tells if the currently active network is the elastos mainchain, ESC or EID.
     */
    public isActiveNetworkElastos(): boolean {
        return this.activeNetwork.value && ['elastos', 'elastossmartchain', 'elastosidchain'].includes(this.activeNetwork.value.key);
    }

    /**
     * Tells if the currently active network is the EVM network.
     */
    public isActiveNetworkEVM(): boolean {
        return this.activeNetwork.value && this.activeNetwork.value.isEVMNetwork();
    }

    public async loadNetworkVisibilities(): Promise<void> {
        this.networkVisibilities = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "network-visibilities", {});
    }

    public saveNetworkVisibilities(): Promise<void> {
        return this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "network-visibilities", this.networkVisibilities);
    }

    public getNetworkVisible(network: AnyNetwork): boolean {
        // By default, if no saved info about a network visibility, we consider the network visible
        if (!(network.key in this.networkVisibilities))
            return true;

        return this.networkVisibilities[network.key];
    }

    public setNetworkVisible(network: AnyNetwork, visible: boolean): Promise<void> {
        this.networkVisibilities[network.key] = visible;
        return this.saveNetworkVisibilities();
    }

    /**
     * Maintain the list of last used networks to be able to display them first in some
     * lists of widgets like the active network chooser.
     */
    private async updateLastUsedNetworkDate(network: AnyNetwork) {
        let rawLastUsedNetworks = this.lastUsedNetworks.value.raw;

        rawLastUsedNetworks[network.key] = moment().unix();
        await this.saveLastUsedNetworks(rawLastUsedNetworks);

        this.lastUsedNetworks.next(this.newLastUsedNetworks(rawLastUsedNetworks));
    }

    private saveLastUsedNetworks(rawLastUsedNetworks: RawLastUsedNetworks) {
        return this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "last-used-networks", rawLastUsedNetworks);
    }

    private async loadLastUsedNetworks() {
        let rawLastUsedNetworks = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "last-used-networks", {});

        this.lastUsedNetworks.next(this.newLastUsedNetworks(rawLastUsedNetworks));
    }

    private newLastUsedNetworks(rawLastUsedNetworks: RawLastUsedNetworks): LastUsedNetworks {
        let sortedRawKeys = Object.keys(rawLastUsedNetworks).sort((a, b) => {
            return rawLastUsedNetworks[b] - rawLastUsedNetworks[a];
        });

        let lastUsedNetworks: LastUsedNetworks = {
            raw: rawLastUsedNetworks,
            list: []
        }
        for (let networkKey of sortedRawKeys) {
            let network = this.getNetworkByKey(networkKey);
            if (network) {
                lastUsedNetworks.list.push({
                    network,
                    timestamp: rawLastUsedNetworks[networkKey]
                });
            }
        }

        return lastUsedNetworks;
    }
}
