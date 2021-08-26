import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../services/wallet.service";
import { CoinID, ERC20Coin } from "../Coin";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { HecoAPI, HecoApiType } from "../wallets/heco/heco.api";
import { HecoERC20SubWallet } from "../wallets/heco/heco.erc20.subwallet";
import { HecoNetworkWallet } from "../wallets/heco/heco.networkwallet";
import { MasterWallet } from "../wallets/masterwallet";
import { NetworkWallet } from "../wallets/networkwallet";
import { Network } from "./network";

export class HECONetwork extends Network {
  constructor() {
    super("heco", "HECO", "assets/wallet/networks/hecochain.png");
  }

  public getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];

    if (networkTemplate == MAINNET_TEMPLATE) {
      availableCoins.push(new ERC20Coin("BTC", "BTC", "Heco BTC", "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("ETH", "ETH", "Heco ETH", "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("USDT", "USDT", "Heco USDT", "0xa71EdC38d189767582C38A3145b5873052c3e47a", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("USDC", "USDC", "Heco USDC", "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("DOT", "DOT", "Heco DOT", "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", MAINNET_TEMPLATE, false));
    }

    return availableCoins;
  }

  public createNetworkWallet(masterWallet: MasterWallet): NetworkWallet {
    return new HecoNetworkWallet(masterWallet, this);
  }

  public createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID): ERC20SubWallet {
    return new HecoERC20SubWallet(networkWallet, coinID);
  }

  public getMainEvmRpcApiUrl(): string {
    return HecoAPI.getApiUrl(HecoApiType.RPC);
  }

  public getMainTokenSymbol(): string {
    return 'HT';
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string) {
    switch (networkTemplate) {
      case (MAINNET_TEMPLATE):
        onGoingConfig['ETHHECO'] = {ChainID: 128, NetworkID: 128};
        return;
      case (TESTNET_TEMPLATE):
        onGoingConfig['ETHHECO'] = {ChainID: 256, NetworkID: 256};
        return;
    }
  }
}
