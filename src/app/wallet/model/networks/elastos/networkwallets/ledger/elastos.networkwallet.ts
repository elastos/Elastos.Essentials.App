import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { LedgerNetworkWallet } from "../../../base/networkwallets/ledger.networkwallet";

export abstract class ElastosLedgerNetworkWallet extends LedgerNetworkWallet<ElastosMainChainWalletNetworkOptions> {
}