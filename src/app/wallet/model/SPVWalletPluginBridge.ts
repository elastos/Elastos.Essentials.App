import { Util } from './Util';
import { Native } from '../services/native.service';
import { PopupProvider } from '../services/popup.service';
import { Config } from '../config/Config';
import { StandardCoinName } from './Coin';
import { AllTransactions, AllTransactionsHistory } from './Transaction';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Events } from 'src/app/services/events.service';

declare let walletManager: WalletPlugin.WalletManager;

export type ELAAmountString = string; // string representation of an ELA amount (encoded like this in the wallet plugin)
export type TransactionID = string;
export type SignedTransaction = string;

export type AllUTXOs = {
    MaxCount: number
    // TODO: utxos
};

export type AssetSummary = {
    Address: {
        [address: string]: string // "address": "sELAAmount"
    }
    Balance: string;
    DepositBalance: string;
    LockedBalance: string;
    PendingBalance: string;
    SpendingBalance: string;
    VotedBalance: string;
};

export type PublishedTransaction = {
    TxHash: string;
};

export type SPVWalletMessage = {
    MasterWalletID: string;
    ChainID: StandardCoinName;
    Action: string;
    txid: string;
    status: string;
    Progress: number;
    LastBlockTime: number;

    // TODO: Tx published only? Inherit?
    hash: string;
    result: string;
    Code: string;
    Reason: string;

    // ETHSC
    event: ETHSCEvent;
};

export type ETHSCEvent = {
    ErrorDescription: string;
    Event: string;
    NewState?: string;
    OldState?: string;
    PercentComplete?: number;
    Status: string;
    Timestamp?: number;
    Type: string;
    WalletSymbol?: string;
}

export enum ETHSCEventType {
    EWMEvent = "EWMEvent",
    PeerEvent = "PeerEvent",
    TransferEvent = "TransferEvent",
    TokenEvent = "TokenEvent",
    WalletEvent = "WalletEvent",
}

export enum ETHSCEventAction {
    BALANCE_UPDATED = "BALANCE_UPDATED",
    CHANGED = "CHANGED",
    CREATED = "CREATED",
    DEFAULT_GAS_PRICE_UPDATED = "DEFAULT_GAS_PRICE_UPDATED",
    PROGRESS = "PROGRESS",
    // TODO: add more
}

export type TxPublishedResult = {
    Code: number;
    Reason: string;
};

export type BlockInfo = {
    Hash: string,
    Height: number,
    Timestamp: number,
};

