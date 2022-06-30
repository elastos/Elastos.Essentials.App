import type { TxData } from "@ethereumjs/tx";
import { Transfer } from "../../services/cointransfer.service";
import { BTCTxData } from "../btc.types";
import { MasterWallet } from "../masterwallets/masterwallet";
import { AnyNetworkWallet } from "../networks/base/networkwallets/networkwallet";
import { AnySubWallet } from "../networks/base/subwallets/subwallet";
import { AddressUsage } from "./addressusage";
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
  protected networkWallet: AnyNetworkWallet = null;;

  constructor(protected masterWallet: MasterWallet) { }

  /**
   * Initialization method that can be overriden by subclasses.
   */
  public initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    this.networkWallet = networkWallet;
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

  /**
   * Returns wallet's extended public key (xpub...) string.
   */
  public getExtendedPublicKey(): Promise<string> {
    return null; // Default implementation: ext pub key not provided for now.
  }

  /**
   * Signs a transaction.
   *
   * By default, the master password is required, even if elready known, as a security step. But this can be
   * disabled, for example to chain operations (eg: easy bridge feature0, using forcePasswordPrompt = false.
   *
   * The UI feedback (popup) can also be hidden using visualFeedback = false.
   *
   * TODO: remove this Transfer object, dirty.
   *
   * @param subWallet
   * @param rawTx
   * @param transfer
   * @param forcePasswordPrompt Should be true by default
   * @param visualFeedback Should be true by default
   */
  public abstract signTransaction(subWallet: AnySubWallet, rawTx: string | TxData | BTCTxData, transfer: Transfer, forcePasswordPrompt?: boolean, visualFeedback?: boolean): Promise<SignTransactionResult>;

  /**
   * Gives a last chance to the safe to modify the signed transaction in a payload that can be published.
   * For instance, elastos mainchain signed tx is a json string, but it has to be converted to a publishable
   * payload before sending to chain.
   *
   * By default, this returns the original signed transaction.
   */
  public async convertSignedTransactionToPublishableTransaction(subWallet: AnySubWallet, signedTx: string): Promise<string> {
    return await signedTx;
  }
}