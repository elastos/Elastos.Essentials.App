import type {
    CancelProducerInfo, ChangeCustomIDFeeOwnerInfo, ChangeProposalOwnerInfo, CRCouncilMemberClaimNodeInfo,
    CRCProposalInfo, CRCProposalReviewInfo, CRCProposalTrackingInfo, CRCProposalWithdrawInfo,
    CRInfoJson, DPoSV2ClaimRewardInfo, EncodedTx, MainchainSubWallet as SDKMainchainSubWallet,
    MasterWallet as SDKMasterWallet, NormalProposalOwnerInfo, PayloadStakeInfo, ProducerInfoJson, PublickeysInfo, ReceiveCustomIDOwnerInfo,
    RegisterSidechainProposalInfo, ReserveCustomIDOwnerInfo, SecretaryElectionInfo, TerminateProposalOwnerInfo,
    UnstakeInfo, UTXOInput, VoteContentInfo, VotingInfo
} from "@elastosfoundation/wallet-js-sdk";
import { Transaction } from "@elastosfoundation/wallet-js-sdk/typings/transactions/Transaction";
import moment from "moment";
import { md5 } from "src/app/helpers/crypto/md5";
import { lazyElastosWalletSDKImport } from "src/app/helpers/import.helper";
import { Logger } from "src/app/logger";
import { JSONObject } from "src/app/model/json";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { PubKeyInfo } from "src/app/wallet/model/elastos.types";
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { MultiSigSafe } from "src/app/wallet/model/safes/multisig.safe";
import { SignTransactionErrorType, SignTransactionResult } from 'src/app/wallet/model/safes/safe.types';
import { AnyOfflineTransaction, OfflineTransaction, OfflineTransactionType, Outputs } from 'src/app/wallet/model/tx-providers/transaction.types';
import { CoinTxInfoParams } from "src/app/wallet/pages/wallet/coin/coin-tx-info/coin-tx-info.page";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { OfflineTransactionsService } from "src/app/wallet/services/offlinetransactions.service";
import { Native } from "../../../../../../services/native.service";
import { Safe } from "../../../../../safes/safe";
import { AnyNetworkWallet } from '../../../../base/networkwallets/networkwallet';
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { WalletJSSDKHelper } from '../../../wallet.jssdk.helper';
import { ElastosMainChainSafe } from '../mainchain.safe';

export class MainChainMultiSigSafe extends Safe implements ElastosMainChainSafe, MultiSigSafe {
  private sdkMasterWallet: SDKMasterWallet = null;
  private elaSubWallet: SDKMainchainSubWallet = null;

  constructor(protected masterWallet: StandardMultiSigMasterWallet) {
    super(masterWallet);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    if (!await WalletJSSDKHelper.maybeCreateStandardMultiSigWalletFromJSWallet(this.masterWallet))
      return;

    this.sdkMasterWallet = await WalletJSSDKHelper.loadMasterWalletFromJSWallet(this.masterWallet);
    this.elaSubWallet = <SDKMainchainSubWallet>this.sdkMasterWallet.getSubWallet("ELA");

    return super.initialize(networkWallet);
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
    return <string[]>this.elaSubWallet.getAddresses(startIndex, count, internalAddresses);
  }

  public getOwnerAddress(): string {
    // No ownerAddress for multi-sign wallet.
    return null;
  }

  public getOwnerDepositAddress(): string {
    return this.elaSubWallet.getOwnerDepositAddress()
  }

  public getOwnerStakeAddress(): string {
    return this.elaSubWallet.getOwnerStakeAddress();
  }

  public getCodeofOwnerStakeAddress(): string {
    return this.elaSubWallet.getCodeofOwnerStakeAddress();
  }

  public getCodeofOwnerAddress(): string {
    // No ownerAddress for multi-sign wallet.
    return null;
  }

  public getOwnerPublicKey(): string {
    return this.elaSubWallet.getOwnerPublicKey();
  }

  public getPublicKeys(start: number, count: number, internal: boolean): string[] | PublickeysInfo {
    return this.elaSubWallet.getPublicKeys(start, count, internal);
  }

  public signDigest(address: string, digest: string, passwd: string): Promise<string> {
    // TODO: Do not support.
    return null;
  }

  public signDigestWithOwnerKey(digest: string, passwd: string): Promise<string> {
    // TODO: Do not support.
    return null;
  }

  public verifyDigest(publicKey: string, digest: string, signature: string): boolean {
    // TODO: Do not support.
    return null;
  }

