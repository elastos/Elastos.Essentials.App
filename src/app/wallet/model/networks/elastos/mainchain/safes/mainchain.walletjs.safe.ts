import type {
    CancelProducerInfo, ChangeCustomIDFeeOwnerInfo, ChangeProposalOwnerInfo, CRCouncilMemberClaimNodeInfo,
    CRCProposalInfo, CRCProposalReviewInfo, CRCProposalTrackingInfo, CRCProposalWithdrawInfo,
    CRInfoJson, DPoSV2ClaimRewardInfo, EncodedTx, json, MainchainSubWallet, NormalProposalOwnerInfo,
    PayloadStakeInfo, ProducerInfoJson, PublickeysInfo, ReceiveCustomIDOwnerInfo, RegisterSidechainProposalInfo, ReserveCustomIDOwnerInfo,
    SecretaryElectionInfo, TerminateProposalOwnerInfo, UnstakeInfo, UTXOInput, VoteContentInfo, VotingInfo
} from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { PubKeyInfo } from "src/app/wallet/model/elastos.types";
import { WalletJSSafe } from "src/app/wallet/model/safes/walletjs.safe";
import { Outputs } from "src/app/wallet/model/tx-providers/transaction.types";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { SignTransactionResult } from "../../../../safes/safe.types";
import { AnySubWallet } from "../../../base/subwallets/subwallet";
import { ElastosMainChainSafe } from "./mainchain.safe";

export class MainChainWalletJSSafe extends WalletJSSafe implements ElastosMainChainSafe {
  public async createPaymentTransaction(inputs: UTXOInput[], outputs: Outputs[], fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createTransaction(
      inputs,
      outputs,
      fee,
      memo
    );
  }

  public async createVoteTransaction(inputs: UTXOInput[], voteContent: VoteContentInfo[], fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createVoteTransaction(
      inputs,
      voteContent,
      fee,
      memo
    );
  }

  public async createDepositTransaction(inputs: UTXOInput[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createDepositTransaction(
      1,
      inputs,
      toSubwalletId,
      amount,
      toAddress,
      lockAddress,
      fee,
      memo // User input memo
    );
  }

  public CRCouncilMemberClaimNodeDigest(payload: CRCouncilMemberClaimNodeInfo, version: number) {
    return (<MainchainSubWallet>this.sdkSubWallet).crCouncilMemberClaimNodeDigest(
      payload,
      version
    );
  }

  public proposalOwnerDigest(payload: NormalProposalOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalOwnerDigest(payload);
  }

  public proposalCRCouncilMemberDigest(payload: NormalProposalOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalCRCouncilMemberDigest(
      payload
    );
  }

  public async createProposalTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createProposalTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public async createProposalChangeOwnerTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createProposalChangeOwnerTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public terminateProposalOwnerDigest(payload: TerminateProposalOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).terminateProposalOwnerDigest(
      payload
    );
  }

