import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { LedgerEVMNetworkWallet } from "../../../../evms/networkwallets/ledger/ledger.evm.networkwallet";

export abstract class ElastosLedgerEVMNetworkWallet extends LedgerEVMNetworkWallet<ElastosMainChainWalletNetworkOptions> {
}