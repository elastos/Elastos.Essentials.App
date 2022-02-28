export enum SignTransactionErrorType {
  CANCELLED, // eg: password cancellation
  FAILURE // eg: real signature flow failure with no more details
}

/**
 * Result of a transaction signing request to a safe
 */
export type SignTransactionResult = {
  signedTransaction?: string;
  errorType?: SignTransactionErrorType;
}