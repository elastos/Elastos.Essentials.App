import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVService } from "src/app/wallet/services/spv.service";
import { StandardNetworkWallet } from "../../../base/networkwallets/standard.networkwallet";

export abstract class ElastosStandardNetworkWallet extends StandardNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize();
  }
}