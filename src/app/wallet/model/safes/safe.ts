/**
 * Hosts and manipulates sensitive wallet information such as mnemonic, seed, private keys.
 * Wallets use different safes depending if they the wallet credentials are stored locally in the app,
 * or in a hardware wallet.
 * 
 * The way to get public addresses (derivation) is also managed by safes, like everything that depends
 * on wallet private keys. 
 */
export abstract class Safe {
  /**
   * Initialization method that can be overriden by subclasses.
   */
  public initialize(): Promise<void> {
    return;
  }

  public abstract getAddresses(): Promise<string[]>; // TODO
  public abstract signTransaction(rawTx: Buffer): Promise<string>; // TODO
}