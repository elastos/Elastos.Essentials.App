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
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { CustomNetwork } from '../../model/networks/custom/network/custom.network';
import { EVMNetwork } from '../../model/networks/evms/evm.network';
import { Native } from '../native.service';
import { WalletNetworkService } from '../network.service';
import { PopupProvider } from '../popup.service';
import { LocalStorage } from '../storage.service';

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
export class CustomNetworkService {
    public static instance: CustomNetworkService = null;

    private customNetworkDiskEntries: CustomNetworkDiskEntry[] = [];

    constructor(
        public events: GlobalEvents,
        public native: Native,
        public popupProvider: PopupProvider,
        private localStorage: LocalStorage,
        private networkService: WalletNetworkService,
        private globalStorage: GlobalStorageService,
        private globalNavService: GlobalNavService,
        private modalCtrl: ModalController) {
        CustomNetworkService.instance = this;
    }

    public async init() {
        await this.initializeCustomNetworks();
    }

    /**
     * Loads saved custom networks from disk and initialized them.
     */
    private async initializeCustomNetworks(): Promise<void> {
        // Load previously saved entries from disk
        this.customNetworkDiskEntries = await this.globalStorage.getSetting<CustomNetworkDiskEntry[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "customnetworks", []);

        // For each disk entry, re-initialize a real network
        for (let entry of this.customNetworkDiskEntries) {
            let network = this.createNetworkFromCustomNetworkEntry(entry);

            // Add this new instance to the global list of networks
            await this.networkService.registerNetwork(network);
        }
    }

    private createNetworkFromCustomNetworkEntry(entry: CustomNetworkDiskEntry) {
        return new CustomNetwork(
            entry.key,
            entry.name,
            "assets/wallet/networks/custom.png",
            entry.mainCurrencySymbol || "ETH",
            entry.mainCurrencySymbol || "ETH",
            entry.networkTemplate,
            entry.rpcUrl,
            parseInt(entry.chainId)
        );
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

            let network = this.createNetworkFromCustomNetworkEntry(networkDiskEntry);

            // Add this new instance to the global list of networks
            await this.networkService.registerNetwork(network);
        }
        else {
            // Existing, update
            Logger.log("wallet", "Updating existing custom network entry", networkDiskEntry);
            this.customNetworkDiskEntries[existingEntryIndex] = networkDiskEntry;

            // Also hot update the existing network instance
            let networkInstance = this.networkService.getAvailableNetworks().find(n => n.key === networkDiskEntry.key) as EVMNetwork;
            networkInstance.updateInfo(
                networkDiskEntry.name,
                parseInt(networkDiskEntry.chainId),
                networkDiskEntry.rpcUrl,
                networkDiskEntry.mainCurrencySymbol || "ETH"
            )

            // If we edit the active network, then we need to recreate networkwallet.
            if (WalletNetworkService.instance.activeNetwork.value.key == networkInstance.key) {
                WalletNetworkService.instance.setActiveNetwork(networkInstance)
            }
        }

        await this.globalStorage.setSetting<CustomNetworkDiskEntry[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "customnetworks", this.customNetworkDiskEntries);
    }

    public async deleteCustomNetwork(networkDiskEntry: CustomNetworkDiskEntry): Promise<void> {
        if (this.customNetworkIsActiveNetwork(networkDiskEntry)) {
            throw new Error("Custom network can't be deleted because it's the currently active network");
        }

        let existingEntryIndex = this.customNetworkDiskEntries.findIndex(n => networkDiskEntry.key === n.key);
        if (existingEntryIndex === -1) {
            // Not found, throw error
            throw new Error("Custom network can't be deleted because it was not found");
        }

        // Delete from network instances
        this.networkService.removeNetworkByKey(networkDiskEntry.key);

        // Delete from disk entries and save
        this.customNetworkDiskEntries.splice(existingEntryIndex, 1);
        await this.globalStorage.setSetting<CustomNetworkDiskEntry[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "customnetworks", this.customNetworkDiskEntries);
    }

    /**
     * Tells if the custom network entry is the active network or not.
     * Used for example to prevent deleting the active network.
     */
    public customNetworkIsActiveNetwork(networkDiskEntry: CustomNetworkDiskEntry): boolean {
        return this.networkService.activeNetwork.value.key === networkDiskEntry.key;
    }

    public getCustomNetworkEntries(): CustomNetworkDiskEntry[] {
        return this.customNetworkDiskEntries;
    }
}


