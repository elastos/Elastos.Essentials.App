/**
 * Stored vote information for a poll.
 * Shares base content with PollDetails (status, description, startTime, endTime, choices)
 * and adds vote-specific information (pollId, voteAmount, voteTimestamp, option, walletAddress).
 */
export interface StoredVoteInfo {
  pollId: string; // Poll ID
  voteAmount: string; // Vote amount in sELA (smallest unit) as string
  voteTimestamp: number; // Unix timestamp when vote was cast
  option: number; // Selected choice index
  walletAddress: string; // Wallet address that cast the vote
  // For multisig wallets
  offlineTransactionKey?: string; // Transaction key on chain
  offlineTransactionId?: string; // Used to reference this on going transaction locally and on the essentials api multisig service
}
