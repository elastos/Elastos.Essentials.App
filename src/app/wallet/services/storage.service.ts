import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import type { SerializedMasterWallet } from '../model/masterwallets/wallet.types';
import type { ExtendedNetworkWalletInfo } from '../model/networks/base/networkwallets/networkwallet';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';
import type { Contact } from './contacts.service';

/***
 * Local storage using app manager settings ot make sure debug (CLI) and no debug app versions share the same
 * data.
 */
@Injectable({
    providedIn: 'root'
})
export class LocalStorage {
    public static instance: LocalStorage = null;

    constructor(private storage: GlobalStorageService) {
        LocalStorage.instance = this;
    }

    public add(key: string, value: any): any {
        return this.get(key).then((val) => {
            let id = value['id'];
            if (val === null) {
                let initObj = {};
                initObj[id] = value;
                return this.set(key, JSON.stringify(initObj));
            }
            let addObj = JSON.parse(val);
            addObj[id] = value;
            return this.set(key, JSON.stringify(addObj));
        });
    }

    public set(key: string, value: any): Promise<void> {
        return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", key, value);
    }

    public async get(key: string): Promise<any> {
        // Logger.log('wallet', 'Fetching for ' + key + ' in app manager settings');
        let val = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", key, null);
        if (val === null)
            return null; // Key not found in setting
        else {
            if (typeof (val) === "string") {
                try {
                    val = JSON.parse(val);
                }
                catch (e) {
                    // Do nothing. Saved value is probably a real string
                }
            }
            return val;
        }
    }

    public async getVal(key, func) {
        func(await this.get(key));
    }

    public saveCurMasterId(network: string, value) {
        let key = network + "cur-masterId";
        return this.set(key, JSON.stringify(value));
    }

    public async getCurMasterId(network: string): Promise<any> {
        return await this.get(network + "cur-masterId");
    }

    /* public saveMappingTable(obj) {
        let key = "map-table";
        return this.add(key, obj);
    } */

    /**
     * Additional wallet info that can't be saved in the SPV SDK, so we save it on the app side.
     * Ex: wallet name given by the user.
     */
    /* public setExtendedMasterWalletInfo(masterId: WalletID, extendedInfo: ExtendedMasterWalletInfo): Promise<void> {
        let key = "extended-wallet-infos-" + masterId;
        return this.set(key, JSON.stringify(extendedInfo));
    }

    public async getExtendedMasterWalletInfo(masterId: WalletID): Promise<ExtendedMasterWalletInfo> {
        let key = "extended-wallet-infos-" + masterId;
        return await this.get(key);
    }*/

    /**
     * Saves the list of wallets. This list is used to reload all the wallets later on.
     */
    public saveWalletsList(networkTemplate: string, masterWalletIDs: string[]): Promise<void> {
        let key = "wallets-list-" + networkTemplate;
        console.log("saveWalletsList", key, masterWalletIDs);

        return this.set(key, JSON.stringify(masterWalletIDs));
    }

    /**
     * Returns the list of JS wallet IDs for a given network template (mainnets, testnets, etc)
     */
    public async getWalletsList(networkTemplate: string): Promise<string[]> {
        let key = "wallets-list-" + networkTemplate;
        let rawWallets = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", key, null);
        if (!rawWallets)
            return [];
        else {
            return JSON.parse(rawWallets);
        }
    }

    public saveMasterWallet(masterWalletId: string, masterWalletInfo: SerializedMasterWallet): Promise<void> {
        let key = "master-wallet-info-" + masterWalletId;
        return this.set(key, JSON.stringify(masterWalletInfo));
    }

    public async loadMasterWallet(masterWalletId: string): Promise<SerializedMasterWallet> {
        let key = "master-wallet-info-" + masterWalletId;
        return await this.get(key);
    }

    public deleteMasterWallet(masterWalletId: string): Promise<void> {
        let key = "master-wallet-info-" + masterWalletId;
        return this.storage.deleteSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", key);
    }

    /**
     * Additional network wallet info, i.e. the list of visible ERC coins.
     */
    public setExtendedNetworkWalletInfo(masterId: string, networkTemplate: string, networkName: string, extendedInfo: ExtendedNetworkWalletInfo): Promise<void> {
        let key = "extended-network-wallet-info-" + masterId + "-" + networkName;
        return this.set(key, JSON.stringify(extendedInfo));
    }

    public async getExtendedNetworWalletInfo(masterId: string, networkTemplate: string, networkName: string): Promise<ExtendedNetworkWalletInfo> {
        let key = "extended-network-wallet-info-" + masterId + "-" + networkName;
        return await this.get(key);
    }

    public async savePublishTxList(obj): Promise<void> {
        let key = "publishTx";
        await this.set(key, JSON.stringify(obj));
    }

    public async getPublishTxList(): Promise<any> {
        return await this.get("publishTx");
    }

    public setCurrency(value: string) {
        return this.set("currency", JSON.stringify(value));
    }

    public async getCurrency(): Promise<string> {
        let rawCurrency = await this.get("currency");
        // Logger.log('wallet', 'Found currency stored', rawCurrency);
        return rawCurrency;
    }

    public setCurrencyDisplayPreference(useCurrency: boolean) {
        return this.set('useCurrency', JSON.stringify(useCurrency));
    }

    public async getCurrencyDisplayPreference(): Promise<boolean> {
        let pref = await this.get("useCurrency");
        Logger.log('wallet', 'User prefers using currency?', pref);
        return pref;
    }

    public setPrice(symbol: string, price: string) {
        return this.set(symbol, price).then(() => {
            // Logger.log('wallet', 'Ela price stored');
        });
    }

    public async getPrice(symbol: string): Promise<number> {
        let rawPrice = await this.get(symbol);
        // Logger.log('wallet', 'Found Ela price stored', rawPrice);
        return rawPrice;
    }

    public setVisit(visited: boolean) {
        return this.set('visited', JSON.stringify(visited));
    }

    public async getVisit(): Promise<boolean> {
        let visited = await this.get("visited");
        // Logger.log('wallet', 'User already visited?', visited);
        return visited;
    }

    public setContacts(contacts: Contact[]) {
        return this.set('contacts', JSON.stringify(contacts));
    }

    public async getContacts(): Promise<Contact[]> {
        let contacts = await this.get("contacts");
        // Logger.log('wallet', 'Found contacts', contacts);
        return contacts;
    }
}


