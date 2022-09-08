import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { FusionAPI, FusionApiType } from "./fusion.api";

export class FusionBaseNetwork extends EVMNetwork {
  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const FusionNetworkWallet = (await import("../networkwallets/standard/fusion.network.wallet")).FusionNetworkWallet;
        return new FusionNetworkWallet(
          masterWallet as StandardMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      case WalletType.LEDGER:
        const FusionLedgerNetworkWallet = (await import("../networkwallets/ledger/fusion.ledger.network.wallet")).FusionLedgerNetworkWallet;
        return new FusionLedgerNetworkWallet(
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
      return FusionAPI.getApiUrl(FusionApiType.RPC, this.networkTemplate);
    else
      throw new Error(`FusionBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainColor(): string {
    return "1d9ad7";
  }
}
