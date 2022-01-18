export type PaymentStatusEntry = {
  blockNumber: number; //  Block at which the payment was received
  blockTimestamp: number; // Timestamp of the block at which the payment was received
  transactionHash: string; // Transaction hash of the payment
  receivedAmount: string; // Amount actually received
};

/**
 * Status as returned by the back-end
 */
export type PaymentStatus = {
  nativeToken: PaymentStatusEntry;
  erc20Token: PaymentStatusEntry;
  // TODO: refund payments (the other way)
}

export type NotifyPaymentStatus = {
  payment: PaymentStatusEntry; // Payment received
  confirmed: boolean; // True is the payment was the expected one, false otherwise
  errorMessage?: string; // Additional information as of why the payment was not confirmed.
}