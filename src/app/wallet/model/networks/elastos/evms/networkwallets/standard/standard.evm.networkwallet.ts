import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardEVMNetworkWallet } from "../../../../evms/networkwallets/standard/standard.evm.networkwallet";

export abstract class ElastosStandardEVMNetworkWallet extends StandardEVMNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    await super.initialize();
  }
}