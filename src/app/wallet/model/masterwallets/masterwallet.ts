import { defaultPath, HDNode } from 'ethers/lib/utils';
import { Logger } from 'src/app/logger';
import { AESDecrypt, AESEncrypt } from '../../../helpers/crypto/aes';
import { WalletNetworkService } from '../../services/network.service';
import { SafeService, StandardWalletSafe } from '../../services/safe.service';
import { jsToSpvWalletId, SPVService } from '../../services/spv.service';
import { LocalStorage } from '../../services/storage.service';
import { AnyNetwork } from '../networks/network';
import { PrivateKeyType, SerializedMasterWallet, SerializedStandardMasterWallet, Theme, WalletCreator, WalletNetworkOptions, WalletType } from './wallet.types';

export const defaultWalletName = (): string => {
    return 'Anonymous wallet';
}

export const defaultWalletTheme = (): Theme => {
    return {
        color: '#752fcf',
        background: '/assets/wallet/cards/maincards/card-purple.svg'
    };
}

export abstract class MasterWallet {
    public type: WalletType = null;
    public id: string = null;
    public name: string = null;
    public theme: Theme = null;
    public networkOptions: WalletNetworkOptions[];
    public creator: WalletCreator;

    constructor() {
        // Default values - could be overwritten by deserialization
        this.name = defaultWalletName();
        this.theme = defaultWalletTheme();
    }

    /**
     * Destroy internal content of the wallet. To be overriden.
     */
    public async destroy() {
        // TODO: Delete all subwallets
    }

    public equals(otherMasterWallet: MasterWallet): boolean {
        return this.id === otherMasterWallet.id;
    }

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
     * Removes a subwallet (coin - ex: ela, idchain) from the given wallet.
     */
    /* public async destroyStandardSubWallet(coinId: CoinID) {
       let subWallet = this.standardSubWallets[coinId];
       if (subWallet) {
         await subWallet.destroy();

         // Delete the subwallet from our local model.
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

    public async destroy() {
        // Destroy the wallet in the wallet plugin - A bit dirty, should be in sub-classes that use SPV,
        // for for convenience for now as most wallets are "native SPV", we keep it here.
        let spvWalletId = jsToSpvWalletId(this.id);
        if (spvWalletId !== null) {
            await SPVService.instance.destroyWallet(spvWalletId);
        }
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
    public async getSeed(decryptedWithPayPassword?: string): Promise<string> {
        if (!this.getSafe().seed)
            return null;

        if (!decryptedWithPayPassword)
            return await this.getSafe().seed;
        else
            return AESDecrypt(this.getSafe().seed, decryptedWithPayPassword);
    }

    /**
     * Returns the encrypted mnemonic by default, or the decrypted one if the
     * wallet pay password is provided.
     */
    public async getMnemonic(decryptedWithPayPassword?: string): Promise<string> {
        if (!this.getSafe().mnemonic)
            return null;

        if (!decryptedWithPayPassword)
            return await this.getSafe().mnemonic;
        else
            return AESDecrypt(this.getSafe().mnemonic, decryptedWithPayPassword);
    }

    /**
     * Returns the encrypted private key by default, or the decrypted one if the
     * wallet pay password is provided.
     */
    public async getPrivateKey(decryptedWithPayPassword?: string): Promise<string> {
        if (!this.getSafe().privateKey) {
            // The privateKey is undefine if the wallet is created by mnemonic.
            let seed = await this.getSeed(decryptedWithPayPassword);
            let privateKey = await this.getEVMPrivateKeyFromSeed(seed);
            if (!privateKey) return null;

            this.getSafe().privateKey = await AESEncrypt(privateKey, decryptedWithPayPassword);
            this.getSafe().privateKeyType = PrivateKeyType.EVM;

            // Save privateKey
            await this.save();
            return privateKey;
        }

        if (!decryptedWithPayPassword)
            return await this.getSafe().privateKey;
        else
            return AESDecrypt(this.getSafe().privateKey, decryptedWithPayPassword);
    }

    private getSafe(): StandardWalletSafe {
        return SafeService.instance.getStandardWalletSafe(this.id);
    }

    private async getEVMPrivateKeyFromSeed(seed: string) {
        const Wallet = (await import("ethers")).Wallet;
        const seedByte = Buffer.from(seed, 'hex');
        let hdWalelt = new Wallet(HDNode.fromSeed(seedByte).derivePath(defaultPath));
        return hdWalelt.privateKey;
    }
}
