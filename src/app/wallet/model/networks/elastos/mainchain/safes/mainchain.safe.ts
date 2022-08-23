import { ChangeCustomIDFeeOwnerInfo, ChangeProposalOwnerInfo, CRCouncilMemberClaimNodeInfo, CRCProposalInfo, CRCProposalReviewInfo, CRCProposalTrackingInfo, CRCProposalWithdrawInfo, CRInfoJson, CRInfoPayload, NormalProposalOwnerInfo, ReceiveCustomIDOwnerInfo, RegisterSidechainProposalInfo, ReserveCustomIDOwnerInfo, SecretaryElectionInfo, TerminateProposalOwnerInfo } from "@elastosfoundation/wallet-js-sdk";
import { PublickeysInfo } from "@elastosfoundation/wallet-js-sdk/typings/account/SubAccount";
import { CancelProducerInfo } from "@elastosfoundation/wallet-js-sdk/typings/transactions/payload/CancelProducer";
import { ProducerInfoJson } from "@elastosfoundation/wallet-js-sdk/typings/transactions/payload/ProducerInfo";
import { UnregisterCRPayload } from "@elastosfoundation/wallet-js-sdk/typings/transactions/payload/UnregisterCR";
import { VoteContent } from "src/app/wallet/model/elastos.types";
import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";

export interface ElastosMainChainSafe {
  getOwnerAddress(): string;
  getOwnerDepositAddress(): string;
  getOwnerPublicKey(): string;
  getPublicKeys(start: number, count: number, internal: boolean): string[] | PublickeysInfo;
  createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any>;
  createVoteTransaction(inputs: UtxoForSDK[], voteContent: VoteContent[], fee: string, memo: string): Promise<any>;
  createDepositTransaction(inputs: UtxoForSDK[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string): Promise<any>;

  // CR
  CRCouncilMemberClaimNodeDigest(payload: CRCouncilMemberClaimNodeInfo): string;
  proposalOwnerDigest(payload: NormalProposalOwnerInfo): string;
  proposalCRCouncilMemberDigest(payload: NormalProposalOwnerInfo): string;

  createProposalTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;
  createProposalChangeOwnerTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  // Proposal Terminate Proposal
  terminateProposalOwnerDigest(payload: TerminateProposalOwnerInfo): string;
  terminateProposalCRCouncilMemberDigest(payload: TerminateProposalOwnerInfo): string;
  createTerminateProposalTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  proposalSecretaryGeneralElectionDigest(payload: SecretaryElectionInfo): string;
  proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: SecretaryElectionInfo): string;
  createSecretaryGeneralElectionTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;


  proposalChangeOwnerDigest(payload: ChangeProposalOwnerInfo): string;
  proposalChangeOwnerCRCouncilMemberDigest(payload: ChangeProposalOwnerInfo): string;
  proposalTrackingSecretaryDigest(payload: CRCProposalTrackingInfo): string;


  createProposalTrackingTransaction(inputs: UtxoForSDK[], payload: CRCProposalTrackingInfo, fee: string, memo: string): Promise<any>;
  proposalReviewDigest(payload: CRCProposalReviewInfo): string;
  createProposalReviewTransaction(inputs: UtxoForSDK[], payload: CRCProposalReviewInfo, fee: string, memo: string): Promise<any>;
  proposalTrackingOwnerDigest(payload: CRCProposalTrackingInfo): string;

  proposalWithdrawDigest(payload: CRCProposalWithdrawInfo): string;

  createProposalWithdrawTransaction(inputs: UtxoForSDK[], payload: CRCProposalWithdrawInfo, fee: string, memo: string): Promise<any>;

  reserveCustomIDOwnerDigest(payload: ReserveCustomIDOwnerInfo): string;
  reserveCustomIDCRCouncilMemberDigest(payload: ReserveCustomIDOwnerInfo): string;
  createReserveCustomIDTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  receiveCustomIDOwnerDigest(payload: ReceiveCustomIDOwnerInfo): string;
  receiveCustomIDCRCouncilMemberDigest(payload: ReceiveCustomIDOwnerInfo): string;
  createReceiveCustomIDTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  changeCustomIDFeeOwnerDigest(payload: ChangeCustomIDFeeOwnerInfo): string;
  changeCustomIDFeeCRCouncilMemberDigest(payload: ChangeCustomIDFeeOwnerInfo): string;
  createChangeCustomIDFeeTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  registerSidechainOwnerDigest(payload: RegisterSidechainProposalInfo): string;
  registerSidechainCRCouncilMemberDigest(payload: RegisterSidechainProposalInfo): string;
  createRegisterSidechainTransaction(inputs: UtxoForSDK[], payload: CRCProposalInfo, fee: string, memo: string): Promise<any>;

  // Dpos registration transaction functions
  createRegisterProducerTransaction(inputs: UtxoForSDK[], payload: ProducerInfoJson, amount: string, fee: string, memo: string): Promise<any>;
  createCancelProducerTransaction(inputs: UtxoForSDK[], payload: CancelProducerInfo, fee: string, memo: string): Promise<any>;
  createUpdateProducerTransaction(inputs: UtxoForSDK[], payload: ProducerInfoJson, fee: string, memo: string): Promise<any>;

  generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string): Promise<any>;
  generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<any>;
  createRetrieveDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string): Promise<any>;

  //CR registration transaction functions
  getCRDepositAddress(): string;
  generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number): CRInfoPayload;
  generateUnregisterCRPayload(CID: string): UnregisterCRPayload;
  createRegisterCRTransaction(inputs: UtxoForSDK[], payload: CRInfoJson, amount: string, fee: string, memo: string): Promise<any>;
  createUnregisterCRTransaction(inputs: UtxoForSDK[], payload: CRInfoJson, fee: string, memo: string): Promise<any>;
  createUpdateCRTransaction(inputs: UtxoForSDK[], payload: CRInfoJson, fee: string, memo: string): Promise<any>;
  createRetrieveCRDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string): Promise<any>;
  createCRCouncilMemberClaimNodeTransaction(inputs: UtxoForSDK[], payload: CRCouncilMemberClaimNodeInfo, fee: string, memo: string): Promise<any>;

}
