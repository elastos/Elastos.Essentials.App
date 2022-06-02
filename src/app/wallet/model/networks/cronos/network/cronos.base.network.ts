import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { CronosAPI, CronosApiType } from "./cronos.api";

export class CronosBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const CronosNetworkWallet = (await import("../networkwallets/standard/cronos.network.wallet")).CronosNetworkWallet;
        return new CronosNetworkWallet(
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
      return CronosAPI.getApiUrl(CronosApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return CronosAPI.getApiUrl(CronosApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`CronosBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
