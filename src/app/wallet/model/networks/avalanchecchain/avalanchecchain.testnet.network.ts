import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { WalletType } from "../../wallet.types";
import { AvalancheCChainNetworkWallet } from "../../wallets/avalanchecchain/standard/avalanchecchain.network.wallet";
import { MasterWallet, StandardMasterWallet } from "../../wallets/masterwallet";
import { AnyNetworkWallet } from "../../wallets/networkwallet";
import { EVMNetwork } from "../evm.network";
import { AvalancheCChainAPI, AvalancheCChainApiType } from "./avalanchecchain.api";

export class AvalancheCChainTestNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "avalanchecchain",
      "Avalanche FUJI C-Chain",
      "assets/wallet/networks/avalance.png",
      "AVAX",
      "Avalanche Token",
      AvalancheCChainAPI.getApiUrl(AvalancheCChainApiType.RPC, TESTNET_TEMPLATE),
      null,
      TESTNET_TEMPLATE,
      43113,
    );

    this.averageBlocktime = 5 // 2;
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new AvalancheCChainNetworkWallet(masterWallet as StandardMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
        break;
      default:
        return null;
    }

    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();

    return wallet;
  }
}
