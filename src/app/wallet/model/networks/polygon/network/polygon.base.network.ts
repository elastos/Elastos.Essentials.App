import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { PolygonAPI, PolygonAPIType } from "./polygon.api";

export class PolygonBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        let PolygonNetworkWallet = (await import("../networkwallets/standard/polygon.network.wallet")).PolygonNetworkWallet;
        return new PolygonNetworkWallet(
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
      return PolygonAPI.getApiUrl(PolygonAPIType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return PolygonAPI.getApiUrl(PolygonAPIType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`PolygonBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
