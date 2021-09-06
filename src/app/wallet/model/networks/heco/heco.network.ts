import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../Coin";
import { EVMNetwork } from "../evm.network";
import { HecoAPI, HecoApiType } from "./heco.api";

export class HECONetwork extends EVMNetwork {
  constructor() {
    super(
      "heco",
      "HECO",
      "assets/wallet/networks/hecochain.png",
      "HT",
      "Huobi Token",
      HecoAPI.getApiUrl(HecoApiType.RPC),
      HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC),
      {
        "MainNet": {
          chainID: 128,
          builtInCoins: [
            new ERC20Coin("BTC", "BTC", "Heco BTC", "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", MAINNET_TEMPLATE, false),
            new ERC20Coin("ETH", "ETH", "Heco ETH", "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", MAINNET_TEMPLATE, false),
            new ERC20Coin("USDT", "USDT", "Heco USDT", "0xa71EdC38d189767582C38A3145b5873052c3e47a", MAINNET_TEMPLATE, false),
            new ERC20Coin("USDC", "USDC", "Heco USDC", "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", MAINNET_TEMPLATE, false),
            new ERC20Coin("DOT", "DOT", "Heco DOT", "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", MAINNET_TEMPLATE, false),
            new ERC20Coin("FilDA", "FilDA", "FilDA", "0xe36ffd17b2661eb57144ceaef942d95295e637f0", MAINNET_TEMPLATE, false)
          ]
        },
        "TestNet": {
          chainID: 256
        }
      }
    );
  }
}
