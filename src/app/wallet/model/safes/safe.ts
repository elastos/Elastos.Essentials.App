import { TxData } from "ethereumjs-tx";
import { Transfer } from "../../services/cointransfer.service";
import { MasterWallet } from "../masterwallets/masterwallet";
import { SignTransactionResult } from "./safe.types";

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
   */
  public abstract getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]>; // TODO

  public abstract createTransfer(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any>; // TODO

  // TODO: remove this Transfer object, dirty.
  public abstract signTransaction(rawTx: string | TxData, transfer: Transfer): Promise<SignTransactionResult>;
}