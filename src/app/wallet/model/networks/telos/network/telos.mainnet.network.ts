import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMNetwork } from "../../evms/evm.network";
import { telosMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { telosMainnetElkSwapProvider } from "../earn/swap.providers";
import { TelosNetworkWallet } from "../networkwallets/standard/telos.network.wallet";
import { TelosAPI, TelosAPIType } from "./telos.api";

export class TelosMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "telos",
      "Telos EVM",
      "assets/wallet/networks/telos.png",
      "TLOS",
      "Telos",
      TelosAPI.getApiUrl(TelosAPIType.RPC, MAINNET_TEMPLATE),
      TelosAPI.getApiUrl(TelosAPIType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      40,
      [
      ],
      [],
      [
        telosMainnetElkSwapProvider
      ],
      [
        telosMainnetElkBridgeProvider
      ]
    );

    this.averageBlocktime = 5 // 2;
  }

  public async createNetworkWallet(masterWallet: StandardMasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet = new TelosNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }
}
