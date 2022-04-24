import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { ArbitrumNetworkWallet } from "../networkwallets/standard/bsc.network.wallet";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";

export class ArbitrumBaseNetwork extends EVMNetwork {
  protected newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new ArbitrumNetworkWallet(
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
      return ArbitrumAPI.getApiUrl(ArbitrumApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return ArbitrumAPI.getApiUrl(ArbitrumApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`BSCNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
