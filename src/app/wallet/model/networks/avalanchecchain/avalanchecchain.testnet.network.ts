import { TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { AvalancheCChainNetworkWallet } from "../../wallets/avalanchecchain/avalanchecchain.network.wallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
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
      43113
    );
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new AvalancheCChainNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }
}
