import { AnyNetworkWallet } from "../networkwallets/networkwallet";

/**
 * Base class for network specialize classes responsible for creating transaction that
 * are then been signed and published.
 *
 * TODO: Not sure any more that we need such builders, if subwallets are not specific to "signers".
 * If transactions can be built in a very generic way, the same subwallets can contains all tx creation.
 */
export abstract class TransactionBuilder {
  constructor(protected networkWallet: AnyNetworkWallet) { }
}