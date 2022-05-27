import { StandardMultiSigMasterWallet } from "../../../masterwallets/standard.multisig.masterwallet";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { NetworkWallet } from "./networkwallet";

/**
 * Network wallet that manages wallets of type WalletType.MULTISIG_STANDARD.
 */
export abstract class StandardMultiSigNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<StandardMultiSigMasterWallet, WalletNetworkOptionsType> {

}