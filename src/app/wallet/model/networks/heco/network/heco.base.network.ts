import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { HecoAPI, HecoApiType } from "./heco.api";

export class HecoBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        let HecoNetworkWallet = (await import("../networkwallets/standard/heco.network.wallet")).HecoNetworkWallet;
        return new HecoNetworkWallet(
          masterWallet as StandardMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      case WalletType.LEDGER:
        let HecoLedgerNetworkWallet = (await import("../networkwallets/ledger/heco.ledger.network.wallet")).HecoLedgerNetworkWallet;
        return new HecoLedgerNetworkWallet(
          masterWallet as LedgerMasterWallet,
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
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return HecoAPI.getApiUrl(HecoApiType.BLOCK_EXPLORER, this.networkTemplate);
    else
      throw new Error(`HecoBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainColor(): string {
    return "00943e";
  }
}
