import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { Config } from '../config/Config';
import type { StandardCoinName } from '../model/coin';
import { PubKeyInfo } from '../model/elastos.types';
import type { WalletAccountType } from '../model/walletaccount';
import { Native } from './native.service';
import { PopupProvider } from './popup.service';

declare let walletManager: WalletPlugin.WalletManager;

export type ELAAmountString = string; // string representation of an ELA amount (encoded like this in the wallet plugin)
export type TransactionID = string;
export type SignedTransaction = string;

export type MasterWalletBasicInfo = {
    HasPassPhrase: boolean,
    M: number,
    N: number,
    Readonly: boolean,
    SingleAddress: boolean,
    Type: WalletAccountType,
};

export type AllAddresses = {
    Addresses: string[];
    MaxCount: number;
};

type JSSPVMasterWalletIDPair = {
    jsWalletId: string;
    spvWalletId: string;
}

/**
 * Service that communicates with the SPVSDK and maintains a link between the "JS side" wallets
 * and their counterpart in the Elastos SPV SDK.
 *
 * NOTE: This is a legacy from when only the elastos network was used, and when the SPVSDK managed all operations.
 * A migration is currently on going and more and more features are being moved to JS instead of relying on the
 * SPVSDK, for better reactivity. Though during some time, we still rely on SPVSDK features for some time.
 *
 * NOTE: For most APIs below, "masterWalletId" referes to the SPV wallet ID, not the JS one.
 */
export class SPVService {
    public static instance: SPVService = null;

    private masterWalletIdMapping: JSSPVMasterWalletIDPair[] = [];

    constructor(private native: Native, private event: GlobalEvents, private popupProvider: PopupProvider) {
        SPVService.instance = this;
    }

