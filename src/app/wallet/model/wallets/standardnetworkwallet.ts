import { WalletNetworkOptions } from "../wallet.types";
import { StandardMasterWallet } from "./masterwallet";
import { NetworkWallet } from "./networkwallet";

/**
 * Network wallet that manages wallets of type WalletType.STANDARD ("regular" wallet - not multisig, not ledger,
 * etc).
 */
export abstract class StandardNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {

}