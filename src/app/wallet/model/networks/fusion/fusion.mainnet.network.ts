import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { FusionNetworkWallet } from "../../wallets/fusion/standard/fusion.network.wallet";
import { StandardMasterWallet } from "../../wallets/masterwallet";
import { AnyNetworkWallet } from "../../wallets/networkwallet";
import { EVMNetwork } from "../evm.network";
import { FusionAPI, FusionApiType } from "./fusion.api";

// Explorer: https://fsnex.com/
export class FusionMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "fusion",
      "Fusion",
      "assets/wallet/networks/fusion.png",
      "FSN",
      "FSN",
      FusionAPI.getApiUrl(FusionApiType.RPC),
      null,
      MAINNET_TEMPLATE,
      32659,
      []
    );

    this.averageBlocktime = 5;
  }

  public async createNetworkWallet(masterWallet: StandardMasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet = new FusionNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }
}
