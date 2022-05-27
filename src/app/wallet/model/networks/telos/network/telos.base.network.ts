import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { TelosNetworkWallet } from "../networkwallets/standard/telos.network.wallet";
import { TelosAPI, TelosAPIType } from "./telos.api";

export class TelosBaseNetwork extends EVMNetwork {
  protected newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new TelosNetworkWallet(<StandardMasterWallet>masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
      default:
        return null;
    }
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return TelosAPI.getApiUrl(TelosAPIType.RPC, this.networkTemplate);
    else
      throw new Error(`TelosBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
