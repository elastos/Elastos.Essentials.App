import { ELATransactionCoder } from "src/app/helpers/ela/ela.transaction.coder";
import { ELATransactionFactory } from "src/app/helpers/ela/ela.transaction.factory";
import { ELATransactionSigner } from "src/app/helpers/ela/ela.transaction.signer";
import Ela from "src/app/helpers/ledger/hw-app-ela/Ela";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { LedgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { LedgerSafe } from "src/app/wallet/model/safes/ledger.safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { VoteContent } from "src/app/wallet/services/spv.service";
import { WalletUIService } from "src/app/wallet/services/wallet.ui.service";
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { ElastosMainChainSafe } from "../mainchain.safe";

const LEDGER_UTXO_CONSOLIDATE_COUNT = 20; // Ledger: Starting UTXOs count to get TX size from
const MAX_TX_SIZE = 1000; // for Ledger, 1024 does not work correctly

export class MainChainLedgerSafe extends LedgerSafe implements ElastosMainChainSafe {
  private elaAddress = null;
  private publicKey = '';
  private addressPath = '';
  private txData;
  private unsignedTx;
  private signedTx;

  constructor(protected masterWallet: LedgerMasterWallet) {
    super(masterWallet);
    this.initELAAddress();
  }

  initELAAddress() {
    if (this.masterWallet.accountOptions) {
      let elaOption = this.masterWallet.accountOptions.find((option) => {
        return option.type === LedgerAccountType.ELA
      })
      if (elaOption) {
        this.elaAddress = elaOption.accountID;
        this.addressPath = elaOption.accountPath;
        this.publicKey = elaOption.publicKey;
      }
    }
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    if (this.elaAddress) {
      return Promise.resolve([this.elaAddress]);
    }
    else {
      return Promise.resolve(null);
    }
  }

  public getOwnerAddress(): Promise<string> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public getOwnerDepositAddress(): Promise<string> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public getOwnerPublicKey(): Promise<string> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public getPublicKeys(start: number, count: number, internal: boolean): Promise<string[]> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public async createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any> {
    Logger.warn('wallet', 'MainChainLedgerSafe createPaymentTransaction inputs:', inputs, ' outputs:', outputs, ' fee:', fee, ' memo:', memo)

    let tx = ELATransactionFactory.createUnsignedSendToTx(inputs, outputs[0].Address, outputs[0].Amount,
      this.publicKey, fee, '', memo);
    Logger.warn('wallet', 'createPaymentTransaction:', JSON.stringify(tx))
    return await tx;
  }

  public createVoteTransaction(inputs: UtxoForSDK[], voteContent: VoteContent[], fee: string, memo: string): Promise<any> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createDepositTransaction(inputs: UtxoForSDK[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public CRCouncilMemberClaimNodeDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createProposalChangeOwnerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public terminateProposalOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public terminateProposalCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createTerminateProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalSecretaryGeneralElectionDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createSecretaryGeneralElectionTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalChangeOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalChangeOwnerCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalTrackingSecretaryDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createProposalTrackingTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalReviewDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createProposalReviewTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalTrackingOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public proposalWithdrawDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createProposalWithdrawTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public reserveCustomIDOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public reserveCustomIDCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createReserveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public receiveCustomIDOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public receiveCustomIDCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createReceiveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public changeCustomIDFeeOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public changeCustomIDFeeCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createChangeCustomIDFeeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public registerSidechainOwnerDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public registerSidechainCRCouncilMemberDigest(payload: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createRegisterSidechainTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createRegisterProducerTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createCancelProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createUpdateProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any> {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createRetrieveDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public getCRDepositAddress() {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public generateUnregisterCRPayload(CID: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createRegisterCRTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createUnregisterCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createUpdateCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createRetrieveCRDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public createCRCouncilMemberClaimNodeTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return Promise.resolve(null);
  }

  public async signTransaction(subWallet: AnySubWallet, tx: any, transfer: Transfer): Promise<SignTransactionResult> {
    // TODO: use the elastos-mainchain-app ledger 'app' to talk to the ELA ledger app to sign
    this.txData = tx;

    this.unsignedTx = await ELATransactionCoder.encodeTx(tx, false);
    if (Math.ceil(this.unsignedTx.length / 2) > MAX_TX_SIZE) {
      Logger.warn('wallet', 'MainChainLedgerSafe createPaymentTransaction: TX size too big') // if TX size too big, try less UTXOs
    }

    let signTransactionResult: SignTransactionResult = {
      signedTransaction: null
    }

    // Wait for the ledger sign the transaction.
    let signed = await WalletUIService.instance.connectLedgerAndSignTransaction(this.masterWallet.deviceID, this)
    if (!signed) {
      Logger.log('ledger', "MainChainLedgerSafe::signTransaction can't connect to ledger or user canceled");
      return signTransactionResult;
    }

    signTransactionResult.signedTransaction = this.signedTx
    return signTransactionResult;
  }

  public async signTransactionByLedger(transport: BluetoothTransport) {
    const ela = new Ela(transport);
    let response = await ela.signTransaction(this.unsignedTx, this.addressPath);
    if (!response.success) {
      return ;
    }

    const signature = Buffer.from(response.signature, 'hex');
    this.signedTx = await ELATransactionSigner.addSignatureToTx(this.txData, this.publicKey, signature);
  }
}

