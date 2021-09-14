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
import { ModalController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { CustomNetwork } from '../model/networks/customnetwork';
import { Network } from '../model/networks/network';
import { LocalStorage } from './storage.service';

export type PriorityNetworkChangeCallback = (newNetwork) => Promise<void>;

export type CustomNetworkDiskEntry = {
    key: string; // Ex: "randomKey"
    name: string; // Ex: "My network"
    rpcUrl: string; // Ex: "https://my.net.work/rpc"
    chainId: string; // Ex: "12345"
    networkTemplate: string; // Ex: "MainNet"
    mainCurrencySymbol: string; // Ex: "HT"
    colorScheme: string; // "purple", "green", etc
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

    constructor(private localStorage: LocalStorage, private globalStorage: GlobalStorageService, private modalCtrl: ModalController) {
        WalletNetworkService.instance = this;
    }

    public async init() {
        await this.initializeCustomNetworks();
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
    }

    public getAvailableNetworks(): Network[] {
        return this.networks;
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

    public getNetworkByKey(key: string): Network {
        return this.networks.find(n => n.key === key);
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
        return this.activeNetwork.value.key === "elastos";
    }

    /**
     * Loads saved custom networks from disk and initialized them.
     */
    private async initializeCustomNetworks(): Promise<void> {
        // Load previously saved entries from disk
        this.customNetworkDiskEntries = await this.globalStorage.getSetting<CustomNetworkDiskEntry[]>(GlobalDIDSessionsService.signedInDIDString, "wallet", "customnetworks", []);

        // For each disk entry, re-initialize a real network
        for (let entry of this.customNetworkDiskEntries) {
            let network = new CustomNetwork(
                entry.key,
                entry.name,
                null, // No "logo"
                entry.mainCurrencySymbol,
                entry.mainCurrencySymbol,
                entry.rpcUrl,
                null, // No "account" url
                entry.networkTemplate,
                parseInt(entry.chainId)
            );

            // Add this new instance to the global list of networks
            this.networks.push(network);
        }
    }

    /**
     * Adds a new, or updates an existing custom network.
     */
    public async upsertCustomNetwork(networkDiskEntry: CustomNetworkDiskEntry): Promise<void> {
        let existingEntryIndex = this.customNetworkDiskEntries.findIndex(n => networkDiskEntry.key === n.key);
        if (existingEntryIndex === -1) {
            // Not existing yet, add it
            Logger.log("wallet", "Inserting a new custom network entry", networkDiskEntry);
            this.customNetworkDiskEntries.push(networkDiskEntry);
        }
        else {
            // Existing, update
            Logger.log("wallet", "Updating existing custom network entry", networkDiskEntry);
            this.customNetworkDiskEntries[existingEntryIndex] = networkDiskEntry;
        }

        await this.globalStorage.setSetting<CustomNetworkDiskEntry[]>(GlobalDIDSessionsService.signedInDIDString, "wallet", "customnetworks", this.customNetworkDiskEntries);

        // Notify a change in networks list
        this.networksList.next(this.networks);
    }

    public getCustomNetworkEntries(): CustomNetworkDiskEntry[] {
        return this.customNetworkDiskEntries;
    }
}