export enum VoteType {
    CRC = "CRC",
    Delegate = "Delegate",
    CRCImpeachment = "CRCImpeachment",
    CRCProposal = "CRCProposal"
}

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

    public setNetwork(netType: string, config: string, jsonrpcUrl: string, apimiscUrl: string): Promise<void> {
        return new Promise((resolve, reject)=>{
             walletManager.setNetwork([netType, config, jsonrpcUrl, apimiscUrl],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    public setLogLevel(loglevel: string): Promise<void> {
      return new Promise((resolve, reject)=>{
           walletManager.setLogLevel([loglevel],
              (ret) => { resolve(ret); },
              (err) => { this.handleError(err, reject);  });
      });
  }

    public init(rootPath: string): Promise<void> {
        return new Promise((resolve, reject)=>{
             walletManager.init([rootPath],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    public destroy(): Promise<void> {
      return new Promise((resolve, reject)=>{
           walletManager.destroy([],
              (ret) => { resolve(ret); },
              (err) => { this.handleError(err, reject);  });
      });
    }

    public generateMnemonic(language: string): Promise<string> {
        return new Promise((resolve, reject)=>{
            walletManager.generateMnemonic([language],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createMasterWallet(
        masterWalletId: string,
        mnemonic: string,
        phrasePassword: string,
        payPassword: string,
        singleAddress: boolean
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createMasterWallet(
                [masterWalletId, mnemonic, phrasePassword, payPassword, singleAddress],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    createMultiSignMasterWallet(
        masterWalletId: string,
        publicKeys: string,
        m: number
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createMultiSignMasterWallet(
                [masterWalletId, publicKeys, m, Util.getTimestamp()],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    createMultiSignMasterWalletWithPrivKey(
        masterWalletId: string,
        privKey: string,
        payPassword: string,
        publicKeys: string,
        m: number
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createMultiSignMasterWalletWithPrivKey(
                [masterWalletId, privKey, payPassword, publicKeys, m, Util.getTimestamp()],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    createMultiSignMasterWalletWithMnemonic(
        masterWalletId: string,
        mnemonic: string,
        phrasePassword: string,
        payPassword: string,
        coSignersJson: string,
        requiredSignCount: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.createMultiSignMasterWalletWithMnemonic(
                [masterWalletId, mnemonic, phrasePassword, payPassword, coSignersJson, requiredSignCount],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    importWalletWithKeystore(
        masterWalletId: string,
        keystoreContent: string,
        backupPassword: string,
        payPassword: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.importWalletWithKeystore(
                [masterWalletId, keystoreContent, backupPassword, payPassword],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    importWalletWithMnemonic(
        masterWalletId: string,
        mnemonic: string,
        phrasePassword: string,
        payPassword,
        singleAddress: boolean
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            walletManager.importWalletWithMnemonic(
                [masterWalletId, mnemonic, phrasePassword, payPassword, singleAddress],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    getAllMasterWallets(): Promise<string[]> {
        return new Promise((resolve, reject)=>{
            Logger.log("wallet", "Getting all master wallets");

            walletManager.getAllMasterWallets([],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    destroyWallet(masterWalletId: string): Promise<void> {
        return new Promise((resolve, reject)=>{
            walletManager.destroyWallet([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getVersion(): Promise<string> {
        return new Promise((resolve, reject)=>{
            walletManager.getVersion([],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getMasterWalletBasicInfo(masterWalletId: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.getMasterWalletBasicInfo([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getAllSubWallets(masterWalletId: string): Promise<StandardCoinName[]> {
        return new Promise((resolve, reject)=>{
            walletManager.getAllSubWallets([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createSubWallet(masterWalletId: string, chainID: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.createSubWallet([masterWalletId, chainID],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    exportWalletWithKeystore(masterWalletId: string, backupPassWord: string, payPassword: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.exportWalletWithKeystore([masterWalletId, backupPassWord, payPassword],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    exportWalletWithMnemonic(masterWalletId: string, payPassWord: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.exportWalletWithMnemonic([masterWalletId, payPassWord],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    verifyPassPhrase(masterWalletId: string, passphrase: string, payPassword: string): Promise<void> {
      return new Promise((resolve, reject)=>{
          walletManager.verifyPassPhrase([masterWalletId, passphrase, payPassword],
              (ret) => { resolve(ret); },
              (err) => { this.handleError(err, reject);  });
      });
    }

    verifyPayPassword(masterWalletId: string, payPassword: string): Promise<void> {
      return new Promise((resolve, reject)=>{
          walletManager.verifyPayPassword([masterWalletId, payPassword],
              (ret) => { resolve(ret); },
              (err) => { this.handleError(err, reject);  });
      });
    }


    destroySubWallet(masterWalletId: string, chainId: string): Promise<any> {
        return new Promise((resolve, reject)=>{
            walletManager.destroySubWallet([masterWalletId, chainId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getPubKeyInfo(masterWalletId: string): Promise<void> {
      return new Promise((resolve, reject)=>{
          walletManager.getPubKeyInfo([masterWalletId],
              (ret) => { resolve(ret); },
              (err) => { this.handleError(err, reject);  });
      });
    }

    isAddressValid(masterWalletId: string, address: string): Promise<boolean> {
        return new Promise((resolve, reject)=>{
            walletManager.isAddressValid([masterWalletId, address],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    isSubWalletAddressValid(masterWalletId: string, chainID: string, address: string): Promise<boolean> {
        return new Promise((resolve, reject)=>{
            walletManager.isSubWalletAddressValid([masterWalletId, chainID, address],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getSupportedChains(masterWalletId: string): Promise<string[]> {
        return new Promise((resolve, reject)=>{
            walletManager.getSupportedChains([masterWalletId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    changePassword(masterWalletId: string, oldPassword: string, newPassword: string): Promise<void> {
        return new Promise((resolve, reject)=>{
            walletManager.changePassword([masterWalletId, oldPassword, newPassword],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createAddress(masterWalletId: string, chainId: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createAddress([masterWalletId, chainId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getAllAddresses(masterWalletId: string, chainId: string, start: number, count: number, internal: boolean): Promise<AllAddresses> {
        return new Promise(async (resolve, reject) => {
            walletManager.getAllAddress([masterWalletId, chainId, start, count, internal],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getLastAddresses(masterWalletId: string, chainId: string, internal: boolean): Promise<string[]> {
        return new Promise(async (resolve, reject) => {
            walletManager.getLastAddresses([masterWalletId, chainId, internal],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    updateUsedAddress(masterWalletId: string, chainId: string, usedAddress: string[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            walletManager.updateUsedAddress([masterWalletId, chainId, usedAddress],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getAllPublicKeys(masterWalletId: string, chainId: string, start: number, count: number): Promise<any> {
        return new Promise(async (resolve, reject) => {
            walletManager.getAllPublicKeys([masterWalletId, chainId, start, count],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    signTransaction(
        masterWalletId: string,
        chainId: string,
        rawTransaction: string,
        payPassword: string
    ): Promise<SignedTransaction> {
        return new Promise(async (resolve, reject) => {
            walletManager.signTransaction(
                [
                    masterWalletId,
                    chainId,
                    rawTransaction,
                    payPassword
                ],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getTransactionSignedInfo(
        masterWalletId: string,
        chainId: string,
        tx: string,
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.getTransactionSignedInfo(
                [
                    masterWalletId,
                    chainId,
                    tx,
                ],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    convertToRawTransaction(
        masterWalletId: string,
        chainId: string,
        tx: string,
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.convertToRawTransaction(
                [
                    masterWalletId,
                    chainId,
                    tx,
                ],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createWithdrawTransaction(masterWalletId: string, chainId: string, inputs: string, amount: string
        , mainchainAddress: string, fee: string, memo: string): Promise<string> {
            return new Promise(async (resolve, reject) => {
            walletManager.createWithdrawTransaction([masterWalletId, chainId, inputs, amount, mainchainAddress, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    // IDChainSubWallet

    createIdTransaction(masterWalletId: string, chainId: string, payloadJson: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createIdTransaction([masterWalletId, chainId, payloadJson, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    didSign(masterWalletId: string, did: string, message: string, payPassword: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.didSign([masterWalletId, did, message, payPassword],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    didSignDigest(masterWalletId: string, did: string, digest: string, payPassword: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.didSignDigest([masterWalletId, did, digest, payPassword],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createTransaction(
        masterWalletId: string,
        chainId: string,
        inputs: string,
        outputs: string,
        fee: string,
        memo: string
    ): Promise<any> {
        return new Promise(async (resolve, reject) => {
            walletManager.createTransaction(
                [
                    masterWalletId,
                    chainId,
                    inputs,
                    outputs,
                    fee,
                    memo
                ],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    // ETHSC
    createTransfer(
        masterWalletId: string,
        toAddress: string,
        amount: string,
        amountUnit: number,
        nonce: number
    ): Promise<any> {
        return new Promise(async (resolve, reject) => {
             walletManager.createTransfer(
                [
                    masterWalletId,
                    toAddress,
                    amount,
                    amountUnit,
                    nonce
                ],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    createTransferGeneric(
        masterWalletId: string,
        toAddress: string,
        amount: string,
        amountUnit: number,
        gasPrice: string,
        gasPriceUnit: number,
        gasLimit: string,
        data: string,
        nonce: number
    ): Promise<any> {
        return new Promise(async (resolve, reject) => {
             walletManager.createTransferGeneric(
                [
                    masterWalletId,
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
                (err) => { this.handleError(err, reject); });
        });
    }

    createDepositTransaction(
        masterWalletId: string,
        chainId: string,
        inputs: string,
        sideChainID: string,
        amount: string,
        sideChainAddress: string,
        lockAddress: string,
        fee: string,
        memo: string = ''
    ): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createDepositTransaction(
                [
                    masterWalletId,
                    chainId,
                    inputs,
                    sideChainID,
                    amount,
                    sideChainAddress,
                    lockAddress,
                    fee,
                    memo
                ],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
        });
    }

    createCancelProducerTransaction(masterWalletId: string, chainId: string, fromAddress: string, payloadJson: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createCancelProducerTransaction([masterWalletId, chainId, fromAddress, payloadJson, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createRegisterProducerTransaction(masterWalletId: string, chainId: string, fromAddress: string, payloadJson: string, amount: number, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createRegisterProducerTransaction([masterWalletId, chainId, fromAddress, payloadJson, amount, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    generateProducerPayload(masterWalletId: string, chainId: string, publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            walletManager.generateProducerPayload([masterWalletId, chainId, publicKey, nodePublicKey, nickname, url, IPAddress, location, payPasswd],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    generateCancelProducerPayload(masterWalletId: string, chainId: string, publicKey: string, payPasswd: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            walletManager.generateCancelProducerPayload([masterWalletId, chainId, publicKey, payPasswd],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createRetrieveDepositTransaction(masterWalletId: string, chainId: string, amount, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createRetrieveDepositTransaction([masterWalletId, chainId, amount, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createUpdateProducerTransaction(masterWalletId: string, chainId: string, fromAddress: string, payloadJson: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createUpdateProducerTransaction([masterWalletId, chainId, fromAddress, payloadJson, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    getOwnerPublicKey(masterWalletId: string, chainId: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.getOwnerPublicKey([masterWalletId, chainId],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    // CR
    generateCRInfoPayload(masterWalletId: string, chainId: string, publicKey: string,
        did: string, nickname: string, url: string, location: number): Promise<any> {
        return new Promise(async (resolve, reject) => {
            walletManager.generateCRInfoPayload([masterWalletId, chainId, publicKey, did, nickname, url, location],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    generateUnregisterCRPayload(masterWalletId: string, chainId: string, CID: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.generateUnregisterCRPayload([masterWalletId, chainId, CID],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createRegisterCRTransaction(masterWalletId: string, chainId: string, fromAddress: string, payloadJson: string, amount: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createRegisterCRTransaction([masterWalletId, chainId, fromAddress, payloadJson, amount, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createUpdateCRTransaction(masterWalletId: string, chainId: string, fromAddress: string, payloadJson: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createUpdateCRTransaction([masterWalletId, chainId, fromAddress, payloadJson, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createUnregisterCRTransaction(masterWalletId: string, chainId: string, fromAddress: string, payloadJson: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createUnregisterCRTransaction([masterWalletId, chainId, fromAddress, payloadJson, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createRetrieveCRDepositTransaction(masterWalletId: string, chainId: string, publicKey: string, amount: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createRetrieveCRDepositTransaction([masterWalletId, chainId, publicKey, amount, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createVoteTransaction(masterWalletId: string, chainId: string, inputs: string, voteContents: string, fee: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createVoteTransaction([masterWalletId, chainId, inputs, voteContents, fee, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    // CR proposal

    proposalOwnerDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalOwnerDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    proposalCRCouncilMemberDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalCRCouncilMemberDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createProposalTransaction(masterWalletId: string, chainId: string, payload: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createProposalTransaction([masterWalletId, chainId, payload, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    proposalReviewDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalReviewDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createProposalReviewTransaction(masterWalletId: string, chainId: string, payload: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createProposalReviewTransaction([masterWalletId, chainId, payload, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    proposalTrackingOwnerDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalTrackingOwnerDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    proposalTrackingNewOwnerDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalTrackingNewOwnerDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    proposalTrackingSecretaryDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalTrackingSecretaryDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    createProposalTrackingTransaction(masterWalletId: string, chainId: string, SecretaryGeneralSignedPayload: string, memo: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createProposalTrackingTransaction([masterWalletId, chainId, SecretaryGeneralSignedPayload, memo],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject);  });
        });
    }

    proposalWithdrawDigest(masterWalletId: string, chainId: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.proposalWithdrawDigest([masterWalletId, chainId, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); reject(err); });
        });
    }

    createProposalWithdrawTransaction(masterWalletId: string, chainId: string, recipient: string, amount: string, utxo: string, payload: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            walletManager.createProposalWithdrawTransaction([masterWalletId, chainId, recipient, amount, utxo, payload],
                (ret) => { resolve(ret); },
                (err) => { this.handleError(err, reject); });
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
    async handleError(err: any, promiseRejectHandler: (reason?: any)=>void) {
        await this.native.hideLoading();

        if (GlobalDIDSessionsService.signedInDIDString == null) {
          // Sign out
          Logger.warn('wallet', 'did sign out, Filter this error:', err);
          return;
        }
        Logger.error('wallet', err);

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
        if (err["code"] === 10003) {
            Logger.warn('wallet', 'Can\'t get the subwallt :', err);
            return;
        }

        // Show an error popup
        if (err["code"] === 20013) {
            let amount = err["Data"] / Config.SELA;
            this.popupProvider.ionicAlert_data('wallet.transaction-fail', error, amount);
        } else {
            this.popupProvider.ionicAlert('common.error', 'wallet.Error-' + err["code"]);
        }

        // Send a special error event
        if (err["code"] === 20036) {
            this.event.publish("error:update", err);
        } else if (err["code"] === 20028) {
            this.event.publish("error:destroySubWallet");
        } else {
            this.event.publish("error:update");
        }

        // The error has caught, Senty should not capture this exception
        err.type = 'skipsentry';

        if (promiseRejectHandler)
            promiseRejectHandler(err);
    }
}