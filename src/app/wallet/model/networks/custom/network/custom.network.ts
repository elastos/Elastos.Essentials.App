import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";

/**
 * Custom EVM compatible network.
 */
export class CustomNetwork extends EVMNetwork {
  constructor(
    key: string, // unique identifier
    name: string, // Human readable network name - Elastos, HECO
    logo: string, // Path to the network icon
    mainTokenSymbol: string, // Symbol of the main EVM token: Ex: HT, BSC...
    mainTokenFriendlyName: string, // Ex: Huobi Token
    networkTemplate: string, // For which network template is this network available
    rpcUrl: string,
    chainID: number
  ) {
    super(key, name, logo, mainTokenSymbol, mainTokenFriendlyName, networkTemplate, chainID);
    this.mainRpcUrl = rpcUrl;
  }

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const CustomNetworkWallet = (await import("../networkwallets/standard/custom.network.wallet")).CustomNetworkWallet;
        return new CustomNetworkWallet(
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
    switch (type) {
      case NetworkAPIURLType.RPC: return this.mainRpcUrl;
      default: throw new Error(`BSCNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
    }
  }
}
