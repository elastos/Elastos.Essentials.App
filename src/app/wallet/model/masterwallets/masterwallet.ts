import { Logger } from 'src/app/logger';
import { WalletNetworkService } from '../../services/network.service';
import { SafeService, StandardWalletSafe } from '../../services/safe.service';
import { LocalStorage } from '../../services/storage.service';
import { AESDecrypt } from '../crypto';
import { AnyNetwork } from '../networks/network';
import { SerializedMasterWallet, SerializedStandardMasterWallet, Theme, WalletCreator, WalletNetworkOptions, WalletType } from './wallet.types';

export const defaultWalletName = (): string => {
    return 'Anonymous wallet';
}

export const defaultWalletTheme = (): Theme => {
    return {
        color: '#752fcf',
        background: '/assets/wallet/cards/maincards/card-purple.svg'
    };
}

/**
 * DELETE ME AFTER MIGRATION
 */
/* export type Theme = {
    background: string,
    color: string
}; */

/**
 * DELETE ME AFTER MIGRATION
 */
//export class ExtendedMasterWalletInfo {
/** User defined wallet name */
//name: string;
/* Wallet theme */
//theme: Theme;
/* Created by system when create a new identity */
//createdBySystem: boolean;
/* Created by mnemonic or private key */
//createType: WalletCreateType;
//}

export abstract class MasterWallet {
    public type: WalletType = null;
    public id: string = null;
    public name: string = null;
    public theme: Theme = null;
    public networkOptions: WalletNetworkOptions[];
    public creator: WalletCreator;

    // TODO GETTER ONLY seed?: string;
    // TODO GETTER ONLY  mnemonic?: string;
    // TODO GETTER ONLY privateKey?: string;
    // TODO GETTER ONLY privateKeyType: any;

    /* public account: WalletAccount = {
        Type: WalletAccountType.STANDARD,
        SingleAddress: false
    }; */

