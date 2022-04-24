import { TxData } from "ethereumjs-tx";
import { Transfer } from "../../services/cointransfer.service";
import { BTCTxData } from "../btc.types";
import { MasterWallet } from "../masterwallets/masterwallet";
import { SignTransactionResult } from "./safe.types";

/**
 * Used to specify the expected address format for specific operations.
 */
export enum AddressUsage {
  DEFAULT = "default",
  RECEIVE_FUNDS = "receive_funds",
  SEND_FUNDS = "send_funds",
  EVM_CALL = "evm_call", // Address will be used to call native evm functions. Expected 0x format.
  COVALENT_FETCH_TRANSACTIONS = "covalent_fetch_transactions", // 0x for EVMs, ioXXXX for iotex network
  IOTEX = "iotex" // ioXXXX
}

/**
 * Hosts and manipulates sensitive wallet information such as mnemonic, seed, private keys.
 * Wallets use different safes depending if they the wallet credentials are stored locally in the app,
 * or in a hardware wallet.
 *
 * The way to get public addresses (derivation) is also managed by safes, like everything that depends
 * on wallet private keys.
 */
export abstract class Safe {
  constructor(protected masterWallet: MasterWallet) { }

  /**
   * Initialization method that can be overriden by subclasses.
   */
  public initialize(): Promise<void> {
    return;
  }

  /**
   * Convenient method to get a set of derived addresses from a start index.
   * Requested addresses can be internal (hardened derivation path) or external.
   *
   * If multiple addresses are requested on wallets that can't get them (eg single address
   * wallets), an exception is thrown.
   * 
   * @param usage Most of the time, networks have only one kind of address so they don't need to handle this. But some networks (eg: iotex) use several address formats and need to return different address styles depending on situations.
   */
  public abstract getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: AddressUsage | string): Promise<string[]>; // TODO

  // TODO: remove this Transfer object, dirty.
  public abstract signTransaction(rawTx: string | TxData | BTCTxData, transfer: Transfer): Promise<SignTransactionResult>;
}