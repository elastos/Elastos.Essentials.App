import { AnyNetworkWallet } from "../networkwallets/networkwallet";

/**
 * Base class for network specialize classes responsible for creating transaction that
 * are then been signed and published.
 */
export abstract class TransactionBuilder {
  constructor(protected networkWallet: AnyNetworkWallet) { }
}