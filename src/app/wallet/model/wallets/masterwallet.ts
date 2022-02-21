import { Logger } from 'src/app/logger';
import { LocalStorage } from '../../services/storage.service';
import { WalletService } from '../../services/wallet.service';
import { MasterWalletInfo, WalletCreator, WalletNetworkOptions } from '../wallet.types';
import { WalletAccount, WalletAccountType, WalletCreateType } from '../walletaccount';

export type WalletID = string;

/**
 * @deprecated DELETE ME AFTER MIGRATION
 */
export type Theme = {
    background: string,
    color: string
};

/**
 * @deprecated DELETE ME AFTER MIGRATION
 */
export class ExtendedMasterWalletInfo {
    /** User defined wallet name */
    name: string;
    /* Wallet theme */
    theme: Theme;
    /* Created by system when create a new identity */
    createdBySystem: boolean;
    /* Created by mnemonic or private key */
    createType: WalletCreateType;
}

export class MasterWallet implements MasterWalletInfo {
    public id: string = null;
    public name: string = null;
    public theme: Theme = null;
    public createdBySystem = false; // DELETE ME
    public createType: WalletCreateType = WalletCreateType.MNEMONIC; // DELETE ME
    seed?: string;
    mnemonic?: string;
    public hasPassphrase?: boolean;
    privateKey?: string;
    privateKeyType: any;
    public networkOptions: WalletNetworkOptions[];
    public creator: WalletCreator;

    public account: WalletAccount = {
        Type: WalletAccountType.STANDARD,
        SingleAddress: false
    };

    constructor(walletInfo: MasterWalletInfo) {
        Object.assign(this, walletInfo);
    }

    /* constructor(
        id: string,
        createdBySystem: boolean,
        createType: WalletCreateType,
        name?: string,
        theme?: Theme,
    ) {
        this.id = id;
        this.createdBySystem = createdBySystem;
        this.createType = createType;
        this.name = name || 'Anonymous Wallet';
        this.theme = theme || {
            color: '#752fcf',
            background: '/assets/wallet/cards/maincards/card-purple.svg'
        };
    } */

    /* public static async extendedInfoExistsForMasterId(masterId: string): Promise<boolean> {
        const extendedInfo = await LocalStorage.instance.getExtendedMasterWalletInfo(masterId);
        return !!extendedInfo; // not null or undefined
    } */

    public async prepareAfterCreation(): Promise<void> {
        const extendedInfo = await LocalStorage.instance.getExtendedMasterWalletInfo(this.id);
        await this.populateWithExtendedInfo(extendedInfo);
    }

    /**
     * Save master wallet info to permanent storage
     */
    public async save() {
        const extendedInfo = this.getExtendedWalletInfo();
        Logger.log('wallet', "Saving master wallet extended info", this, extendedInfo);

        await LocalStorage.instance.setExtendedMasterWalletInfo(this.id, extendedInfo);
    }

    /**
     * @deprecated - only used by the migration
     */
    public getExtendedWalletInfo(): ExtendedMasterWalletInfo {
        let extendedInfo = new ExtendedMasterWalletInfo();

        extendedInfo.name = this.name;
        extendedInfo.theme = this.theme;
        extendedInfo.createdBySystem = this.createdBySystem;
        extendedInfo.createType = this.createType;

        return extendedInfo;
    }

    /**
     * Appends extended info from the local storage to this wallet model.
     * This includes everything the SPV plugin could not save and that we saved in our local
     * storage instead.
     */
    public async populateWithExtendedInfo(extendedInfo: ExtendedMasterWalletInfo): Promise<void> {
        Logger.log("wallet", "Populating master wallet with extended info", this.id, extendedInfo);

        // Retrieve wallet account type
        this.account = await WalletService.instance.spvBridge.getMasterWalletBasicInfo(this.id);

        if (extendedInfo) {
            this.name = extendedInfo.name;
            this.theme = extendedInfo.theme;
            this.createdBySystem = extendedInfo.createdBySystem;
            this.createType = extendedInfo.createType ? extendedInfo.createType : WalletCreateType.MNEMONIC;
        }

        Logger.log("wallet", "Populated master wallet:", this);
    }

    /**
     * Removes a subwallet (coin - ex: ela, idchain) from the given wallet.
     */
    /* public async destroyStandardSubWallet(coinId: CoinID) {
       let subWallet = this.standardSubWallets[coinId];
       if (subWallet) {
         await subWallet.destroy();

         // Delete the subwallet from out local model.
         delete this.standardSubWallets[coinId];

         await this.masterWallet.save();
       }
   } */

    /**
     * Removes all subwallets from the given wallet.
     */
    /* public async destroyAllStandardSubWallets() {
        for (let subWallet of Object.values(this.standardSubWallets)) {
            await subWallet.destroy();
            delete this.standardSubWallets[subWallet.id];
        }
    } */
}