    // Called every time a new user signs in, by the wallet service
    public async init(rootPath: string): Promise<void> {
        await this.loadMasterWalletIDMapping();

        return new Promise((resolve, reject) => {
            walletManager.init([rootPath],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("init", err, reject); });
        });
    }

    private async loadMasterWalletIDMapping(): Promise<void> {
        this.masterWalletIdMapping = await GlobalStorageService.instance.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "jsspvwalletidmapping", []);
    }

    /**
     * Maps a JS wallet (.2 format) to the related master wallet ID the SPVSDK
     */
    public async setMasterWalletIDMapping(jsWalletId: string, spvWalletId: string): Promise<void> {
        // Remove the current entry if existing
        this.masterWalletIdMapping = this.masterWalletIdMapping.filter(mapping => mapping.jsWalletId !== jsWalletId);

        // Add the new entry
        this.masterWalletIdMapping.push({
            jsWalletId, spvWalletId
        });

        await this.saveMasterWalletIDMapping();
    }

    private async saveMasterWalletIDMapping(): Promise<void> {
        await GlobalStorageService.instance.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "wallet", "jsspvwalletidmapping", this.masterWalletIdMapping);
    }

    public async removeMasterWalletIDMapping(spvWalletId: string) {
        // Remove the entry
        this.masterWalletIdMapping = this.masterWalletIdMapping.filter(mapping => mapping.spvWalletId !== spvWalletId);

        await this.saveMasterWalletIDMapping();
    }

    /**
     * Returns a SPV master wallet ID previously bound to a JS wallet ID.
     *
     * @param jsWalletId ".2" wallet id format
     */
    public getSPVMasterID(jsWalletId: string): string {
        let mapping = this.masterWalletIdMapping.find(mapping => mapping.jsWalletId === jsWalletId);
        if (!mapping)
            return null;

        return mapping.spvWalletId;
    }

    /**
     * Opposite of getSPVMasterID().
     */
    public getJSMasterID(spvWalletId: string): string {
        let mapping = this.masterWalletIdMapping.find(mapping => mapping.spvWalletId === spvWalletId);
        if (!mapping)
            return null;

        return mapping.jsWalletId;
    }

    /**
     * DEBUG ONLY - CLEARS ALL LINKS BETWEEN JS AND SPV WALLETS
     */
    public async debugResetMasterWalletIDMapping(): Promise<void> {
        this.masterWalletIdMapping = [];
        await this.saveMasterWalletIDMapping();
    }

    public setNetwork(netType: string, config: string): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.setNetwork([netType, config],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("setNetwork", err, reject); });
        });
    }

    public setLogLevel(loglevel: string): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.setLogLevel([loglevel],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("setLogLevel", err, reject); });
        });
    }

    public destroy(): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.destroy([],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("destroy", err, reject); });
        });
    }

    public generateMnemonic(language: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.generateMnemonic([language],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateMnemonic", err, reject); });
        });
    }

    createMasterWallet(
        masterWalletId: string,
        mnemonic: string,
        phrasePassword: string,
        payPassword: string,
        singleAddress: boolean
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.createMasterWallet(
                [masterWalletId, mnemonic, phrasePassword, payPassword, singleAddress],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createMasterWallet", err, reject); });
        });
    }

    /**
     * Create walelt by EVM private key format
     */
    createMasterWalletWithPrivKey(
        masterWalletId: string,
        singlePrivateKey: string,
        payPassword: string,
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.createMasterWalletWithPrivKey(
                [masterWalletId, singlePrivateKey, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createMasterWalletWithPrivKey", err, reject); });
        });
    }

    createMultiSignMasterWallet(
        masterWalletId: string,
        publicKeys: string,
        m: number
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.createMultiSignMasterWallet(
                [masterWalletId, publicKeys, m, Util.getTimestamp()],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createMultiSignMasterWallet", err, reject); });
        });
    }

    createMultiSignMasterWalletWithPrivKey(
        masterWalletId: string,
        privKey: string,
        payPassword: string,
        publicKeys: string,
        m: number
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.createMultiSignMasterWalletWithPrivKey(
                [masterWalletId, privKey, payPassword, publicKeys, m, Util.getTimestamp()],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createMultiSignMasterWalletWithPrivKey", err, reject); });
        });
    }

    createMultiSignMasterWalletWithMnemonic(
        masterWalletId: string,
        mnemonic: string,
        phrasePassword: string,
        payPassword: string,
        coSignersJson: string,
        requiredSignCount: string
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.createMultiSignMasterWalletWithMnemonic(
                [masterWalletId, mnemonic, phrasePassword, payPassword, coSignersJson, requiredSignCount],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createMultiSignMasterWalletWithMnemonic", err, reject); });
        });
    }

    importWalletWithKeystore(
        masterWalletId: string,
        keystoreContent: string,
        backupPassword: string,
        payPassword: string
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.importWalletWithKeystore(
                [masterWalletId, keystoreContent, backupPassword, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("importWalletWithKeystore", err, reject); });
        });
    }

    importWalletWithMnemonic(
        masterWalletId: string,
        mnemonic: string,
        phrasePassword: string,
        payPassword,
        singleAddress: boolean
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.importWalletWithMnemonic(
                [masterWalletId, mnemonic.normalize("NFKD"), phrasePassword, payPassword, singleAddress],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("importWalletWithMnemonic", err, reject); });
        });
    }

    importWalletWithSeed(
        masterWalletId: string,
        seed: string,
        payPassword,
        singleAddress: boolean,
        mnemonic: string,
        phrasePassword: string,
    ): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.importWalletWithSeed(
                [masterWalletId, seed, payPassword, singleAddress, mnemonic.normalize("NFKD"), phrasePassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("importWalletWithSeed", err, reject); });
        });
    }

    getAllMasterWallets(): Promise<string[]> {
        Logger.warn("spv", "Call to getAllMasterWallets");
        return new Promise((resolve, reject) => {
            Logger.log("wallet", "Getting all master wallets");

            walletManager.getAllMasterWallets([],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAllMasterWallets", err, reject); });
        });
    }

    destroyWallet(masterWalletId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.destroyWallet([masterWalletId],
                async (ret) => {
                    await SPVService.instance.removeMasterWalletIDMapping(masterWalletId);
                    resolve(ret);
                },
                (err) => { void this.handleError("destroyWallet", err, reject); });
        });
    }

    getVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getVersion([],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getVersion", err, reject); });
        });
    }

    getMasterWalletBasicInfo(masterWalletId: string): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject) => {
            walletManager.getMasterWalletBasicInfo([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getMasterWalletBasicInfo", err, reject); });
        });
    }

    getAllSubWallets(masterWalletId: string): Promise<StandardCoinName[]> {
        Logger.warn("spv", "Call to getAllSubWallets");
        return new Promise((resolve, reject) => {
            walletManager.getAllSubWallets([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAllSubWallets", err, reject); });
        });
    }

    createSubWallet(masterWalletId: string, subWalletId: string): Promise<any> {
        Logger.warn("spv", "Call to createSubWallet", masterWalletId, subWalletId);
        return new Promise((resolve, reject) => {
            walletManager.createSubWallet([masterWalletId, subWalletId],
                (ret) => {
                    // Logger.log("wallet", "Created subwallet in SPVSDK, wallet ID:", masterWalletId, "Chain code:", subWalletId);
                    resolve(ret);
                },
                (err) => { void this.handleError("createSubWallet", err, reject); });
        });
    }

    exportWalletWithKeystore(masterWalletId: string, backupPassWord: string, payPassword: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.exportWalletWithKeystore([masterWalletId, backupPassWord, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("exportWalletWithKeystore", err, reject); });
        });
    }

    exportWalletWithMnemonic(masterWalletId: string, payPassWord: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.exportWalletWithMnemonic([masterWalletId, payPassWord],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("exportWalletWithMnemonic", err, reject); });
        });
    }

    exportWalletWithSeed(masterWalletId: string, payPassWord: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.exportWalletWithSeed([masterWalletId, payPassWord],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("exportWalletWithSeed", err, reject); });
        });
    }

    // exportWalletWithPrivateKey(masterWalletId: string, payPassWord: string): Promise<any> {
    //     return new Promise((resolve, reject)=>{
    //         walletManager.exportWalletWithPrivateKey([masterWalletId, payPassWord],
    //             (ret) => { resolve(ret); },
    //             (err) => { this.handleError(err, reject);  });
    //     });
    // }

    verifyPassPhrase(masterWalletId: string, passphrase: string, payPassword: string): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.verifyPassPhrase([masterWalletId, passphrase, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("verifyPassPhrase", err, reject); });
        });
    }

    verifyPayPassword(masterWalletId: string, payPassword: string): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.verifyPayPassword([masterWalletId, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("verifyPayPassword", err, reject); });
        });
    }

    destroySubWallet(masterWalletId: string, subWalletId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.destroySubWallet([masterWalletId, subWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("destroySubWallet", err, reject); });
        });
    }

    getPubKeyInfo(masterWalletId: string): Promise<PubKeyInfo> {
        return new Promise((resolve, reject) => {
            walletManager.getPubKeyInfo([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getPubKeyInfo", err, reject); });
        });
    }

    isAddressValid(masterWalletId: string, address: string): Promise<boolean> {
        Logger.warn("spv", "Call to isAddressValid");
        return new Promise((resolve, reject) => {
            walletManager.isAddressValid([masterWalletId, address],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("isAddressValid", err, reject); });
        });
    }

    isSubWalletAddressValid(masterWalletId: string, subWalletId: string, address: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            walletManager.isSubWalletAddressValid([masterWalletId, subWalletId, address],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("isSubWalletAddressValid", err, reject); });
        });
    }

    getSupportedChains(masterWalletId: string): Promise<string[]> {
        Logger.warn("spv", "Call to getSupportedChains");
        return new Promise((resolve, reject) => {
            walletManager.getSupportedChains([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getSupportedChains", err, reject); });
        });
    }

    changePassword(masterWalletId: string, oldPassword: string, newPassword: string): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.changePassword([masterWalletId, oldPassword, newPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("changePassword", err, reject); });
        });
    }

    createAddress(masterWalletId: string, subWalletId: string): Promise<string> {
        Logger.warn("spv", "Call to createAddress");
        return new Promise((resolve, reject) => {
            walletManager.getAddresses([masterWalletId, subWalletId, 0, 1, false],
                (ret) => { resolve(ret[0]); },
                (err) => { void this.handleError("createAddress", err, reject); });
        });
    }

    getAddresses(masterWalletId: string, subWalletId: string, start: number, count: number, internal: boolean): Promise<string[]> {
        return new Promise((resolve, reject) => {
            walletManager.getAddresses([masterWalletId, subWalletId, start, count, internal],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAddresses", err, reject); });
        });
    }

    getPublicKeys(masterWalletId: string, subWalletId: string, start: number, count: number, internal: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.getPublicKeys([masterWalletId, subWalletId, start, count, internal],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getPublicKeys", err, reject); });
        });
    }

    signTransaction(
        masterWalletId: string,
        subWalletId: string,
        rawTransaction: string,
        payPassword: string
    ): Promise<SignedTransaction> {
        Logger.warn("spv", "Call to signTransaction");
        return new Promise((resolve, reject) => {
            walletManager.signTransaction(
                [
                    masterWalletId,
                    subWalletId,
                    rawTransaction,
                    payPassword
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("signTransaction", err, reject); });
        });
    }

    signDigest(masterWalletId: string, subWalletId: string, address: string, digest: string, payPassword: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.signDigest([masterWalletId, subWalletId, address, digest, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("signDigest", err, reject); });
        });
    }

    verifyDigest(masterWalletId: string, subWalletId: string, publicKey: string, digest: string, signature: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.verifyDigest([masterWalletId, subWalletId, publicKey, digest, signature],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("verifyDigest", err, reject); });
        });
    }

    getTransactionSignedInfo(
        masterWalletId: string,
        subWalletId: string,
        tx: string,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getTransactionSignedInfo(
                [
                    masterWalletId,
                    subWalletId,
                    tx,
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getTransactionSignedInfo", err, reject); });
        });
    }

    convertToRawTransaction(
        masterWalletId: string,
        subWalletId: string,
        tx: string,
    ): Promise<string> {
        Logger.warn("spv", "Call to convertToRawTransaction");
        return new Promise((resolve, reject) => {
            walletManager.convertToRawTransaction(
                [
                    masterWalletId,
                    subWalletId,
                    tx,
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("convertToRawTransaction", err, reject); });
        });
    }

    createWithdrawTransaction(masterWalletId: string, subWalletId: string, inputs: string, amount: string
        , mainchainAddress: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createWithdrawTransaction([masterWalletId, subWalletId, inputs, amount, mainchainAddress, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createWithdrawTransaction", err, reject); });
        });
    }

    // IDChainSubWallet

    createIdTransaction(masterWalletId: string, subWalletId: string, inputs: string, payloadJson: string, memo: string, fee: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createIdTransaction([masterWalletId, subWalletId, inputs, payloadJson, memo, fee],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createIdTransaction", err, reject); });
        });
    }

    didSign(masterWalletId: string, did: string, message: string, payPassword: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.didSign([masterWalletId, did, message, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("didSign", err, reject); });
        });
    }

    createTransaction(
        masterWalletId: string,
        subWalletId: string,
        inputs: string,
        outputs: string,
        fee: string,
        memo: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createTransaction(
                [
                    masterWalletId,
                    subWalletId,
                    inputs,
                    outputs,
                    fee,
                    memo
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createTransaction", err, reject); });
        });
    }

    // ETHSC
    createTransfer(
        masterWalletId: string,
        subWalletId: string,
        toAddress: string,
        amount: string,
        amountUnit: number,
        gasPrice: string,
        gasPriceUnit: number,
        gasLimit: string,
        nonce: number
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createTransfer(
                [
                    masterWalletId,
                    subWalletId,
                    toAddress,
                    amount,
                    amountUnit,
                    Util.getDecimalString(gasPrice),
                    gasPriceUnit,
                    Util.getDecimalString(gasLimit),
                    nonce
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createTransfer", err, reject); });
        });
    }

    createTransferGeneric(
        masterWalletId: string,
        chainCode: string, // ETHSC, ETHHECO, etc
        toAddress: string,
        amount: string,
        amountUnit: number,
        gasPrice: string,
        gasPriceUnit: number,
        gasLimit: string,
        data: string,
        nonce: number
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createTransferGeneric(
                [
                    masterWalletId,
                    chainCode,
                    toAddress,
                    Util.getDecimalString(amount),
                    amountUnit,
                    Util.getDecimalString(gasPrice),
                    gasPriceUnit,
                    Util.getDecimalString(gasLimit),
                    data,
                    nonce
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createTransferGeneric", err, reject); });
        });
    }

    exportETHSCPrivateKey(masterWalletId: string, subWalletId: string, payPassWord: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.exportETHSCPrivateKey([masterWalletId, subWalletId, payPassWord],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("exportETHSCPrivateKey", err, reject); });
        });
    }

    createDepositTransaction(
        masterWalletId: string,
        fromSubWalletId: string,
        version: number,
        inputs: string,
        toSubWalletId: string,
        amount: string,
        sideChainAddress: string,
        lockAddress: string,
        fee: string,
        memo = ''
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createDepositTransaction(
                [
                    masterWalletId,
                    fromSubWalletId,
                    version,
                    inputs,
                    toSubWalletId,
                    amount,
                    sideChainAddress,
                    lockAddress,
                    fee,
                    memo
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createDepositTransaction", err, reject); });
        });
    }

    createCancelProducerTransaction(masterWalletId: string, subWalletId: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createCancelProducerTransaction([masterWalletId, subWalletId, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createCancelProducerTransaction", err, reject); });
        });
    }

    createRegisterProducerTransaction(masterWalletId: string, subWalletId: string, input: string, payloadJson: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRegisterProducerTransaction([masterWalletId, subWalletId, input, payloadJson, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRegisterProducerTransaction", err, reject); });
        });
    }

    generateProducerPayload(masterWalletId: string, subWalletId: string, publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.generateProducerPayload([masterWalletId, subWalletId, publicKey, nodePublicKey, nickname, url, IPAddress, location, payPasswd],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateProducerPayload", err, reject); });
        });
    }

    generateCancelProducerPayload(masterWalletId: string, subWalletId: string, publicKey: string, payPasswd: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.generateCancelProducerPayload([masterWalletId, subWalletId, publicKey, payPasswd],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateCancelProducerPayload", err, reject); });
        });
    }

    createRetrieveDepositTransaction(masterWalletId: string, subWalletId: string, input: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRetrieveDepositTransaction([masterWalletId, subWalletId, input, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRetrieveDepositTransaction", err, reject); });
        });
    }

    createUpdateProducerTransaction(masterWalletId: string, subWalletId: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createUpdateProducerTransaction([masterWalletId, subWalletId, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createUpdateProducerTransaction", err, reject); });
        });
    }

    getOwnerPublicKey(masterWalletId: string, subWalletId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getOwnerPublicKey([masterWalletId, subWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getOwnerPublicKey", err, reject); });
        });
    }

    getOwnerAddress(masterWalletId: string, subWalletId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getOwnerAddress([masterWalletId, subWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getOwnerAddress", err, reject); });
        });
    }

    getOwnerDepositAddress(masterWalletId: string, subWalletId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getOwnerDepositAddress([masterWalletId, subWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getOwnerDepositAddress", err, reject); });
        });
    }

    // CR
    getCRDepositAddress(masterWalletId: string, subWalletId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getCRDepositAddress([masterWalletId, subWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getCRDepositAddress", err, reject); });
        });
    }

    generateCRInfoPayload(masterWalletId: string, subWalletId: string, publicKey: string,
        did: string, nickname: string, url: string, location: number): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.generateCRInfoPayload([masterWalletId, subWalletId, publicKey, did, nickname, url, location],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateCRInfoPayload", err, reject); });
        });
    }

    generateUnregisterCRPayload(masterWalletId: string, subWalletId: string, CID: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.generateUnregisterCRPayload([masterWalletId, subWalletId, CID],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateUnregisterCRPayload", err, reject); });
        });
    }

    createRegisterCRTransaction(masterWalletId: string, subWalletId: string, input: string, payloadJson: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRegisterCRTransaction([masterWalletId, subWalletId, input, payloadJson, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRegisterCRTransaction", err, reject); });
        });
    }

    createUpdateCRTransaction(masterWalletId: string, subWalletId: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createUpdateCRTransaction([masterWalletId, subWalletId, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createUpdateCRTransaction", err, reject); });
        });
    }

    createUnregisterCRTransaction(masterWalletId: string, subWalletId: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createUnregisterCRTransaction([masterWalletId, subWalletId, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createUnregisterCRTransaction", err, reject); });
        });
    }

    createRetrieveCRDepositTransaction(masterWalletId: string, subWalletId: string, input: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRetrieveCRDepositTransaction([masterWalletId, subWalletId, input, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRetrieveCRDepositTransaction", err, reject); });
        });
    }

    createVoteTransaction(masterWalletId: string, subWalletId: string, inputs: string, voteContents: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createVoteTransaction([masterWalletId, subWalletId, inputs, voteContents, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createVoteTransaction", err, reject); });
        });
    }

    CRCouncilMemberClaimNodeDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.CRCouncilMemberClaimNodeDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("CRCouncilMemberClaimNodeDigest", err, reject); });
        });
    }

    createCRCouncilMemberClaimNodeTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createCRCouncilMemberClaimNodeTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createCRCouncilMemberClaimNodeTransaction", err, reject); });
        });
    }

    // CR proposal

    proposalOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalOwnerDigest", err, reject); });
        });
    }

    proposalCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalCRCouncilMemberDigest", err, reject); });
        });
    }

    createProposalTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalTransaction", err, reject); });
        });
    }

    proposalReviewDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalReviewDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalReviewDigest", err, reject); });
        });
    }

    createProposalReviewTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalReviewTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalReviewTransaction", err, reject); });
        });
    }

    proposalTrackingOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalTrackingOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalTrackingOwnerDigest", err, reject); });
        });
    }

    proposalTrackingNewOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalTrackingNewOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalTrackingNewOwnerDigest", err, reject); });
        });
    }

    proposalTrackingSecretaryDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalTrackingSecretaryDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalTrackingSecretaryDigest", err, reject); });
        });
    }

    createProposalTrackingTransaction(masterWalletId: string, subWalletId: string, input: string, SecretaryGeneralSignedPayload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalTrackingTransaction([masterWalletId, subWalletId, input, SecretaryGeneralSignedPayload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalTrackingTransaction", err, reject); });
        });
    }

    // -- Proposal Secretary General Election
    proposalSecretaryGeneralElectionDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalSecretaryGeneralElectionDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalSecretaryGeneralElectionDigest", err, reject); });
        });
    }

    proposalSecretaryGeneralElectionCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalSecretaryGeneralElectionCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalSecretaryGeneralElectionCRCouncilMemberDigest", err, reject); });
        });
    }

    createSecretaryGeneralElectionTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createSecretaryGeneralElectionTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createSecretaryGeneralElectionTransaction", err, reject); });
        });
    }

    // -- Proposal Change Owner
    proposalChangeOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalChangeOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalChangeOwnerDigest", err, reject); });
        });
    }

    proposalChangeOwnerCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalChangeOwnerCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalChangeOwnerCRCouncilMemberDigest", err, reject); });
        });
    }

    createProposalChangeOwnerTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalChangeOwnerTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalChangeOwnerTransaction", err, reject); });
        });
    }

    // -- Proposal Terminate Proposal
    terminateProposalOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.terminateProposalOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("terminateProposalOwnerDigest", err, reject); });
        });
    }

    terminateProposalCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.terminateProposalCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("terminateProposalCRCouncilMemberDigest", err, reject); });
        });
    }

    createTerminateProposalTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createTerminateProposalTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createTerminateProposalTransaction", err, reject); });
        });
    }

    proposalWithdrawDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalWithdrawDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalWithdrawDigest", err, reject); reject(err); });
        });
    }

    createProposalWithdrawTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalWithdrawTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalWithdrawTransaction", err, reject); });
        });
    }

    // Reserve Custom ID
    reserveCustomIDOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.reserveCustomIDOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("reserveCustomIDOwnerDigest", err, reject); });
        });
    }

    reserveCustomIDCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.reserveCustomIDCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("reserveCustomIDCRCouncilMemberDigest", err, reject); });
        });
    }

    createReserveCustomIDTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createReserveCustomIDTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createReserveCustomIDTransaction", err, reject); });
        });
    }

    // Receive Custom ID
    receiveCustomIDOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.receiveCustomIDOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("receiveCustomIDOwnerDigest", err, reject); });
        });
    }

    receiveCustomIDCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.receiveCustomIDCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("receiveCustomIDCRCouncilMemberDigest", err, reject); });
        });
    }

    createReceiveCustomIDTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createReceiveCustomIDTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createReceiveCustomIDTransaction", err, reject); });
        });
    }

    // Proposal Register side-chain
    registerSidechainOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.registerSidechainOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("registerSidechainOwnerDigest", err, reject); });
        });
    }

    registerSidechainCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.registerSidechainCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("registerSidechainCRCouncilMemberDigest", err, reject); });
        });
    }

    createRegisterSidechainTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRegisterSidechainTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRegisterSidechainTransaction", err, reject); });
        });
    }

    // Change Custom ID Fee
    changeCustomIDFeeOwnerDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.changeCustomIDFeeOwnerDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("changeCustomIDFeeOwnerDigest", err, reject); });
        });
    }

    changeCustomIDFeeCRCouncilMemberDigest(masterWalletId: string, subWalletId: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.changeCustomIDFeeCRCouncilMemberDigest([masterWalletId, subWalletId, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("changeCustomIDFeeCRCouncilMemberDigest", err, reject); });
        });
    }

    createChangeCustomIDFeeTransaction(masterWalletId: string, subWalletId: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createChangeCustomIDFeeTransaction([masterWalletId, subWalletId, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createChangeCustomIDFeeTransaction", err, reject); });
        });
    }

    // BTCSubwallet
    getLegacyAddresses(masterWalletId: string, index: number, count: number, internal: boolean): Promise<string[]> {
        return new Promise((resolve, reject) => {
            walletManager.getLegacyAddresses([masterWalletId, index, count, internal],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getLegacyAddresses", err, reject); });
        });
    }

    createBTCTransaction(
        masterWalletId: string, inputs: string, outputs: string, changeAddress: string, feePerKB: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createBTCTransaction(
                [masterWalletId, inputs, outputs, changeAddress, feePerKB],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createBTCTransaction", err, reject); });
        });
    }

    successFun(ret, okFun = null) {
        if (okFun != null) {
            return okFun(ret);
        }
    }

    // TODO: Replace this to improve the error object (exception, message) only, not
    // show any popup or send message. Each method should handle that case by case
    // TODO: replace hardcoded error code with enum: http://elastos.ela.spv.cpp/SDK/Common/ErrorChecker.h
    async handleError(caller: string, err: any, promiseRejectHandler: (reason?: any) => void) {
        if (this.native)
            await this.native.hideLoading();

        // The error has caught, Senty should not capture this exception
        err.caller = caller;
        err.type = 'skipsentry';
        err.description = GlobalLanguageService.instance.translate("wallet.error-" + err["code"]);

        if (DIDSessionsStore.signedInDIDString == null) {
            // Sign out
            Logger.warn('wallet', 'did sign out, Filter this error:', err);
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }

        Logger.error('wallet', 'SPVService::handleError:', err);

        // Do not show alert for 10003 and 20001.
        if (err["code"] === 10003) {
            Logger.warn('wallet', 'SPVService Can\'t get the subwallet :', err);
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }
        // Maybe some subwallet is not supported in LRW.
        if (err["code"] === 20001) {
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }
        // Need use input password then retry.
        if (err["code"] === 20006) {
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }

        // Unsupport to create elastos based subwallet. eg. create master wallet by evm privatekey.
        if (err["code"] === 20029) {
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }

        let error = err["code"]
        if (error) {
            error = "Error-" + err["code"];
            if (err["exception"]) {
                error = error + ": " + err["exception"];
            }
            else if (err["message"]) {
                error = error + ": " + err["message"];
            }
        }

        // Show an error popup
        if (err["code"] === 20013) {
            let amount = err["Data"] / Config.SELA;
            void this.popupProvider.ionicAlert_data('wallet.transaction-fail', error, amount);
        } else {
            void this.popupProvider.ionicAlert('common.error', 'wallet.Error-' + err["code"]);
        }

        // Send a special error event
        if (err["code"] === 20036) {
            this.event.publish("error:update", err);
        } else if (err["code"] === 20028) {
            this.event.publish("error:destroySubWallet");
        } else {
            this.event.publish("error:update");
        }

        if (promiseRejectHandler) promiseRejectHandler(err);
    }
}

export const jsToSpvWalletId = (jsWalletId: string): string => {
    return SPVService.instance.getSPVMasterID(jsWalletId);
}