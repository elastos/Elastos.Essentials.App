export type ProviderTransactionInfo = {
  cacheKey: string;       // Key for the cache to which this transaction belongs. Same for all transactions of the same subwallet
  cacheEntryKey: string;  // Item key identifier for this item, inside its target cache
  cacheTimeValue: number; // Timestamp used to clean old cache items
  subjectKey: string;     // Key used by RxSubjects to listen to events about this kind of transaction
}