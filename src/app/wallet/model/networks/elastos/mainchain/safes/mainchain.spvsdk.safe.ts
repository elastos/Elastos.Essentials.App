import { Logger } from "src/app/logger";
import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { jsToSpvWalletId, PubKeyInfo, SPVService, VoteContent } from "src/app/wallet/services/spv.service";
import { SignTransactionResult } from "../../../../safes/safe.types";
import { SPVSDKSafe } from "../../../../safes/spvsdk.safe";
import { AnySubWallet } from "../../../base/subwallets/subwallet";
import { WalletJSSDKHelper } from "../../wallet.jssdk.helper";
import { ElastosMainChainSafe } from "./mainchain.safe";

export class MainChainSPVSDKSafe extends SPVSDKSafe implements ElastosMainChainSafe {
  public createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string) {
    return SPVService.instance.createTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      JSON.stringify(outputs),
      fee,
      memo
    );
  }

  public createVoteTransaction(inputs: UtxoForSDK[], voteContent: VoteContent[], fee: string, memo: string) {
    return SPVService.instance.createVoteTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      JSON.stringify(voteContent),
      fee,
      memo
    );
  }

  public createDepositTransaction(inputs: UtxoForSDK[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string) {
    return SPVService.instance.createDepositTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      1,
      JSON.stringify(inputs),
      toSubwalletId,
      amount,
      toAddress,
      lockAddress,
      fee,
      memo // User input memo
    );
  }

  public CRCouncilMemberClaimNodeDigest(payload: string) {
    return SPVService.instance.CRCouncilMemberClaimNodeDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public proposalOwnerDigest(payload: string) {
    return SPVService.instance.proposalOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public proposalCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.proposalCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createProposalTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public createProposalChangeOwnerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createProposalChangeOwnerTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public terminateProposalOwnerDigest(payload: string) {
    return SPVService.instance.terminateProposalOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public terminateProposalCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.terminateProposalCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createTerminateProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createTerminateProposalTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public proposalSecretaryGeneralElectionDigest(payload: string) {
    return SPVService.instance.proposalSecretaryGeneralElectionDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.proposalSecretaryGeneralElectionCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createSecretaryGeneralElectionTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createSecretaryGeneralElectionTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public proposalChangeOwnerDigest(payload: string) {
    return SPVService.instance.proposalChangeOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public proposalChangeOwnerCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.proposalChangeOwnerCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public proposalTrackingSecretaryDigest(payload: string) {
    return SPVService.instance.proposalTrackingSecretaryDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createProposalTrackingTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createProposalTrackingTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public proposalReviewDigest(payload: string) {
    return SPVService.instance.proposalReviewDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createProposalReviewTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createProposalReviewTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public proposalTrackingOwnerDigest(payload: string) {
    return SPVService.instance.proposalTrackingOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public proposalWithdrawDigest(payload: string) {
    return SPVService.instance.proposalWithdrawDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createProposalWithdrawTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createProposalWithdrawTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public reserveCustomIDOwnerDigest(payload: string) {
    return SPVService.instance.reserveCustomIDOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public reserveCustomIDCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.reserveCustomIDCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createReserveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createReserveCustomIDTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public receiveCustomIDOwnerDigest(payload: string) {
    return SPVService.instance.receiveCustomIDOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public receiveCustomIDCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.receiveCustomIDCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createReceiveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createReceiveCustomIDTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public changeCustomIDFeeOwnerDigest(payload: string) {
    return SPVService.instance.changeCustomIDFeeOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public changeCustomIDFeeCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.changeCustomIDFeeCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createChangeCustomIDFeeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createChangeCustomIDFeeTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public registerSidechainOwnerDigest(payload: string) {
    return SPVService.instance.registerSidechainOwnerDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public registerSidechainCRCouncilMemberDigest(payload: string) {
    return SPVService.instance.registerSidechainCRCouncilMemberDigest(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      payload
    );
  }

  public createRegisterSidechainTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createRegisterSidechainTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  //dpos registration transaction functions
  public createRegisterProducerTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string) {
    return SPVService.instance.createRegisterProducerTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      amount,
      fee,
      memo
    );
  }

  public createCancelProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createCancelProducerTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public createUpdateProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createUpdateProducerTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any> {
    return SPVService.instance.generateProducerPayload(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      publicKey,
      nodePublicKey,
      nickname,
      url,
      IPAddress,
      location,
      payPasswd
    );
  }

  public generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any> {
    return SPVService.instance.generateCancelProducerPayload(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      publicKey,
      payPasswd
    );
  }

  public createRetrieveDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    return SPVService.instance.createRetrieveDepositTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      amount,
      fee,
      memo
    );
  }

  // CR registration transaction functions
  public getCRDepositAddress() {
    return SPVService.instance.getCRDepositAddress(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId
    );
  }

  public generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number) {
    return SPVService.instance.generateCRInfoPayload(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      publicKey,
      did,
      nickname,
      url,
      location
    );
  }

  public generateUnregisterCRPayload(CID: string) {
    return SPVService.instance.generateUnregisterCRPayload(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      CID
    );
  }


  public createRegisterCRTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string) {
    return SPVService.instance.createRegisterCRTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      amount,
      fee,
      memo
    );
  }

  public createUnregisterCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createUnregisterCRTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public createUpdateCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createUpdateCRTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public createRetrieveCRDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string) {
    return SPVService.instance.createRetrieveCRDepositTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      amount,
      fee,
      memo
    );
  }

  public createCRCouncilMemberClaimNodeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string) {
    return SPVService.instance.createCRCouncilMemberClaimNodeTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      JSON.stringify(inputs),
      payload,
      fee,
      memo
    );
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: string, transfer: Transfer): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(subWallet, rawTransaction, transfer);

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    // For mainchain, the signed created transaction is a json string.
    // We must convert it to a raw transaction first before publishing it.
    // So the real "sign transaction" format is the raw transaction

    // TODO: move this conversion to convertSignedTransactionToPublishableTransaction()

    let rawSignedTransaction = await SPVService.instance.convertToRawTransaction(
      jsToSpvWalletId(this.masterWallet.id),
      this.chainId,
      txResult.signedTransaction);

    return {
      signedTransaction: rawSignedTransaction
    }
  }

  public getOwnerAddress(): Promise<string> {
    return SPVService.instance.getOwnerAddress(jsToSpvWalletId(this.masterWallet.id), this.chainId);
  }

  public getOwnerDepositAddress(): Promise<string> {
    return SPVService.instance.getOwnerDepositAddress(jsToSpvWalletId(this.masterWallet.id), this.chainId);
  }

  public getOwnerPublicKey(): Promise<string> {
    return SPVService.instance.getOwnerPublicKey(jsToSpvWalletId(this.masterWallet.id), this.chainId);
  }

  public getPublicKeys(start: number, count: number, internal: boolean): Promise<string[]> {
    return SPVService.instance.getPublicKeys(jsToSpvWalletId(this.masterWallet.id), this.chainId, start, count, internal);
  }

  /**
   * -----
   * BIP45 WARNING
   * -----
   *
   * IMPORTANT NOTE:
   * - Historically, ELA mainchain wallets in the SPVSDK use BIP44 derivation which is a mistake, they should
   * use BIP45.
   * - ELA mainchain multisig implementation inside Essentials uses BIP45 as as such, they require signing wallets
   * to provide BIP45 xpubs.
   * - It was agreed with the elastos blockchain team that stopping to push this error (BIP44 legacy) was the best
   * thing to do.
   * - getExtendedPublicKey() is for now used only by multisig, so we use the seed to get the BIP45 xpub here,
   * not the BIP44 one that the native SPVSDK could return to us.
   */
  public async getExtendedPublicKey(): Promise<string> {
    try {
      await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet);

      let sdkMasterWallet = await WalletJSSDKHelper.loadMasterWalletFromJSWallet(this.masterWallet);
      if (!sdkMasterWallet)
        return null;

      let pubKeyInfo = <PubKeyInfo>sdkMasterWallet.getPubKeyInfo();

      return pubKeyInfo.xPubKeyHDPM; // BIP45 !
    }
    catch (e) {
      Logger.error("wallet", "SPVSDK safe getExtendedPublicKey() error:", e);
    }
  }
}