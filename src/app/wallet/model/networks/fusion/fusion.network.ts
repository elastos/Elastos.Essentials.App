import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../Coin";
import { FusionNetworkWallet } from "../../wallets/fusion/fusion.network.wallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { EVMNetwork } from "../evm.network";
import { FusionAPI, FusionApiType } from "./fusion.api";

// Explorer: https://fsnex.com/
export class FusionNetwork extends EVMNetwork {
  constructor() {
    super(
      "fusion",
      "Fusion",
      "assets/wallet/networks/fusion.png",
      "FSN",
      "FSN",
      FusionAPI.getApiUrl(FusionApiType.RPC),
      null,
      {
        "MainNet": {
          chainID: 32659,
          builtInCoins: [
            new ERC20Coin("CHNG", "CHNG", "CHNG", "0xed0294dbd2a0e52a09c3f38a09f6e03de2c44fcf", MAINNET_TEMPLATE, false, true),
            new ERC20Coin("USDT", "USDT", "USDT on Fusion", "0x9c061dc72c0203f643f9a348dfcce3e73b5bd2c8", MAINNET_TEMPLATE, false, true),
            new ERC20Coin("ETH", "ETH", "ETH on Fusion", "0x8f5fc30a858e6249294de1f9f7781dce8cbc1174", MAINNET_TEMPLATE, false, true),
            new ERC20Coin("FMN", "FMN", "FMN", "0xb80a6c4f2a279ec91921ca30da726c534462125c", MAINNET_TEMPLATE, false),
            new ERC20Coin("FREE", "FREE", "FREE", "0x6403ede3b7604ea4883670c670bea288618bd5f2", MAINNET_TEMPLATE, false)
          ]
        },
        "TestNet": {
          chainID: 46688
        }
      }
    );
  }

  public canSupportNetworkTemplate(networkTemplate: string): boolean {
    return networkTemplate === MAINNET_TEMPLATE;
  }

  public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new FusionNetworkWallet(masterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName);
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }
}
