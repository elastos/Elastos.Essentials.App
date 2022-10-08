import { ChangeCustomIDFeeOwnerInfo, ChangeProposalOwnerInfo, CRCouncilMemberClaimNodeInfo, CRCProposalInfo, CRCProposalReviewInfo, CRCProposalTrackingInfo, CRCProposalWithdrawInfo, CRInfoJson, NormalProposalOwnerInfo, ReceiveCustomIDOwnerInfo, RegisterSidechainProposalInfo, ReserveCustomIDOwnerInfo, SecretaryElectionInfo, TerminateProposalOwnerInfo } from "@elastosfoundation/wallet-js-sdk";
import { CancelProducerInfo } from "@elastosfoundation/wallet-js-sdk/typings/transactions/payload/CancelProducer";
import { ProducerInfoJson } from "@elastosfoundation/wallet-js-sdk/typings/transactions/payload/ProducerInfo";
import { ELATransactionCoder } from "src/app/helpers/ela/ela.transaction.coder";
import { ELATransactionFactory } from "src/app/helpers/ela/ela.transaction.factory";
import { ELATransactionSigner } from "src/app/helpers/ela/ela.transaction.signer";
import Ela from "src/app/helpers/ledger/hw-app-ela/Ela";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { VoteContent } from "src/app/wallet/model/elastos.types";
import { LedgerAccountType } from "src/app/wallet/model/ledger.types";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { LedgerSafe } from "src/app/wallet/model/safes/ledger.safe";
import { SignTransactionResult } from "src/app/wallet/model/safes/safe.types";
import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
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
      return null;
    }
  }

  public getOwnerAddress(): string {
    // TODO: Do not support.
    return null;
  }

  public getOwnerDepositAddress(): string {
    // TODO: Do not support.
    return null;
  }

  public getOwnerPublicKey(): string {
    // TODO: Do not support.
    return null;
  }

  public getPublicKeys(start: number, count: number, internal: boolean): string[] {
    // TODO: Do not support.
    return null;
  }

  public async createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any> {
    Logger.log('wallet', 'MainChainLedgerSafe createPaymentTransaction inputs:', inputs, ' outputs:', outputs, ' fee:', fee, ' memo:', memo)

    let tx = await ELATransactionFactory.createUnsignedSendToTx(inputs, outputs[0].Address, outputs[0].Amount,
      this.publicKey, fee, '', memo);
    Logger.log('wallet', 'createPaymentTransaction:', JSON.stringify(tx))
    return tx;
  }

  public createVoteTransaction(inputs: UtxoForSDK[], voteContent: VoteContent[], fee: string, memo: string): Promise<any> {
    // TODO: Do not support.
    return null;
  }

  public createDepositTransaction(inputs: UtxoForSDK[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public CRCouncilMemberClaimNodeDigest(payload: CRCouncilMemberClaimNodeInfo) {
    // TODO: Do not support.
    return null;
  }

  public proposalOwnerDigest(payload: NormalProposalOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public proposalCRCouncilMemberDigest(payload: NormalProposalOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public createProposalTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createProposalChangeOwnerTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public terminateProposalOwnerDigest(payload: TerminateProposalOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public terminateProposalCRCouncilMemberDigest(payload: TerminateProposalOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public createTerminateProposalTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public proposalSecretaryGeneralElectionDigest(payload: SecretaryElectionInfo) {
    // TODO: Do not support.
    return null;
  }

  public proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: SecretaryElectionInfo) {
    // TODO: Do not support.
    return null;
  }

  public createSecretaryGeneralElectionTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public proposalChangeOwnerDigest(payload: ChangeProposalOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public proposalChangeOwnerCRCouncilMemberDigest(payload: ChangeProposalOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public proposalTrackingSecretaryDigest(payload: CRCProposalTrackingInfo) {
    // TODO: Do not support.
    return null;
  }

  public createProposalTrackingTransaction(inputs: UtxoForSDK[], payload: CRCProposalTrackingInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public proposalReviewDigest(payload: CRCProposalReviewInfo) {
    // TODO: Do not support.
    return null;
  }

  public createProposalReviewTransaction(inputs: UtxoForSDK[], payload: CRCProposalReviewInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public proposalTrackingOwnerDigest(payload: CRCProposalTrackingInfo) {
    // TODO: Do not support.
    return null;
  }

  public proposalWithdrawDigest(payload: CRCProposalWithdrawInfo) {
    // TODO: Do not support.
    return null;
  }

  public createProposalWithdrawTransaction(inputs: UtxoForSDK[], payload: CRCProposalWithdrawInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public reserveCustomIDOwnerDigest(payload: ReserveCustomIDOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public reserveCustomIDCRCouncilMemberDigest(payload: ReserveCustomIDOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public createReserveCustomIDTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public receiveCustomIDOwnerDigest(payload: ReceiveCustomIDOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public receiveCustomIDCRCouncilMemberDigest(payload: ReceiveCustomIDOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public createReceiveCustomIDTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public changeCustomIDFeeOwnerDigest(payload: ChangeCustomIDFeeOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public changeCustomIDFeeCRCouncilMemberDigest(payload: ChangeCustomIDFeeOwnerInfo) {
    // TODO: Do not support.
    return null;
  }

  public createChangeCustomIDFeeTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public registerSidechainOwnerDigest(payload: RegisterSidechainProposalInfo) {
    // TODO: Do not support.
    return null;
  }

  public registerSidechainCRCouncilMemberDigest(payload: RegisterSidechainProposalInfo) {
    // TODO: Do not support.
    return null;
  }

  public createRegisterSidechainTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createRegisterProducerTransaction(inputs: UtxoForSDK[], payload: ProducerInfoJson, amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createCancelProducerTransaction(inputs: UtxoForSDK[], payload: CancelProducerInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createUpdateProducerTransaction(inputs: UtxoForSDK[], payload: ProducerInfoJson, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any> {
    // TODO: Do not support.
    return null;
  }

  public generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any> {
    // TODO: Do not support.
    return null;
  }

  public createRetrieveDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public getCRDepositAddress() {
    // TODO: Do not support.
    return null;
  }

  public generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number) {
    // TODO: Do not support.
    return null;
  }

  public generateUnregisterCRPayload(CID: string) {
    // TODO: Do not support.
    return null;
  }

  public createRegisterCRTransaction(inputs: UtxoForSDK[], payload: CRInfoJson, amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createUnregisterCRTransaction(inputs: UtxoForSDK[], payload: CRInfoJson, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createUpdateCRTransaction(inputs: UtxoForSDK[], payload: CRInfoJson, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createRetrieveCRDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createCRCouncilMemberClaimNodeTransaction(inputs: UtxoForSDK[], payload: CRCouncilMemberClaimNodeInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
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

