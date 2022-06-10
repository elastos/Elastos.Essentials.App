import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { GnosisAPI, GnosisApiType } from "./gnosis.api";

export class GnosisBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        let GnosisNetworkWallet = (await import("../networkwallets/standard/gnosis.network.wallet")).GnosisNetworkWallet;
        return new GnosisNetworkWallet(
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
      return GnosisAPI.getApiUrl(GnosisApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return GnosisAPI.getApiUrl(GnosisApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`GnosisBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}