  public async createPaymentTransaction(inputs: UTXOInput[], outputs: Outputs[], fee: string, memo: string): Promise<any> {
    const tx = this.elaSubWallet.createTransaction(inputs, outputs, fee, memo);
    Logger.log("wallet", "Created multisig transaction", tx);

    return await tx;
  }

  public createVoteTransaction(inputs: UTXOInput[], voteContent: VoteContentInfo[], fee: string, memo: string): Promise<any> {
    // TODO: Do not support.
    return null;
  }

  public async createDepositTransaction(inputs: UTXOInput[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string): Promise<any> {
    const tx = this.elaSubWallet.createDepositTransaction(1, inputs, toSubwalletId, amount, toAddress, lockAddress, fee, memo);
    Logger.log("wallet", "Created multisig deposit transaction", tx);

    return await tx;
  }

  public CRCouncilMemberClaimNodeDigest(payload: CRCouncilMemberClaimNodeInfo, version: number) {
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

  public createProposalTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createProposalChangeOwnerTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
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

  public createTerminateProposalTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
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

  public createSecretaryGeneralElectionTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
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

  public createProposalTrackingTransaction(inputs: UTXOInput[], payload: CRCProposalTrackingInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public proposalReviewDigest(payload: CRCProposalReviewInfo) {
    // TODO: Do not support.
    return null;
  }

  public createProposalReviewTransaction(inputs: UTXOInput[], payload: CRCProposalReviewInfo, fee: string, memo: string) {
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

  public createProposalWithdrawTransaction(inputs: UTXOInput[], payload: CRCProposalWithdrawInfo, fee: string, memo: string) {
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

  public createReserveCustomIDTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
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

  public createReceiveCustomIDTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
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

  public createChangeCustomIDFeeTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
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

  public createRegisterSidechainTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createRegisterProducerTransaction(inputs: UTXOInput[], payload: ProducerInfoJson, amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createCancelProducerTransaction(inputs: UTXOInput[], payload: CancelProducerInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createUpdateProducerTransaction(inputs: UTXOInput[], payload: ProducerInfoJson, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string, stakeUntil = 0): Promise<any> {
    // TODO: Do not support.
    return null;
  }

  public generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any> {
    // TODO: Do not support.
    return null;
  }

  public createRetrieveDepositTransaction(inputs: UTXOInput[], amount: string, fee: string, memo: string) {
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

  public createRegisterCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createUnregisterCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createUpdateCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createRetrieveCRDepositTransaction(inputs: UTXOInput[], amount: string, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  public createCRCouncilMemberClaimNodeTransaction(version: number, inputs: UTXOInput[], payload: CRCouncilMemberClaimNodeInfo, fee: string, memo: string) {
    // TODO: Do not support.
    return null;
  }

  //Dpos 2.0
  public createStakeTransaction(inputs: UTXOInput[], payload: PayloadStakeInfo, lockAddress: string, amount: string, fee: string, memo: string): EncodedTx {
    return this.elaSubWallet.createStakeTransaction(inputs, payload, lockAddress, amount, fee, memo);
  }

  public createDPoSV2VoteTransaction(inputs: UTXOInput[], payload: VotingInfo, fee: string, memo: string): EncodedTx {
    return this.elaSubWallet.createDPoSV2VoteTransaction(inputs, payload, fee, memo);
  }

  public getDPoSV2ClaimRewardDigest(payload: DPoSV2ClaimRewardInfo): string {
    return this.elaSubWallet.getDPoSV2ClaimRewardDigest(payload);
  }

  public createDPoSV2ClaimRewardTransaction(inputs: UTXOInput[], payload: DPoSV2ClaimRewardInfo, fee: string, memo: string): EncodedTx {
    return this.elaSubWallet.createDPoSV2ClaimRewardTransaction(inputs, payload, fee, memo);
  }

  public unstakeDigest(payload: UnstakeInfo): string {
    return this.elaSubWallet.unstakeDigest(payload);
  }

  public createUnstakeTransaction(inputs: UTXOInput[], payload: UnstakeInfo, fee: string, memo: string): EncodedTx {
    return this.elaSubWallet.createUnstakeTransaction(inputs, payload, fee, memo);
  }

  public async signTransaction(subWallet: AnySubWallet, rawTx: JSONObject, transfer: Transfer): Promise<SignTransactionResult> {
    // DEBUG
    //await OfflineTransactionsService.instance.debugRemoveTransactions(subWallet);

    // Transaction key is a md5 of the raw transaction.
    let transactionKey = md5(Buffer.from(JSON.stringify(rawTx)));

    Logger.log("wallet", "Creating offline transaction for the multisig signTransaction() request", rawTx);

    let offlineTransaction: OfflineTransaction<any> = {
      transactionKey,
      type: OfflineTransactionType.MULTI_SIG_STANDARD,
      updated: moment().unix(),
      rawTx
    };
    await OfflineTransactionsService.instance.storeTransaction(subWallet, offlineTransaction);

    Logger.log("wallet", "Multisig safe created an initial offline transaction:", offlineTransaction);

    let params: CoinTxInfoParams = {
      masterWalletId: this.networkWallet.id,
      subWalletId: subWallet.id,
      offlineTransaction
    };
    GlobalNavService.instance.clearIntermediateRoutes(["/wallet/coin-transfer"]); // Don't allow to come back to the payment screen
    Native.instance.go("/wallet/coin-tx-info", params);

    return {
      errorType: SignTransactionErrorType.DELEGATED
    };
  }

  private getSigningWalletXPubKey(): string {
    let pubKeyInfo = <PubKeyInfo>this.sdkMasterWallet.getPubKeyInfo();
    console.log("hasSigningWalletSigned", "pubKeyInfo", pubKeyInfo)
    return pubKeyInfo.xPubKeyHDPM;
  }

  public hasSigningWalletSigned(tx: any): Promise<boolean> {
    return this.hasCosignerSigned(this.getSigningWalletXPubKey(), tx);
  }

  public async hasCosignerSigned(xpub: string, tx: any): Promise<boolean> {
    // Including the user himself in the list, as a "cosigner"
    let allXPubs = [
      this.getSigningWalletXPubKey(),
      ...(<StandardMultiSigMasterWallet>this.masterWallet).signersExtPubKeys
    ]

    let signers = this.elaSubWallet.matchSigningPublicKeys(tx, allXPubs, false);
    console.log("signers", signers)
    let matchingCosigner = signers.find(s => s.xPubKey === xpub);
    if (!matchingCosigner)
      return false; // Should not happen

    return await matchingCosigner.signed;
  }

  public async convertSignedTransactionToPublishableTransaction(subWallet: AnySubWallet, signedTx: string): Promise<string> {
    return await this.elaSubWallet.convertToRawTransaction(JSON.parse(signedTx));
  }

  public async signTransactionReal(subWallet: AnySubWallet, rawTx: any): Promise<SignTransactionResult> {
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword) {
      return {
        errorType: SignTransactionErrorType.CANCELLED
      }; // Can't continue without the wallet password
    }

    try {
      let sdkRawTransaction = this.elaSubWallet.convertToRawTransaction(rawTx); // Only for logs
      Logger.log("wallet", "Multisig safe signTransactionReal() sdkRawTransaction:", sdkRawTransaction);

      let signedTx = await this.elaSubWallet.signTransaction(rawTx, payPassword);
      Logger.log("wallet", "Multisig safe transaction signature result:", signedTx);
      return {
        signedTransaction: JSON.stringify(signedTx)
      }
    }
    catch (e) {
      const { WalletErrorException } = await lazyElastosWalletSDKImport();
      if (e instanceof WalletErrorException && e.code === 20046) { // AlreadySigned
        Logger.warn("wallet", "Transaction was already signed, returning the original transaction as 'signed'.", rawTx);
        return {
          signedTransaction: JSON.stringify(rawTx)
        }
      }
      else {
        return {
          errorType: SignTransactionErrorType.FAILURE
        }
      }
    }
  }

  public async hasEnoughSignaturesToPublish(signedTx: any): Promise<boolean> {
    try {
      // getTransactionSignedInfo() returns one entry per transaction input address (program)
      // Each entry contains en array of signers.
      // Normally, all programs are always signed by a cosigner at the same time so we check the first entry's
      // signers size to know how many cosigners have signed te transaction.
      let signedInfo = this.elaSubWallet.getTransactionSignedInfo(signedTx) as { Signers: string[] }[];
      if (!signedInfo || signedInfo.length === 0)
        return false;

      return signedInfo[0].Signers.length >= (<StandardMultiSigMasterWallet>this.masterWallet).requiredSigners;
    }
    catch (e) {
      Logger.error("wallet", "Multisig safe hasEnoughSignaturesToPublish() error:", e);
      return await false;
    }
  }

  /**
   * The "hash" part of a transaction doesn't change after signing, so this method can be used
   * for unsigned transactions, or partly signed ones.
   * The returns "hash" corresponds to the txid on chain.
   */
  public async getOfflineTransaction(offlineTransaction: AnyOfflineTransaction): Promise<Transaction> {
    try {
      return await this.elaSubWallet.decodeTx(offlineTransaction.rawTx);
    } catch (e) {
      Logger.error("wallet", "Multisig safe: getOfflineTransaction() error:", e);
    }
  }
}