  public terminateProposalCRCouncilMemberDigest(payload: TerminateProposalOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).terminateProposalCRCouncilMemberDigest(
      payload
    );
  }

  public async createTerminateProposalTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createTerminateProposalTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public proposalSecretaryGeneralElectionDigest(payload: SecretaryElectionInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalSecretaryGeneralElectionDigest(
      payload
    );
  }

  public proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: SecretaryElectionInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalSecretaryGeneralElectionCRCouncilMemberDigest(
      payload
    );
  }

  public async createSecretaryGeneralElectionTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createSecretaryGeneralElectionTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public proposalChangeOwnerDigest(payload: ChangeProposalOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalChangeOwnerDigest(
      payload
    );
  }

  public proposalChangeOwnerCRCouncilMemberDigest(payload: ChangeProposalOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalChangeOwnerCRCouncilMemberDigest(
      payload
    );
  }

  public proposalTrackingSecretaryDigest(payload: CRCProposalTrackingInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalTrackingSecretaryDigest(
      payload
    );
  }

  public async createProposalTrackingTransaction(inputs: UTXOInput[], payload: CRCProposalTrackingInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createProposalTrackingTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public proposalReviewDigest(payload: CRCProposalReviewInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalReviewDigest(
      payload
    );
  }

  public async createProposalReviewTransaction(inputs: UTXOInput[], payload: CRCProposalReviewInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createProposalReviewTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public proposalTrackingOwnerDigest(payload: CRCProposalTrackingInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalTrackingOwnerDigest(
      payload
    );
  }

  public proposalWithdrawDigest(payload: CRCProposalWithdrawInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).proposalWithdrawDigest(
      payload
    );
  }

  public async createProposalWithdrawTransaction(inputs: UTXOInput[], payload: CRCProposalWithdrawInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createProposalWithdrawTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public reserveCustomIDOwnerDigest(payload: ReserveCustomIDOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).reserveCustomIDOwnerDigest(
      payload
    );
  }

  public reserveCustomIDCRCouncilMemberDigest(payload: ReserveCustomIDOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).reserveCustomIDCRCouncilMemberDigest(
      payload
    );
  }

  public async createReserveCustomIDTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createReserveCustomIDTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public receiveCustomIDOwnerDigest(payload: ReceiveCustomIDOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).receiveCustomIDOwnerDigest(
      payload
    );
  }

  public receiveCustomIDCRCouncilMemberDigest(payload: ReceiveCustomIDOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).receiveCustomIDCRCouncilMemberDigest(
      payload
    );
  }

  public async createReceiveCustomIDTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createReceiveCustomIDTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public changeCustomIDFeeOwnerDigest(payload: ChangeCustomIDFeeOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).changeCustomIDFeeOwnerDigest(
      payload
    );
  }

  public changeCustomIDFeeCRCouncilMemberDigest(payload: ChangeCustomIDFeeOwnerInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).changeCustomIDFeeCRCouncilMemberDigest(
      payload
    );
  }

  public async createChangeCustomIDFeeTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createChangeCustomIDFeeTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public registerSidechainOwnerDigest(payload: RegisterSidechainProposalInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).registerSidechainOwnerDigest(
      payload
    );
  }

  public registerSidechainCRCouncilMemberDigest(payload: RegisterSidechainProposalInfo) {
    return (<MainchainSubWallet>this.sdkSubWallet).registerSidechainCRCouncilMemberDigest(
      payload
    );
  }

  public async createRegisterSidechainTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createRegisterSidechainTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  //dpos registration transaction functions
  public async createRegisterProducerTransaction(inputs: UTXOInput[], payload: ProducerInfoJson, amount: string, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createRegisterProducerTransaction(
      inputs,
      payload,
      amount,
      fee,
      memo
    );
  }

  public async createCancelProducerTransaction(inputs: UTXOInput[], payload: CancelProducerInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createCancelProducerTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public async createUpdateProducerTransaction(inputs: UTXOInput[], payload: ProducerInfoJson, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createUpdateProducerTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public async generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string, stakeUntil = 0): Promise<any> {
    return await (<MainchainSubWallet>this.sdkSubWallet).generateProducerPayload(
      publicKey,
      nodePublicKey,
      nickname,
      url,
      IPAddress,
      location.toString(),
      stakeUntil, // stakeUntil:The block height when your staking expires. It is required in BPoS version.
      payPasswd,
    );
  }

  public async generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any> {
    return await (<MainchainSubWallet>this.sdkSubWallet).generateCancelProducerPayload(
      publicKey,
      payPasswd
    );
  }

  public async createRetrieveDepositTransaction(inputs: UTXOInput[], amount: string, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createRetrieveDepositTransaction(
      inputs,
      amount,
      fee,
      memo
    );
  }

  // CR registration transaction functions
  public getCRDepositAddress() {
    return (<MainchainSubWallet>this.sdkSubWallet).getCRDepositAddress();
  }

  public generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number) {
    return (<MainchainSubWallet>this.sdkSubWallet).generateCRInfoPayload(
      publicKey,
      did,
      nickname,
      url,
      location.toString()
    );
  }

  public generateUnregisterCRPayload(CID: string) {
    return (<MainchainSubWallet>this.sdkSubWallet).generateUnregisterCRPayload(
      CID
    );
  }


  public async createRegisterCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, amount: string, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createRegisterCRTransaction(
      inputs,
      payload,
      amount,
      fee,
      memo
    );
  }

  public async createUnregisterCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createUnregisterCRTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public async createUpdateCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createUpdateCRTransaction(
      inputs,
      payload,
      fee,
      memo
    );
  }

  public async createRetrieveCRDepositTransaction(inputs: UTXOInput[], amount: string, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createRetrieveCRDepositTransaction(
      inputs,
      amount,
      fee,
      memo
    );
  }

  public async createCRCouncilMemberClaimNodeTransaction(version: number, inputs: UTXOInput[], payload: CRCouncilMemberClaimNodeInfo, fee: string, memo: string) {
    return await (<MainchainSubWallet>this.sdkSubWallet).createCRCouncilMemberClaimNodeTransaction(
      version,
      inputs,
      payload,
      fee,
      memo
    );
  }

  // BPoS
  public createStakeTransaction(inputs: UTXOInput[], payload: PayloadStakeInfo, lockAddress: string, amount: string, fee: string, memo: string): EncodedTx {
    return (<MainchainSubWallet>this.sdkSubWallet).createStakeTransaction(inputs, payload, lockAddress, amount, fee, memo);
  }

  public createDPoSV2VoteTransaction(inputs: UTXOInput[], payload: VotingInfo, fee: string, memo: string): EncodedTx {
    return (<MainchainSubWallet>this.sdkSubWallet).createDPoSV2VoteTransaction(inputs, payload, fee, memo);
  }

  public getDPoSV2ClaimRewardDigest(payload: DPoSV2ClaimRewardInfo): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getDPoSV2ClaimRewardDigest(payload);
  }

  public createDPoSV2ClaimRewardTransaction(inputs: UTXOInput[], payload: DPoSV2ClaimRewardInfo, fee: string, memo: string): EncodedTx {
    return (<MainchainSubWallet>this.sdkSubWallet).createDPoSV2ClaimRewardTransaction(inputs, payload, fee, memo);
  }

  public unstakeDigest(payload: UnstakeInfo): string {
    return (<MainchainSubWallet>this.sdkSubWallet).unstakeDigest(payload);
  }

  public createUnstakeTransaction(inputs: UTXOInput[], payload: UnstakeInfo, fee: string, memo: string): EncodedTx {
    return (<MainchainSubWallet>this.sdkSubWallet).createUnstakeTransaction(inputs, payload, fee, memo);
  }

  public async signTransaction(subWallet: AnySubWallet, rawTransaction: json, transfer: Transfer): Promise<SignTransactionResult> {
    let txResult = await super.signTransaction(subWallet, rawTransaction, transfer);

    if (!txResult.signedTransaction)
      return txResult; // Forward the error

    // For mainchain, the signed created transaction is a json string.
    // We must convert it to a raw transaction first before publishing it.
    // So the real "sign transaction" format is the raw transaction

    // TODO: move this conversion to convertSignedTransactionToPublishableTransaction()
    let rawSignedTransaction = (<MainchainSubWallet>this.sdkSubWallet).convertToRawTransaction(
      txResult.signedTransaction as unknown as EncodedTx);

    return {
      signedTransaction: rawSignedTransaction
    }
  }

  public getOwnerAddress(): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getOwnerAddress();
  }

  public getOwnerDepositAddress(): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getOwnerDepositAddress();
  }

  public getOwnerStakeAddress(): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getOwnerStakeAddress();
  }

  public getCodeofOwnerStakeAddress(): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getCodeofOwnerStakeAddress();
  }

  public getCodeofOwnerAddress(): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getCodeofOwnerAddress();
  }

  public getOwnerPublicKey(): string {
    return (<MainchainSubWallet>this.sdkSubWallet).getOwnerPublicKey();
  }

  public getPublicKeys(start: number, count: number, internal: boolean): string[] | PublickeysInfo {
    return (<MainchainSubWallet>this.sdkSubWallet).getPublicKeys(start, count, internal);
  }

  public signDigest(address: string, digest: string, passwd: string): Promise<string> {
    return (<MainchainSubWallet>this.sdkSubWallet).signDigest(address, digest, passwd);
  }

  public signDigestWithOwnerKey(digest: string, passwd: string): Promise<string> {
    return (<MainchainSubWallet>this.sdkSubWallet).signDigestWithOwnerKey(digest, passwd);
  }

  public verifyDigest(publicKey: string, digest: string, signature: string): boolean {
    return (<MainchainSubWallet>this.sdkSubWallet).verifyDigest(publicKey, digest, signature);
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
  public getExtendedPublicKey() {
    try {
      if (!this.sdkMasterWallet)
        return null;

      let pubKeyInfo = <PubKeyInfo>this.sdkMasterWallet.getPubKeyInfo();

      return pubKeyInfo.xPubKeyHDPM; // BIP45 !
    }
    catch (e) {
      Logger.error("wallet", "walletjs safe getExtendedPublicKey() error:", e);
    }
  }
}