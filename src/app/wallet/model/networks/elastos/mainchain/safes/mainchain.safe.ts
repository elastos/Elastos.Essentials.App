import { Outputs, UtxoForSDK } from "src/app/wallet/model/tx-providers/transaction.types";
import { VoteContent } from "src/app/wallet/services/spv.service";

export interface ElastosMainChainSafe {
  getOwnerAddress(): Promise<string>;
  getOwnerPublicKey(): Promise<string>;
  createPaymentTransaction(inputs: UtxoForSDK[], outputs: Outputs[], fee: string, memo: string): Promise<any>;
  createVoteTransaction(inputs: UtxoForSDK[], voteContent: VoteContent[], fee: string, memo: string): Promise<any>;
  createDepositTransaction(inputs: UtxoForSDK[], toSubwalletId: string, amount: string, toAddress: string, lockAddress: string, fee: string, memo: string): Promise<any>;

  // CR
  createProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createProposalChangeOwnerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createTerminateProposalTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createSecretaryGeneralElectionTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createProposalTrackingTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createProposalReviewTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createProposalWithdrawTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createReserveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createReceiveCustomIDTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createChangeCustomIDFeeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createRegisterSidechainTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

  // Dpos registration transaction functions
  createRegisterProducerTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string): Promise<any>;
  createCancelProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createUpdateProducerTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createRetrieveDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string): Promise<any>;

  //CR registration transaction functions
  createRegisterCRTransaction(inputs: UtxoForSDK[], payload: string, amount: string, fee: string, memo: string): Promise<any>;
  createUnregisterCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createUpdateCRTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;
  createRetrieveCRDepositTransaction(inputs: UtxoForSDK[], amount: string, fee: string, memo: string): Promise<any>;
  createCRCouncilMemberClaimNodeTransaction(inputs: UtxoForSDK[], payload: string, fee: string, memo: string): Promise<any>;

}
