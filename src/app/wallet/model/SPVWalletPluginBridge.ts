import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { Config } from '../config/Config';
import { Native } from '../services/native.service';
import { PopupProvider } from '../services/popup.service';
import { StandardCoinName } from './Coin';
import { Util } from './util';
import { WalletAccountType } from './WalletAccount';

declare let walletManager: WalletPlugin.WalletManager;

export type ELAAmountString = string; // string representation of an ELA amount (encoded like this in the wallet plugin)
export type TransactionID = string;
export type SignedTransaction = string;

export enum VoteType {
    CRC = "CRC",
    Delegate = "Delegate",
    CRCImpeachment = "CRCImpeachment",
    CRCProposal = "CRCProposal"
}

export type MasterWalletBasicInfo = {
    HasPassPhrase: boolean,
    M: number,
    N: number,
    Readonly: boolean,
    SingleAddress: boolean,
    Type: WalletAccountType,
};

/** details:
*  [{
*      "Type": "Delegate",
*      "Amount": "200000000",
*      "Timestamp": 1560888482,
*      "Expiry": null,
*      "Votes": {"02848A8F1880408C4186ED31768331BC9296E1B0C3EC7AE6F11E9069B16013A9C5": "10000000","02775B47CCB0808BA70EA16800385DBA2737FDA090BB0EBAE948DD16FF658CA74D": "200000000"}
*  },
*  {
*      ...
*  }]
* or:
*  [{
*      "Type": "CRC",
*      "Amount": "300000000",
*      "Timestamp": 1560888482,
*      "Expiry": null,
*      "Votes": {"iYMVuGs1FscpgmghSzg243R6PzPiszrgj7": "10000000","iT42VNGXNUeqJ5yP4iGrqja6qhSEdSQmeP": "200000000"}
*  },
*  {*/

export type VoteInfo = {
    Type: VoteType,
    Amount: string, // Amount in sELA
    Timestamp: number, // Unix timestamp (secs)
    Expiry: number, // Unix timestamp (secs). Can be null.
};

export type CRProposalVoteInfo = VoteInfo & {
    Votes: {
        [proposalHash: string]: string // "proposalHash": "sELAVoteAmount"
    }
};

export type Candidates = {
  [k: string]: string // "iYMVuGs1FscpgmghSzg243R6PzPiszrgj7": "100000000",
};

export type VoteContent = {
  Type: VoteType,
  Candidates: Candidates,
};

export type AllAddresses = {
    Addresses: string[];
    MaxCount: number;
};

export class SPVWalletPluginBridge {

    constructor(
        private native: Native,
        private event: Events,
        private popupProvider: PopupProvider
    ) {
    }

