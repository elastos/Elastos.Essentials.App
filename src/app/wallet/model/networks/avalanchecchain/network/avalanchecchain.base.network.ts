import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { CovalentHelper } from "../../evms/tx-providers/covalent.helper";
import { AvalancheCChainNetworkWallet } from "../networkwallets/standard/avalanchecchain.network.wallet";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";

export abstract class AvalancheCChainBaseNetwork extends EVMNetwork {
  protected newNetworkWallet(masterWallet: MasterWallet): AnyNetworkWallet {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        return new AvalancheCChainNetworkWallet(
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
      return AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.COVALENTHQ)
      return CovalentHelper.apiUrl();
    else
      throw new Error(`AvalancheCChainBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
