import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { FuseNetworkWallet } from "../networkwallets/standard/fuse.network.wallet";
import { FuseAPI, FuseApiType } from "./fuse.api";

export class FuseBaseNetwork extends EVMNetwork {
  protected newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new FuseNetworkWallet(
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
      return FuseAPI.getApiUrl(FuseApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return FuseAPI.getApiUrl(FuseApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`FuseBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
