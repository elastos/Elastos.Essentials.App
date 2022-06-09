import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVHelperService } from "src/app/wallet/services/spv.helper.service";
import { StandardNetworkWallet } from "../../../base/networkwallets/standard.networkwallet";

export abstract class ElastosStandardNetworkWallet extends StandardNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    if (!await SPVHelperService.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize();
  }
}