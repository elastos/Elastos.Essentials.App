import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { WalletID, ExtendedWalletInfo } from '../model/wallets/MasterWallet';
import { Contact } from './contacts.service';


/***
 * Local storage using app manager settings ot make sure debug (CLI) and no debug app versions share the same
 * data.
 */
@Injectable()
export class LocalStorage {
    constructor(private storage: GlobalStorageService) { }

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
        return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "wallet", key, value);
    }

    public async get(key: string): Promise<any> {
        // Logger.log('wallet', 'Fetching for ' + key + ' in app manager settings');
        let val = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "wallet", key, null);
        if (val === null)
            return null; // Key not found in setting
        else {
            if (typeof(val) === "string") {
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

    public saveMappingTable(obj) {
        let key = "map-table";
        return this.add(key, obj);
    }

    /**
     * Additional wallet info that can't be saved in the SPV SDK, so we save it on the app side.
     * Ex: wallet name given by the user.
     */
    public setExtendedMasterWalletInfo(masterId: WalletID, extendedInfo: ExtendedWalletInfo): Promise<void> {
        let key = "extended-wallet-infos-"+masterId;
        return this.set(key, JSON.stringify(extendedInfo));
    }

    public async getExtendedMasterWalletInfos(masterId: WalletID): Promise<ExtendedWalletInfo> {
        let key = "extended-wallet-infos-"+masterId;
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
        return this.set("currency", JSON.stringify(value)).then(() => {
          Logger.log('wallet', 'Currency stored');
        });
    }

    public async getCurrency(): Promise<string> {
        let rawCurrency = await this.get("currency");
        // Logger.log('wallet', 'Found currency stored', rawCurrency);
        return rawCurrency;
    }

    public setCurrencyDisplayPreference(useCurrency: boolean) {
        return this.set('useCurrency', JSON.stringify(useCurrency)).then(() => {
            Logger.log('wallet', 'Currency display preference stored');
        });
    }

    public async getCurrencyDisplayPreference(): Promise<boolean> {
        let pref = await this.get("useCurrency");
        Logger.log('wallet', 'User prefers using currency?', pref);
        return pref;
    }

    public setPrice(symbol: string, price: number) {
        return this.set(symbol, JSON.stringify(price)).then(() => {
          // Logger.log('wallet', 'Ela price stored');
        });
    }

    public async getPrice(symbol: string): Promise<number> {
        let rawPrice = await this.get(symbol);
        // Logger.log('wallet', 'Found Ela price stored', rawPrice);
        return rawPrice;
    }

    public setVisit(visited: boolean) {
        return this.set('visited', JSON.stringify(visited)).then(() => {
            Logger.log('wallet', 'Visit stored');
        });
    }

    public async getVisit(): Promise<boolean> {
        let visited = await this.get("visited");
        // Logger.log('wallet', 'User already visited?', visited);
        return visited;
    }

    public setContacts(contacts: Contact[]) {
        return this.set('contacts', JSON.stringify(contacts)).then(() => {
            Logger.log('wallet', 'Contacts stored');
        });
    }

    public async getContacts(): Promise<Contact[]> {
        let contacts = await this.get("contacts");
        // Logger.log('wallet', 'Found contacts', contacts);
        return contacts;
    }
}


