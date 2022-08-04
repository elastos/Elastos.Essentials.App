import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardNetworkWallet } from "../../../base/networkwallets/standard.networkwallet";
import { WalletJSSDKHelper } from "../../wallet.jssdk.helper";

export abstract class ElastosStandardNetworkWallet extends StandardNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public async initialize(): Promise<void> {
    if (!await WalletJSSDKHelper.maybeCreateStandardWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize();
  }
}