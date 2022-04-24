import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { FusionNetworkWallet } from "../networkwallets/standard/fusion.network.wallet";
import { FusionAPI, FusionApiType } from "./fusion.api";

export class FusionBaseNetwork extends EVMNetwork {
  public newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new FusionNetworkWallet(
          masterWallet as StandardMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      default:
        return null;
    }
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return FusionAPI.getApiUrl(FusionApiType.RPC, this.networkTemplate);
    else
      throw new Error(`FusionBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