    public setNetwork(netType: string, config: string): Promise<void> {
        return new Promise((resolve, reject)=>{
             walletManager.setNetwork([netType, config],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("setNetwork", err, reject);  });
        });
    }

    public setLogLevel(loglevel: string): Promise<void> {
      return new Promise((resolve, reject)=>{
           walletManager.setLogLevel([loglevel],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("setLogLevel", err, reject);  });
      });
  }

    public init(rootPath: string): Promise<void> {
        return new Promise((resolve, reject)=>{
             walletManager.init([rootPath],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("init", err, reject);  });
        });
    }

    public destroy(): Promise<void> {
      return new Promise((resolve, reject)=>{
           walletManager.destroy([],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("destroy", err, reject);  });
      });
    }

    public generateMnemonic(language: string): Promise<string> {
        return new Promise((resolve, reject)=>{
            walletManager.generateMnemonic([language],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateMnemonic", err, reject);  });
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
                [masterWalletId, mnemonic, phrasePassword, payPassword, singleAddress],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("importWalletWithMnemonic", err, reject); });
        });
    }

    getAllMasterWallets(): Promise<string[]> {
        return new Promise((resolve, reject)=>{
            Logger.log("wallet", "Getting all master wallets");

            walletManager.getAllMasterWallets([],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAllMasterWallets", err, reject);  });
        });
    }

    destroyWallet(masterWalletId: string): Promise<void> {
        return new Promise((resolve, reject)=>{
            walletManager.destroyWallet([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("destroyWallet", err, reject);  });
        });
    }

    getVersion(): Promise<string> {
        return new Promise((resolve, reject)=>{
            walletManager.getVersion([],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getVersion", err, reject);  });
        });
    }

    getMasterWalletBasicInfo(masterWalletId: string): Promise<MasterWalletBasicInfo> {
        return new Promise((resolve, reject)=>{
            walletManager.getMasterWalletBasicInfo([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getMasterWalletBasicInfo", err, reject);  });
        });
    }

    getAllSubWallets(masterWalletId: string): Promise<StandardCoinName[]> {
        return new Promise((resolve, reject)=>{
            walletManager.getAllSubWallets([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAllSubWallets", err, reject);  });
        });
    }

    createSubWallet(masterWalletId: string, elastosChainCode: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.createSubWallet([masterWalletId, elastosChainCode],
                (ret) => {
                    Logger.log("wallet", "Created subwallet in SPVSDK, wallet ID:", masterWalletId, "Chain code:", elastosChainCode);
                    resolve(ret);
                },
                (err) => { void this.handleError("createSubWallet", err, reject);  });
        });
    }

    exportWalletWithKeystore(masterWalletId: string, backupPassWord: string, payPassword: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.exportWalletWithKeystore([masterWalletId, backupPassWord, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("exportWalletWithKeystore", err, reject);  });
        });
    }

    exportWalletWithMnemonic(masterWalletId: string, payPassWord: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.exportWalletWithMnemonic([masterWalletId, payPassWord],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("exportWalletWithMnemonic", err, reject);  });
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
      return new Promise((resolve, reject)=>{
          walletManager.verifyPassPhrase([masterWalletId, passphrase, payPassword],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("verifyPassPhrase", err, reject);  });
      });
    }

    verifyPayPassword(masterWalletId: string, payPassword: string): Promise<void> {
      return new Promise((resolve, reject)=>{
          walletManager.verifyPayPassword([masterWalletId, payPassword],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("verifyPayPassword", err, reject);  });
      });
    }


    destroySubWallet(masterWalletId: string, elastosChainCode: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.destroySubWallet([masterWalletId, elastosChainCode],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("destroySubWallet", err, reject);  });
        });
    }

    getPubKeyInfo(masterWalletId: string): Promise<void> {
      return new Promise((resolve, reject)=>{
          walletManager.getPubKeyInfo([masterWalletId],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("getPubKeyInfo", err, reject);  });
      });
    }

    isAddressValid(masterWalletId: string, address: string): Promise<boolean> {
        return new Promise((resolve, reject)=>{
            walletManager.isAddressValid([masterWalletId, address],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("isAddressValid", err, reject);  });
        });
    }

    isSubWalletAddressValid(masterWalletId: string, elastosChainCode: string, address: string): Promise<boolean> {
        return new Promise((resolve, reject)=>{
            walletManager.isSubWalletAddressValid([masterWalletId, elastosChainCode, address],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("isSubWalletAddressValid", err, reject);  });
        });
    }

    getSupportedChains(masterWalletId: string): Promise<string[]> {
        return new Promise((resolve, reject)=>{
            walletManager.getSupportedChains([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getSupportedChains", err, reject);  });
        });
    }

    changePassword(masterWalletId: string, oldPassword: string, newPassword: string): Promise<void> {
        return new Promise((resolve, reject)=>{
            walletManager.changePassword([masterWalletId, oldPassword, newPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("changePassword", err, reject);  });
        });
    }

    createAddress(masterWalletId: string, elastosChainCode: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createAddress([masterWalletId, elastosChainCode],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createAddress", err, reject);  });
        });
    }

    getAllAddresses(masterWalletId: string, elastosChainCode: string, start: number, count: number, internal: boolean): Promise<AllAddresses> {
        return new Promise((resolve, reject) => {
            walletManager.getAllAddress([masterWalletId, elastosChainCode, start, count, internal],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAllAddresses", err, reject);  });
        });
    }

    getLastAddresses(masterWalletId: string, elastosChainCode: string, internal: boolean): Promise<string[]> {
        return new Promise((resolve, reject) => {
            walletManager.getLastAddresses([masterWalletId, elastosChainCode, internal],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getLastAddresses", err, reject);  });
        });
    }

    updateUsedAddress(masterWalletId: string, elastosChainCode: string, usedAddress: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            walletManager.updateUsedAddress([masterWalletId, elastosChainCode, usedAddress],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("updateUsedAddress", err, reject);  });
        });
    }

    getAllPublicKeys(masterWalletId: string, elastosChainCode: string, start: number, count: number): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.getAllPublicKeys([masterWalletId, elastosChainCode, start, count],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getAllPublicKeys", err, reject);  });
        });
    }

    signTransaction(
        masterWalletId: string,
        elastosChainCode: string,
        rawTransaction: string,
        payPassword: string
    ): Promise<SignedTransaction> {
        return new Promise((resolve, reject) => {
            walletManager.signTransaction(
                [
                    masterWalletId,
                    elastosChainCode,
                    rawTransaction,
                    payPassword
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("signTransaction", err, reject);  });
        });
    }

    getTransactionSignedInfo(
        masterWalletId: string,
        elastosChainCode: string,
        tx: string,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getTransactionSignedInfo(
                [
                    masterWalletId,
                    elastosChainCode,
                    tx,
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getTransactionSignedInfo", err, reject);  });
        });
    }

    convertToRawTransaction(
        masterWalletId: string,
        elastosChainCode: string,
        tx: string,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.convertToRawTransaction(
                [
                    masterWalletId,
                    elastosChainCode,
                    tx,
                ],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("convertToRawTransaction", err, reject);  });
        });
    }

    createWithdrawTransaction(masterWalletId: string, elastosChainCode: string, inputs: string, amount: string
        , mainchainAddress: string, fee: string, memo: string): Promise<string> {
            return new Promise((resolve, reject) => {
            walletManager.createWithdrawTransaction([masterWalletId, elastosChainCode, inputs, amount, mainchainAddress, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createWithdrawTransaction", err, reject);  });
        });
    }

    // IDChainSubWallet

    createIdTransaction(masterWalletId: string, elastosChainCode: string, inputs: string, payloadJson: string, memo: string, fee: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createIdTransaction([masterWalletId, elastosChainCode, inputs, payloadJson, memo, fee],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createIdTransaction", err, reject);  });
        });
    }

    didSign(masterWalletId: string, did: string, message: string, payPassword: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.didSign([masterWalletId, did, message, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("didSign", err, reject);  });
        });
    }

    didSignDigest(masterWalletId: string, did: string, digest: string, payPassword: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.didSignDigest([masterWalletId, did, digest, payPassword],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("didSignDigest", err, reject);  });
        });
    }

    createTransaction(
        masterWalletId: string,
        elastosChainCode: string,
        inputs: string,
        outputs: string,
        fee: string,
        memo: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createTransaction(
                [
                    masterWalletId,
                    elastosChainCode,
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
        elastosChainCode: string,
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
                    elastosChainCode,
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

    // exportETHSCPrivateKey(masterWalletId: string, elastosChainCode: string, payPassWord: string): Promise<any> {
    //     return new Promise((resolve, reject)=>{
    //         walletManager.exportETHSCPrivateKey([masterWalletId, elastosChainCode, payPassWord],
    //             (ret) => { resolve(ret); },
    //             (err) => { this.handleError(err, reject);  });
    //     });
    // }

    createDepositTransaction(
        masterWalletId: string,
        fromElastosChainCode: string,
        inputs: string,
        toElastosChainCode: string,
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
                    fromElastosChainCode,
                    inputs,
                    toElastosChainCode,
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

    createCancelProducerTransaction(masterWalletId: string, elastosChainCode: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createCancelProducerTransaction([masterWalletId, elastosChainCode, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createCancelProducerTransaction", err, reject);  });
        });
    }

    createRegisterProducerTransaction(masterWalletId: string, elastosChainCode: string, input: string, payloadJson: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRegisterProducerTransaction([masterWalletId, elastosChainCode, input, payloadJson, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRegisterProducerTransaction", err, reject);  });
        });
    }

    generateProducerPayload(masterWalletId: string, elastosChainCode: string, publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.generateProducerPayload([masterWalletId, elastosChainCode, publicKey, nodePublicKey, nickname, url, IPAddress, location, payPasswd],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateProducerPayload", err, reject);  });
        });
    }

    generateCancelProducerPayload(masterWalletId: string, elastosChainCode: string, publicKey: string, payPasswd: string): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.generateCancelProducerPayload([masterWalletId, elastosChainCode, publicKey, payPasswd],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateCancelProducerPayload", err, reject);  });
        });
    }

    createRetrieveDepositTransaction(masterWalletId: string, elastosChainCode: string, input: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRetrieveDepositTransaction([masterWalletId, elastosChainCode, input, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRetrieveDepositTransaction", err, reject);  });
        });
    }

    createUpdateProducerTransaction(masterWalletId: string, elastosChainCode: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createUpdateProducerTransaction([masterWalletId, elastosChainCode, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createUpdateProducerTransaction", err, reject);  });
        });
    }

    getOwnerPublicKey(masterWalletId: string, elastosChainCode: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.getOwnerPublicKey([masterWalletId, elastosChainCode],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("getOwnerPublicKey", err, reject);  });
        });
    }

    getOwnerAddress(masterWalletId: string, elastosChainCode: string): Promise<string> {
      return new Promise((resolve, reject) => {
          walletManager.getOwnerAddress([masterWalletId, elastosChainCode],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("getOwnerAddress", err, reject);  });
      });
    }

    getOwnerDepositAddress(masterWalletId: string, elastosChainCode: string): Promise<string> {
      return new Promise((resolve, reject) => {
          walletManager.getOwnerDepositAddress([masterWalletId, elastosChainCode],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("getOwnerDepositAddress", err, reject);  });
      });
    }

    // CR
    getCRDepositAddress(masterWalletId: string, elastosChainCode: string): Promise<string> {
      return new Promise((resolve, reject) => {
          walletManager.getCRDepositAddress([masterWalletId, elastosChainCode],
              (ret) => { resolve(ret); },
              (err) => { void this.handleError("getCRDepositAddress", err, reject);  });
      });
    }

    generateCRInfoPayload(masterWalletId: string, elastosChainCode: string, publicKey: string,
        did: string, nickname: string, url: string, location: number): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.generateCRInfoPayload([masterWalletId, elastosChainCode, publicKey, did, nickname, url, location],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateCRInfoPayload", err, reject);  });
        });
    }

    generateUnregisterCRPayload(masterWalletId: string, elastosChainCode: string, CID: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.generateUnregisterCRPayload([masterWalletId, elastosChainCode, CID],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("generateUnregisterCRPayload", err, reject);  });
        });
    }

    createRegisterCRTransaction(masterWalletId: string, elastosChainCode: string, input: string, payloadJson: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRegisterCRTransaction([masterWalletId, elastosChainCode, input, payloadJson, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRegisterCRTransaction", err, reject);  });
        });
    }

    createUpdateCRTransaction(masterWalletId: string, elastosChainCode: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createUpdateCRTransaction([masterWalletId, elastosChainCode, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createUpdateCRTransaction", err, reject);  });
        });
    }

    createUnregisterCRTransaction(masterWalletId: string, elastosChainCode: string, input: string, payloadJson: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createUnregisterCRTransaction([masterWalletId, elastosChainCode, input, payloadJson, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createUnregisterCRTransaction", err, reject);  });
        });
    }

    createRetrieveCRDepositTransaction(masterWalletId: string, elastosChainCode: string, input: string, amount: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createRetrieveCRDepositTransaction([masterWalletId, elastosChainCode, input, amount, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createRetrieveCRDepositTransaction", err, reject);  });
        });
    }

    createVoteTransaction(masterWalletId: string, elastosChainCode: string, inputs: string, voteContents: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createVoteTransaction([masterWalletId, elastosChainCode, inputs, voteContents, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createVoteTransaction", err, reject);  });
        });
    }

    CRCouncilMemberClaimNodeDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.CRCouncilMemberClaimNodeDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("CRCouncilMemberClaimNodeDigest", err, reject);  });
        });
    }

    createCRCouncilMemberClaimNodeTransaction(masterWalletId: string, elastosChainCode: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createCRCouncilMemberClaimNodeTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createCRCouncilMemberClaimNodeTransaction", err, reject);  });
        });
    }

    // CR proposal

    proposalOwnerDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalOwnerDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalOwnerDigest", err, reject);  });
        });
    }

    proposalCRCouncilMemberDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalCRCouncilMemberDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalCRCouncilMemberDigest", err, reject);  });
        });
    }

    createProposalTransaction(masterWalletId: string, elastosChainCode: string, input:string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalTransaction", err, reject);  });
        });
    }

    proposalReviewDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalReviewDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalReviewDigest", err, reject);  });
        });
    }

    createProposalReviewTransaction(masterWalletId: string, elastosChainCode: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalReviewTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalReviewTransaction", err, reject);  });
        });
    }

    proposalTrackingOwnerDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalTrackingOwnerDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalTrackingOwnerDigest", err, reject);  });
        });
    }

    proposalTrackingNewOwnerDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalTrackingNewOwnerDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalTrackingNewOwnerDigest", err, reject);  });
        });
    }

    proposalTrackingSecretaryDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalTrackingSecretaryDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalTrackingSecretaryDigest", err, reject);  });
        });
    }

    createProposalTrackingTransaction(masterWalletId: string, elastosChainCode: string, input: string, SecretaryGeneralSignedPayload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalTrackingTransaction([masterWalletId, elastosChainCode, input, SecretaryGeneralSignedPayload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalTrackingTransaction", err, reject);  });
        });
    }

    // -- Proposal Secretary General Election
    proposalSecretaryGeneralElectionDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalSecretaryGeneralElectionDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalSecretaryGeneralElectionDigest", err, reject); });
        });
    }

    proposalSecretaryGeneralElectionCRCouncilMemberDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalSecretaryGeneralElectionCRCouncilMemberDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalSecretaryGeneralElectionCRCouncilMemberDigest", err, reject); });
        });
    }

    createSecretaryGeneralElectionTransaction(masterWalletId: string, elastosChainCode: string, input: string, payload: string, fee, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createSecretaryGeneralElectionTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createSecretaryGeneralElectionTransaction", err, reject); });
        });
    }

    // -- Proposal Change Owner
    proposalChangeOwnerDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalChangeOwnerDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalChangeOwnerDigest", err, reject); });
        });
    }

    proposalChangeOwnerCRCouncilMemberDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalChangeOwnerCRCouncilMemberDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalChangeOwnerCRCouncilMemberDigest", err, reject); });
        });
    }

    createProposalChangeOwnerTransaction(masterWalletId: string, elastosChainCode: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalChangeOwnerTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalChangeOwnerTransaction", err, reject); });
        });
    }

    // -- Proposal Terminate Proposal
    terminateProposalOwnerDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.terminateProposalOwnerDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("terminateProposalOwnerDigest", err, reject); });
        });
    }

    terminateProposalCRCouncilMemberDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.terminateProposalCRCouncilMemberDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("terminateProposalCRCouncilMemberDigest", err, reject); });
        });
    }

    createTerminateProposalTransaction(masterWalletId: string, elastosChainCode: string, input: string, payload: string, fee: string, memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createTerminateProposalTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createTerminateProposalTransaction", err, reject); });
        });
    }

    proposalWithdrawDigest(masterWalletId: string, elastosChainCode: string, payload: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.proposalWithdrawDigest([masterWalletId, elastosChainCode, payload],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("proposalWithdrawDigest", err, reject); reject(err); });
        });
    }

    createProposalWithdrawTransaction(masterWalletId: string, elastosChainCode: string, input: string, payload: string, fee: string,memo: string): Promise<string> {
        return new Promise((resolve, reject) => {
            walletManager.createProposalWithdrawTransaction([masterWalletId, elastosChainCode, input, payload, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { void this.handleError("createProposalWithdrawTransaction", err, reject); });
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
    async handleError(caller: string, err: any, promiseRejectHandler: (reason?: any)=>void) {
        await this.native.hideLoading();

        // The error has caught, Senty should not capture this exception
        err.caller = caller;
        err.type = 'skipsentry';
        err.description = GlobalLanguageService.instance.translate("wallet.error-"+err["code"]);

        if (GlobalDIDSessionsService.signedInDIDString == null) {
            // Sign out
            Logger.warn('wallet', 'did sign out, Filter this error:', err);
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }

        // Do not show alert for 10003 and 20001.
        if (err["code"] === 10003) {
            Logger.warn('wallet', 'SPVWalletPluginBridge Can\'t get the subwallet :', err);
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }
        // Maybe some subwallet is not supported in LRW.
        if (err["code"] === 20001) {
            Logger.warn('wallet', 'SPVWalletPluginBridge error :', err);
            if (promiseRejectHandler) promiseRejectHandler(err);
            return;
        }
        Logger.error('wallet', 'SPVWalletPluginBridge::handleError:', err);

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