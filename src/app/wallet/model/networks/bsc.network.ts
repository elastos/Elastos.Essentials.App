import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../services/wallet.service";
import { CoinID, ERC20Coin } from "../Coin";
import { BscAPI, BscApiType } from "../wallets/bsc/bsc.api";
import { BscERC20SubWallet } from "../wallets/bsc/bsc.erc20.subwallet";
import { BscNetworkWallet } from "../wallets/bsc/bsc.networkwallet";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { MasterWallet } from "../wallets/masterwallet";
import { NetworkWallet } from "../wallets/networkwallet";
import { Network } from "./network";

export class BSCNetwork extends Network {
  constructor() {
    super("bsc", "BSC", "assets/wallet/networks/bscchain.png");
  }

  public getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];

    if (networkTemplate == MAINNET_TEMPLATE) {
      /* TODO THIS IS HECO availableCoins.push(new ERC20Coin("BTC", "BTC", "Heco BTC", "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("ETH", "ETH", "Heco ETH", "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("USDT", "USDT", "Heco USDT", "0xa71EdC38d189767582C38A3145b5873052c3e47a", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("USDC", "USDC", "Heco USDC", "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", MAINNET_TEMPLATE, false));
      availableCoins.push(new ERC20Coin("DOT", "DOT", "Heco DOT", "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", MAINNET_TEMPLATE, false));*/
    }

    return availableCoins;
  }

  public createNetworkWallet(masterWallet: MasterWallet): NetworkWallet {
    return new BscNetworkWallet(masterWallet, this);
  }

  public createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID): ERC20SubWallet {
    return new BscERC20SubWallet(networkWallet, coinID);
  }

  public getMainEvmRpcApiUrl(): string {
    return BscAPI.getApiUrl(BscApiType.RPC);
  }

  public getMainTokenSymbol(): string {
    return 'BNB';
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string) {
    switch (networkTemplate) {
      case (MAINNET_TEMPLATE):
        onGoingConfig['ETHHECO'] = {ChainID: 56, NetworkID: 56};
        return;
      case (TESTNET_TEMPLATE):
        onGoingConfig['ETHHECO'] = {ChainID: 97, NetworkID: 97};
        return;
    }
  }
}
