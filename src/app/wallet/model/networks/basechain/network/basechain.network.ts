import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { BaseChainAPI, BaseChainApiType } from "./basechain.api";

/**
 * Shared base class for the Base (Coinbase L2) network, mirroring the other EVM
 * chains' "<Chain>BaseNetwork" pattern. Named BaseChainNetwork (not BaseBaseNetwork)
 * to avoid colliding with the abstract networks/base/ classes.
 */
export class BaseChainNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const BaseChainNetworkWallet = (await import("../networkwallets/standard/basechain.network.wallet")).BaseChainNetworkWallet;
        return new BaseChainNetworkWallet(
          masterWallet as StandardMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      case WalletType.LEDGER:
        const BaseChainLedgerNetworkWallet = (await import("../networkwallets/ledger/basechain.ledger.network.wallet")).BaseChainLedgerNetworkWallet;
        return new BaseChainLedgerNetworkWallet(
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
      return BaseChainAPI.getApiUrl(BaseChainApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return BaseChainAPI.getApiUrl(BaseChainApiType.ETHERSCAN_API, this.networkTemplate);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return BaseChainAPI.getApiUrl(BaseChainApiType.BLOCK_EXPLORER, this.networkTemplate);
    else
      throw new Error(`BaseChainNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainColor(): string {
    // Base brand blue per the official 2025 brand kit (github.com/base/brand-kit)
    return "0000ff";
  }
}
