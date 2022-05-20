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
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { Network } from '../model/networks/network';
import { WalletCreateType } from '../model/walletaccount';
import { Native } from './native.service';
import { PopupProvider } from './popup.service';
import { LocalStorage } from './storage.service';

export type PriorityNetworkChangeCallback = (newNetwork) => Promise<void>;

export type CustomNetworkDiskEntry = {
    key: string; // Ex: "randomKey"
    name: string; // Ex: "My network"
    rpcUrl: string; // Ex: "https://my.net.work/rpc"
    accountRpcUrl: string; // Standard account/scan url to query transactions list, tokens...
    chainId: string; // Ex: "12345"
    networkTemplate: string; // Ex: "MainNet"
    mainCurrencySymbol: string; // Ex: "HT"
    colorScheme: string; // Ex: #9A67EB
}

@Injectable({
    providedIn: 'root'
})
export class WalletNetworkService {
    public static instance: WalletNetworkService = null;

    private networks: Network[] = [];
    private customNetworkDiskEntries: CustomNetworkDiskEntry[] = [];

    public activeNetwork = new BehaviorSubject<Network>(null);

    /** Notifies whenever the networks list changes (custom networks added/removed) */
    public networksList = new BehaviorSubject<Network[]>([]);

    private priorityNetworkChangeCallback?: PriorityNetworkChangeCallback = null;

    constructor(
        public events: Events,
        public native: Native,
        public popupProvider: PopupProvider,
        private globalNetworksService: GlobalNetworksService,
        private localStorage: LocalStorage) {
        WalletNetworkService.instance = this;
    }

    public init() {
        this.networks = [];
    }

    public stop() {
        this.networks = [];
    }

    /**
     * Appends a usable network to the list. We let networks register themselves, we don't
     * use networks in this service, to avoid circular dependencies.
     */
    public async registerNetwork(network: Network, useAsDefault = false): Promise<void> {
        this.networks.push(network);

        let savedNetworkKey = await this.localStorage.get('activenetwork') as string;
        const savedNetwork = await this.getNetworkByKey(savedNetworkKey);
        if (!savedNetwork && useAsDefault) {
            Logger.log("wallet", "WalletNetworkService - Using default network:", network);
            await this.notifyNetworkChange(network); // Normally, elastos
        }
        else if (savedNetworkKey && savedNetworkKey === network.key) {
            Logger.log("wallet", "WalletNetworkService - Reloading network:", savedNetwork);
            await this.notifyNetworkChange(savedNetwork);
        }

        // Order networks list alphabetically
        this.networks.sort((a, b) => {
            return a.name > b.name ? 1 : -1;
        })
    }

    /**
     * Used to remove a custom network from the network instances, when deleting it.
     */
    public removeNetworkByKey(networkKey: string) {
        this.networks.splice(this.networks.findIndex(n => n.key === networkKey), 1);
        this.networksList.next(this.networks);
    }

    /**
     * Returns the list of available networks, previously registered.
     * Those networks are the ones of the ones of the given network template (mainnet, testnet...) only
     * (or if none given, for the active template).
     *
     * If walletCreateType is passed, networks are filtered to return only network supported for this
     * kind of wallet. Eg: We do not support BTC network when the wallet is imported by private key.
     */
    public getAvailableNetworks(walletCreateType: WalletCreateType = null, networkTemplate: string = null): Network[] {
        if (!networkTemplate)
            networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

        // Keep only networks for the target network template.
        let networks = this.networks.filter(n => n.networkTemplate === networkTemplate);

        if (walletCreateType) {
            return networks.filter((n) => { return n.supportedWalletCreateTypes().indexOf(walletCreateType) !== -1 });
        } else {
            return networks;
        }
    }

    /**
     * Returns chain ids of networks that belong to the given network template (if passed), or by default,
     * to the active network tempplate.
     */
    public getAvailableEVMChainIDs(networkTemplate: string = null): number[] {
        let availableNetworks = this.getAvailableNetworks(null, networkTemplate);
        let displayableEVMChainIds = availableNetworks
            .map(n => n.getMainChainID())
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

    public async setActiveNetwork(network: Network) {
        Logger.log("wallet", "Setting active network to", network);

        // Save choice to local storage
        await this.localStorage.set('activenetwork', network.key);

        await this.notifyNetworkChange(network);
    }

    private async notifyNetworkChange(network: Network): Promise<void> {
        // Inform and await the priority callback (wallet service)
        if (this.priorityNetworkChangeCallback) {
            await this.priorityNetworkChangeCallback(network);
            Logger.log("wallet", "Network change handled by the priority callback. Now telling other listeners");
        }

        // Inform other lower priority listeners
        this.activeNetwork.next(network);
    }

    public getNetworkByKey(key: string, networkTemplate: string = null): Network {
        if (!networkTemplate)
            networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

        return this.networks.find(n => n.key === key && n.networkTemplate === networkTemplate);
    }

    public getNetworkByChainId(chainId: number): Network {
        return this.networks.find(n => n.getMainChainID() == chainId);
    }

    public getActiveNetworkIndex(): number {
        return this.networks.findIndex(n => {
            console.log("getActiveNetworkIndex ", this.activeNetwork.value.key, n.key);
            return n.key === this.activeNetwork.value.key
        });
    }

    /**
     * Tells if the currently active network is the elastos network.
     */
    public isActiveNetworkElastos(): boolean {
        return this.activeNetwork.value && this.activeNetwork.value.key === "elastos";
    }

    /**
     * Tells if the currently active network is the EVM network.
     */
    public isActiveNetworkEVM(): boolean {
        if (this.activeNetwork.value) {
            let network = this.getNetworkByKey(this.activeNetwork.value.key);
            if (network && network.getMainChainID() !== -1)
                return true;
        }
        return false;
    }
}
