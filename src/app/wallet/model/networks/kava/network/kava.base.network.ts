import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { EVMNetworkWallet } from "../../evms/networkwallets/evm.networkwallet";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { KavaAPI, KavaApiType } from "./kava.api";

export class KavaBaseNetwork extends EVMNetwork {
  protected async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        let KavaNetworkWallet = (await import("../networkwallets/standard/kava.network.wallet")).KavaNetworkWallet;
        return new KavaNetworkWallet(
          masterWallet as StandardMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      case WalletType.LEDGER:
        let KavaLedgerNetworkWallet = (await import("../networkwallets/ledger/kava.ledger.network.wallet")).KavaLedgerNetworkWallet;
        return new KavaLedgerNetworkWallet(
          masterWallet as LedgerMasterWallet,
          this,
          this.getMainTokenSymbol(),
          this.mainTokenFriendlyName
        );
      default:
        return null;
    }
  }

  public async createERC20SubWallet(networkWallet: EVMNetworkWallet<any, any>, coinID: string, startBackgroundUpdates?: boolean): Promise<ERC20SubWallet> {
    let KavaERC20Subwallet = (await import("../subwallets/kava.erc20.subwallet")).KavaERC20Subwallet;
    let subWallet = new KavaERC20Subwallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return KavaAPI.getApiUrl(KavaApiType.RPC, this.networkTemplate);
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return KavaAPI.getApiUrl(KavaApiType.ETHERSCAN_API, this.networkTemplate);
    else if (type === NetworkAPIURLType.BLOCK_EXPLORER)
      return KavaAPI.getApiUrl(KavaApiType.BLOCK_EXPLORER, this.networkTemplate);
    else
      throw new Error(`KavaBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainColor(): string {
    return "fc3c3f";
  }
}
