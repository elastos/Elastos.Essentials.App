/**
 * Status as returned by the back-end
 */
export type PaymentStatus = {
  nativeToken: {
    blockNumber: number; //  Block at which the payment was received
    blockTimestamp: number; // Timestamp of the block at which the payment was received
    transactionHash: string; // Transaction hash of the payment
    receivedAmount: string; // Amount actually received
  };
  erc20Token: {
    blockNumber: number; //  Block at which the payment was received
    blockTimestamp: number; // Timestamp of the block at which the payment was received
    transactionHash: string; // Transaction hash of the payment
    receivedAmount: string; // Amount actually received
  };
  // TODO: refund payments (the other way)
}