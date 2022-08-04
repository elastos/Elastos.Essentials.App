import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardEVMNetworkWallet } from "../../../../evms/networkwallets/standard/standard.evm.networkwallet";

export abstract class ElastosStandardEVMNetworkWallet extends StandardEVMNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    // NOTE : already done by StandardEVMNetworkWallet. But should move to safes
    //if (!await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet))
    // return;

    await super.initialize();
  }
}