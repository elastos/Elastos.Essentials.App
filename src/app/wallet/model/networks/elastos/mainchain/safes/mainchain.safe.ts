import type {
  CancelProducerInfo, ChangeCustomIDFeeOwnerInfo, ChangeProposalOwnerInfo, CRCouncilMemberClaimNodeInfo, CRCProposalInfo,
  CRCProposalReviewInfo, CRCProposalTrackingInfo, CRCProposalWithdrawInfo, CRInfoJson,
  CRInfoPayload, DPoSV2ClaimRewardInfo, EncodedTx, NormalProposalOwnerInfo, PayloadStakeInfo, ProducerInfoJson, PublickeysInfo, ReceiveCustomIDOwnerInfo, RegisterSidechainProposalInfo,
  ReserveCustomIDOwnerInfo, SecretaryElectionInfo, TerminateProposalOwnerInfo, UnregisterCRPayload, UnstakeInfo, UTXOInput, VoteContentInfo, VotingInfo
} from "@elastosfoundation/wallet-js-sdk";
import { Outputs } from "src/app/wallet/model/tx-providers/transaction.types";

export interface ElastosMainChainSafe {
  getOwnerAddress(): string;
  getOwnerDepositAddress(): string;
  getOwnerStakeAddress(): string;
  getCodeofOwnerStakeAddress(): string;
  getCodeofOwnerAddress(): string;
  getOwnerPublicKey(): string;
  getPublicKeys(start: number, count: number, internal: boolean): string[] | PublickeysInfo;

  signDigestWithOwnerKey(digest: string, passwd: string): Promise<string>;
  verifyDigest(publicKey: string, digest: string, signature: string): boolean;

  createPaymentTransaction(inputs: UTXOInput[], outputs: Outputs[], fee: string, memo: string): Promise<any>;
  createVoteTransaction(inputs: UTXOInput[], voteContent: VoteContentInfo[], fee: string, memo: string): Promise<any>;
  createDepositTransaction(inputs: UTXOInput[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string): Promise<any>;

  // CR
  CRCouncilMemberClaimNodeDigest(payload: CRCouncilMemberClaimNodeInfo, version: number): string;
  proposalOwnerDigest(payload: NormalProposalOwnerInfo): string;
  proposalCRCouncilMemberDigest(payload: NormalProposalOwnerInfo): string;

  createProposalTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;
  createProposalChangeOwnerTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  // Proposal Terminate Proposal
  terminateProposalOwnerDigest(payload: TerminateProposalOwnerInfo): string;
  terminateProposalCRCouncilMemberDigest(payload: TerminateProposalOwnerInfo): string;
  createTerminateProposalTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  proposalSecretaryGeneralElectionDigest(payload: SecretaryElectionInfo): string;
  proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: SecretaryElectionInfo): string;
  createSecretaryGeneralElectionTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;


  proposalChangeOwnerDigest(payload: ChangeProposalOwnerInfo): string;
  proposalChangeOwnerCRCouncilMemberDigest(payload: ChangeProposalOwnerInfo): string;
  proposalTrackingSecretaryDigest(payload: CRCProposalTrackingInfo): string;


  createProposalTrackingTransaction(inputs: UTXOInput[], payload: CRCProposalTrackingInfo, fee: string, memo: string): Promise<any>;
  proposalReviewDigest(payload: CRCProposalReviewInfo): string;
  createProposalReviewTransaction(inputs: UTXOInput[], payload: CRCProposalReviewInfo, fee: string, memo: string): Promise<any>;
  proposalTrackingOwnerDigest(payload: CRCProposalTrackingInfo): string;

  proposalWithdrawDigest(payload: CRCProposalWithdrawInfo): string;

  createProposalWithdrawTransaction(inputs: UTXOInput[], payload: CRCProposalWithdrawInfo, fee: string, memo: string): Promise<any>;

  reserveCustomIDOwnerDigest(payload: ReserveCustomIDOwnerInfo): string;
  reserveCustomIDCRCouncilMemberDigest(payload: ReserveCustomIDOwnerInfo): string;
  createReserveCustomIDTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  receiveCustomIDOwnerDigest(payload: ReceiveCustomIDOwnerInfo): string;
  receiveCustomIDCRCouncilMemberDigest(payload: ReceiveCustomIDOwnerInfo): string;
  createReceiveCustomIDTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  changeCustomIDFeeOwnerDigest(payload: ChangeCustomIDFeeOwnerInfo): string;
  changeCustomIDFeeCRCouncilMemberDigest(payload: ChangeCustomIDFeeOwnerInfo): string;
  createChangeCustomIDFeeTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  registerSidechainOwnerDigest(payload: RegisterSidechainProposalInfo): string;
  registerSidechainCRCouncilMemberDigest(payload: RegisterSidechainProposalInfo): string;
  createRegisterSidechainTransaction(inputs: UTXOInput[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  // Dpos registration transaction functions
  createRegisterProducerTransaction(inputs: UTXOInput[], payload: ProducerInfoJson, amount: string, fee: string, memo: string): Promise<any>;
  createCancelProducerTransaction(inputs: UTXOInput[], payload: CancelProducerInfo, fee: string, memo: string): Promise<any>;
  createUpdateProducerTransaction(inputs: UTXOInput[], payload: ProducerInfoJson, fee: string, memo: string): Promise<any>;

  generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string, stakeUntil: number): Promise<any>;
  generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any>;
  createRetrieveDepositTransaction(inputs: UTXOInput[], amount: string, fee: string, memo: string): Promise<any>;

  //CR registration transaction functions
  getCRDepositAddress(): string;
  generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number): CRInfoPayload;
  generateUnregisterCRPayload(CID: string): UnregisterCRPayload;
  createRegisterCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, amount: string, fee: string, memo: string): Promise<any>;
  createUnregisterCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, fee: string, memo: string): Promise<any>;
  createUpdateCRTransaction(inputs: UTXOInput[], payload: CRInfoJson, fee: string, memo: string): Promise<any>;
  createRetrieveCRDepositTransaction(inputs: UTXOInput[], amount: string, fee: string, memo: string): Promise<any>;
  createCRCouncilMemberClaimNodeTransaction(version: number, inputs: UTXOInput[], payload: CRCouncilMemberClaimNodeInfo, fee: string, memo: string): Promise<any>;

  // BPoS
  createStakeTransaction(inputs: UTXOInput[], payload: PayloadStakeInfo, lockAddress: string, amount: string, fee: string, memo: string): EncodedTx;
  createDPoSV2VoteTransaction(inputs: UTXOInput[], payload: VotingInfo, fee: string, memo: string): EncodedTx;
  getDPoSV2ClaimRewardDigest(payload: DPoSV2ClaimRewardInfo): string;
  createDPoSV2ClaimRewardTransaction(inputs: UTXOInput[], payload: DPoSV2ClaimRewardInfo, fee: string, memo: string): EncodedTx;
  unstakeDigest(payload: UnstakeInfo): string;
  createUnstakeTransaction(inputs: UTXOInput[], payload: UnstakeInfo, fee: string, memo: string): EncodedTx;
}
