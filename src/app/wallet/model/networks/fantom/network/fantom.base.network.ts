import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { FantomNetworkWallet } from "../networkwallets/standard/bsc.network.wallet";
import { FantomAPI, FantomApiType } from "./fantom.api";

export class FantomBaseNetwork extends EVMNetwork {
  protected newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new FantomNetworkWallet(
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
      return FantomAPI.getApiUrl(FantomApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return FantomAPI.getApiUrl(FantomApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`FantomBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
