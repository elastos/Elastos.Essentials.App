import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { EthereumMainnetUniswapCurrencyProvider } from "./currency/eth.uniswap.currency.provider";
import { ethereumMainnetBinanceBridgeProvider, ethereumMainnetGlideBridgeProvider, ethereumMainnetShadowTokenBridgeProvider } from "./earn/bridge.providers";
import { ethereumMainnetUniswapSwapProvider } from "./earn/swap.providers";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";

// https://rpc.info/#ethereum-rpc
export class EthereumMainNetNetwork extends EVMNetwork {
  private uniswapCurrencyProvider: EthereumMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "ethereum",
      "Ethereum",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      EthereumAPI.getApiUrl(EthereumAPIType.RPC, "mainnet"),
      EthereumAPI.getApiUrl(EthereumAPIType.EXPLORER, "mainnet"),
      MAINNET_TEMPLATE,
      1,
      [
        new ERC20Coin("ELA", "ELA on Ethereum", "0xe6fd75ff38Adca4B97FBCD938c86b98772431867", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("BNB", "BNB", "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDT", "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("UNI", "Uniswap", "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("LINK", "ChainLink", "0x514910771af9ca656af840dff83e8264ecf986ca", 18, MAINNET_TEMPLATE, false, true),
      ],
      [],
      [
        ethereumMainnetUniswapSwapProvider
      ],
      [
        ethereumMainnetBinanceBridgeProvider,
        ethereumMainnetShadowTokenBridgeProvider,
        ethereumMainnetGlideBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new EthereumMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 15;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
