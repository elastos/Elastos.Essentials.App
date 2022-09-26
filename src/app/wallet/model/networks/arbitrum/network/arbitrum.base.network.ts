import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { ArbitrumAPI, ArbitrumApiType } from "./arbitrum.api";

export class ArbitrumBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const ArbitrumNetworkWallet = (await import("../networkwallets/standard/arbitrum.network.wallet")).ArbitrumNetworkWallet;
        return new ArbitrumNetworkWallet(
          masterWallet as StandardMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      case WalletType.LEDGER:
        const ArbitrumLedgerNetworkWallet = (await import("../networkwallets/ledger/arbitrum.ledger.network.wallet")).ArbitrumLedgerNetworkWallet;
        return new ArbitrumLedgerNetworkWallet(
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
      return ArbitrumAPI.getApiUrl(ArbitrumApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return ArbitrumAPI.getApiUrl(ArbitrumApiType.ETHERSCAN_API, this.networkTemplate);
    else
      throw new Error(`BSCNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainColor(): string {
    return "96bedc";
  }
}
