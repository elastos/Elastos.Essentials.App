import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { HecoAPI, HecoApiType } from "./heco.api";

export class HECOMainNetNetwork extends EVMNetwork {
  constructor() {
    super(
      "heco",
      "HECO",
      "assets/wallet/networks/hecochain.png",
      "HT",
      "Huobi Token",
      HecoAPI.getApiUrl(HecoApiType.RPC, MAINNET_TEMPLATE),
      HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      128,
      [
        new ERC20Coin("BTC", "Heco BTC", "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("ETH", "Heco ETH", "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDT", "Heco USDT", "0xa71EdC38d189767582C38A3145b5873052c3e47a", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "Heco USDC", "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", MAINNET_TEMPLATE, false, true),
        new ERC20Coin("DOT", "Heco DOT", "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", MAINNET_TEMPLATE, false),
        new ERC20Coin("FilDA", "FilDA", "0xe36ffd17b2661eb57144ceaef942d95295e637f0", MAINNET_TEMPLATE, false, true)
      ]
    );
  }
}
