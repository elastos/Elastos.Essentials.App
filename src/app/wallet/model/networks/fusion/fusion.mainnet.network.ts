import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { FusionNetworkWallet } from "../../wallets/fusion/fusion.network.wallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
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
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new FusionNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }
}
