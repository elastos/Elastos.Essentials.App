import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import type { EVMNetworkWallet } from "../../evms/networkwallets/evm.networkwallet";
import type { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { IoTeXAPI, IoTeXApiType } from "./iotex.api";

export class IoTeXBaseNetwork extends EVMNetwork {
  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        let StandardIoTeXNetworkWallet = (await import("../networkwallets/standard/standard.iotex.networkwallet")).StandardIoTeXNetworkWallet;
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

  public async createERC20SubWallet(networkWallet: EVMNetworkWallet<any, any>, coinID: string, startBackgroundUpdates?: boolean): Promise<ERC20SubWallet> {
    let IoTeXERC20Subwallet = (await import("../subwallets/iotex.erc20.subwallet")).IoTeXERC20Subwallet;
    let subWallet = new IoTeXERC20Subwallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return IoTeXAPI.getApiUrl(IoTeXApiType.RPC, this.networkTemplate);
    else
      throw new Error(`IoTeXBaseNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }
}
