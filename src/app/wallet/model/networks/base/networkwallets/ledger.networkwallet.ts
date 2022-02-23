import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { WalletNetworkOptions } from "../../../masterwallets/wallet.types";
import { NetworkWallet } from "./networkwallet";

/**
 * Network wallet that manages wallets of type WalletType.LEDGER.
 */
export abstract class LedgerNetworkWallet<WalletNetworkOptionsType extends WalletNetworkOptions> extends NetworkWallet<LedgerMasterWallet, WalletNetworkOptionsType> {

}