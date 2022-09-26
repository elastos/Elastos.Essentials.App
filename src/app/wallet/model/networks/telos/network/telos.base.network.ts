import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { TelosAPI, TelosAPIType } from "./telos.api";

export class TelosBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        let TelosNetworkWallet = (await import("../networkwallets/standard/telos.network.wallet")).TelosNetworkWallet;
        return new TelosNetworkWallet(<StandardMasterWallet>masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
      case WalletType.LEDGER:
        let TelosLedgerNetworkWallet = (await import("../networkwallets/ledger/telos.ledger.network.wallet")).TelosLedgerNetworkWallet;
        return new TelosLedgerNetworkWallet(<LedgerMasterWallet>masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
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

  public getMainColor(): string {
    return "5c3d9b";
  }
}
