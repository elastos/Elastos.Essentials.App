import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { HecoNetworkWallet } from "../networkwallets/standard/heco.network.wallet";
import { HecoAPI, HecoApiType } from "./heco.api";

export class HecoBaseNetwork extends EVMNetwork {
  protected newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new HecoNetworkWallet(
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
      return HecoAPI.getApiUrl(HecoApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return HecoAPI.getApiUrl(HecoApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`HecoBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
