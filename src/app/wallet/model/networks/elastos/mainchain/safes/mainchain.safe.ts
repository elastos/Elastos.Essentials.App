import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { VoteContent } from "src/app/wallet/services/spv.service";

export interface ElastosMainChainSafe {
  getOwnerAddress(): Promise<string>;
  getOwnerDepositAddress(): Promise<string>;
  getOwnerPublicKey(): Promise<string>;
  getPublicKeys(start: number, count: number, internal: boolean): Promise<string[]>;
  createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any>;
  createVoteTransaction(inputs: UtxoForSDK[], voteContent: VoteContent[], fee: string, memo: string): Promise<any>;
  createDepositTransaction(inputs: UtxoForSDK[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string): Promise<any>;

  // CR
  CRCouncilMemberClaimNodeDigest(payload: string): Promise<string>;
  proposalOwnerDigest(payload: string): Promise<string>;
  proposalCRCouncilMemberDigest(payload: string): Promise<string>;

  createProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createProposalChangeOwnerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  // Proposal Terminate Proposal
  terminateProposalOwnerDigest(payload: string): Promise<string>;
  terminateProposalCRCouncilMemberDigest(payload: string): Promise<string>;
  createTerminateProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  proposalSecretaryGeneralElectionDigest(payload: string): Promise<string>;
  proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: string): Promise<string>;
  createSecretaryGeneralElectionTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;


  proposalChangeOwnerDigest(payload: string): Promise<string>;
  proposalChangeOwnerCRCouncilMemberDigest(payload: string): Promise<string>;
  proposalTrackingSecretaryDigest(payload: string): Promise<string>;


  createProposalTrackingTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  proposalReviewDigest(payload: string): Promise<string>;
  createProposalReviewTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  proposalTrackingOwnerDigest(payload: string): Promise<string>;

  proposalWithdrawDigest(payload: string): Promise<string>;

  createProposalWithdrawTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  reserveCustomIDOwnerDigest(payload: string): Promise<string>;
  reserveCustomIDCRCouncilMemberDigest(payload: string): Promise<string>;
  createReserveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  receiveCustomIDOwnerDigest(payload: string): Promise<string>;
  receiveCustomIDCRCouncilMemberDigest(payload: string): Promise<string>;
  createReceiveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  changeCustomIDFeeOwnerDigest(payload: string): Promise<string>;
  changeCustomIDFeeCRCouncilMemberDigest(payload: string): Promise<string>;
  createChangeCustomIDFeeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  registerSidechainOwnerDigest(payload: string): Promise<string>;
  registerSidechainCRCouncilMemberDigest(payload: string): Promise<string>;
  createRegisterSidechainTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  // Dpos registration transaction functions
  createRegisterProducerTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string): Promise<any>;
  createCancelProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createUpdateProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any>;
  generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any>;
  createRetrieveDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string): Promise<any>;

  //CR registration transaction functions
  getCRDepositAddress(): Promise<string>;
  generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number): Promise<any>;
  generateUnregisterCRPayload(CID: string): Promise<string>;
  createRegisterCRTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string): Promise<any>;
  createUnregisterCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createUpdateCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createRetrieveCRDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string): Promise<any>;
  createCRCouncilMemberClaimNodeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

}