    constructor() {
        // Default values - could be overwritten by deserialization
        this.name = defaultWalletName();
        this.theme = defaultWalletTheme();
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

    /* public async prepareAfterCreation(): Promise<void> {
        const extendedInfo = await LocalStorage.instance.getExtendedMasterWalletInfo(this.id);
        await this.populateWithExtendedInfo(extendedInfo);
    } */

    public abstract serialize(): SerializedMasterWallet;

    /**
     * Save master wallet info to permanent storage
     */
    public async save() {
        const serializableInfo = this.serialize();
        Logger.log('wallet', "Saving master wallet to disk", this, serializableInfo);

        await LocalStorage.instance.saveMasterWallet(this.id, serializableInfo);
    }

    /**
     * Populates the on going serialization object with master wallet info.
     */
    protected _serialize(serialized: SerializedMasterWallet) {
        serialized.type = this.type;
        serialized.id = this.id;
        serialized.name = this.name;
        serialized.theme = this.theme;
        serialized.networkOptions = this.networkOptions;
        serialized.creator = this.creator;
    }

    /**
     * Populates the master wallet with serialized info.
     */
    protected deserialize(serialized: SerializedMasterWallet) {
        this.type = serialized.type;
        this.id = serialized.id;
        this.name = serialized.name;
        this.theme = serialized.theme;
        this.networkOptions = serialized.networkOptions;
        this.creator = serialized.creator;
    }

    /**
     * Tells if the wallet has mnemonic support, ie can export mnemonic, can be derived, etc.
     */
    public abstract hasMnemonicSupport(): boolean;

    /**
     * Tells if this master wallet is supported on the given network.
     * eg: a wallet imported by EVM private key can't run on the bitcoin network.
     */
    public abstract supportsNetwork(network: AnyNetwork): boolean;

    /**
     * Returns the configured wallet options for this network. Those options have been proposed and chosen
     * to users during wallet creation.
     *
     * NOTE:
     * - In case no network options are found (eg: network added after wallet creation), default options are returned
     * - In any case, default options are merged with persistent options in order to make sure we also get new options fields (forward compatibility)
     */
    public getNetworkOptions(networkKey: string): WalletNetworkOptions {
        let defaultNetworkOptions = WalletNetworkService.instance.getNetworkByKey(networkKey).getDefaultWalletNetworkOptions();

        let networkOptions = this.networkOptions.find(no => no.network === networkKey);

        return Object.assign({}, defaultNetworkOptions, networkOptions);
    }

    /**
     * @deprecated - only used by the migration
     */
    /* public getExtendedWalletInfo(): ExtendedMasterWalletInfo {
        let extendedInfo = new ExtendedMasterWalletInfo();

        extendedInfo.name = this.name;
        extendedInfo.theme = this.theme;
        extendedInfo.createdBySystem = this.createdBySystem;
        extendedInfo.createType = this.createType;

        return extendedInfo;
    } */

    /**
     * Appends extended info from the local storage to this wallet model.
     * This includes everything the SPV plugin could not save and that we saved in our local
     * storage instead.
     */
    /* public async populateWithExtendedInfo(extendedInfo: ExtendedMasterWalletInfo): Promise<void> {
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
    } */

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

export class StandardMasterWallet extends MasterWallet {
    public hasPassphrase?: boolean;

    public static newFromSerializedWallet(serialized: SerializedStandardMasterWallet): StandardMasterWallet {
        let masterWallet = new StandardMasterWallet();

        // Base type deserialization
        masterWallet.deserialize(serialized);

        return masterWallet;
    }

    protected deserialize(serialized: SerializedStandardMasterWallet) {
        super.deserialize(serialized);

        this.hasPassphrase = serialized.hasPassphrase;

        // Save sensitive information to the safe
        let safe = this.getSafe();
        safe.seed = serialized.seed;
        safe.mnemonic = serialized.mnemonic;
        safe.privateKey = serialized.privateKey;
        safe.privateKeyType = serialized.privateKeyType;
    }

    public serialize(): SerializedStandardMasterWallet {
        let serialized: SerializedStandardMasterWallet = {} as SerializedStandardMasterWallet; // Force empty

        super._serialize(serialized as SerializedStandardMasterWallet);

        serialized.hasPassphrase = this.hasPassphrase;

        let safe = this.getSafe();
        serialized.mnemonic = safe.mnemonic;
        serialized.seed = safe.seed;
        serialized.privateKey = safe.privateKey;
        serialized.privateKeyType = safe.privateKeyType;

        return serialized;
    }

    public hasMnemonicSupport(): boolean {
        return !!this.getSafe().mnemonic; // A mnemonic must be defined
    }

    public supportsNetwork(network: AnyNetwork): boolean {
        if (this.hasMnemonicSupport())
            return true; // If we have a mnemonic, we can run everywhere.

        return network.supportedPrivateKeyTypes().indexOf(this.getSafe().privateKeyType) >= 0;
    }

    /**
     * Returns the encrypted seed by default, or the decrypted one if the
     * wallet pay password is provided.
     */
    public getSeed(decryptedWithPayPassword?: string): string {
        if (!this.getSafe().seed)
            return null;

        if (!decryptedWithPayPassword)
            return this.getSafe().seed;
        else
            return AESDecrypt(this.getSafe().seed, decryptedWithPayPassword);
    }

    /**
     * Returns the encrypted mnemonic by default, or the decrypted one if the
     * wallet pay password is provided.
     */
    public getMnemonic(decryptedWithPayPassword?: string): string {
        if (!this.getSafe().mnemonic)
            return null;

        if (!decryptedWithPayPassword)
            return this.getSafe().mnemonic;
        else
            return AESDecrypt(this.getSafe().mnemonic, decryptedWithPayPassword);
    }

    /**
     * Returns the encrypted private key by default, or the decrypted one if the
     * wallet pay password is provided.
     */
    public getPrivateKey(decryptedWithPayPassword?: string): string {
        if (!this.getSafe().privateKey)
            return null;

        if (!decryptedWithPayPassword)
            return this.getSafe().privateKey;
        else
            return AESDecrypt(this.getSafe().privateKey, decryptedWithPayPassword);
    }

    private getSafe(): StandardWalletSafe {
        return SafeService.instance.getStandardWalletSafe(this.id);
    }
}
