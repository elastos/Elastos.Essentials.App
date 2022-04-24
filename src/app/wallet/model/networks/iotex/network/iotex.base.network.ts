import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { StandardIoTeXNetworkWallet } from "../networkwallets/standard/standard.iotex.networkwallet";
import { IoTeXAPI, IoTeXApiType } from "./iotex.api";

export class IoTeXBaseNetwork extends EVMNetwork {
  public newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new StandardIoTeXNetworkWallet(
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
      return IoTeXAPI.getApiUrl(IoTeXApiType.RPC, this.networkTemplate);
    else
      throw new Error(`IoTeXBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
