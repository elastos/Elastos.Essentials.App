import { ElastosWalletNetworkOptions } from "src/app/wallet/model/wallet.types";
import { SPVService } from "src/app/wallet/services/spv.service";
import { StandardNetworkWallet } from "../../../standardnetworkwallet";

export abstract class ElastosStandardNetworkWallet extends StandardNetworkWallet<ElastosWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize();
  }
}