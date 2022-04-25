/**
 * Used to specify the expected address format for specific operations.
 */
export enum AddressUsage {
  DEFAULT = "default",
  RECEIVE_FUNDS = "receive_funds",
  SEND_FUNDS = "send_funds",
  EVM_CALL = "evm_call", // Address will be used to call native evm functions. Expected 0x format.
  COVALENT_FETCH_TRANSACTIONS = "covalent_fetch_transactions", // 0x for EVMs, ioXXXX for iotex network
  DISPLAY_TRANSACTIONS = "display_transactions",
  IOTEX = "iotex" // ioXXXX
}