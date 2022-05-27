import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { NetworkWallet } from "./networkwallet";

/**
 * Network wallet that manages wallets of type WalletType.STANDARD ("regular" wallet - not multisig, not ledger,
 * etc).
 */
export abstract class StandardNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<StandardMasterWallet, WalletNetworkOptionsType> {
}