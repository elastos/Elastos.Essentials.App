import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { EthereumMainnetUniswapCurrencyProvider } from "../currency/eth.uniswap.currency.provider";
import { ethereumMainnetBinanceBridgeProvider, ethereumMainnetGlideBridgeProvider, ethereumMainnetShadowTokenBridgeProvider } from "../earn/bridge.providers";
import { ethereumMainnetUniswapSwapProvider } from "../earn/swap.providers";
import { EthereumAPI, EthereumAPIType } from "./ethereum.api";
import { EthereumBaseNetwork } from "./ethereum.base.network";

// https://rpc.info/#ethereum-rpc
export class EthereumMainNetNetwork extends EthereumBaseNetwork {
  private uniswapCurrencyProvider: EthereumMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "ethereum",
      "Ethereum",
      "Ethereum",
      "assets/wallet/networks/ethereum.png",
      "ETH",
      "ETH",
      MAINNET_TEMPLATE,
      1,
      [],
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

    this.builtInCoins = [
      new ERC20Coin(this, "ELA", "ELA on Ethereum", "0xe6fd75ff38Adca4B97FBCD938c86b98772431867", 18, false, true),
      new ERC20Coin(this, "BNB", "BNB", "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", 18, false, true),
      new ERC20Coin(this, "USDT", "USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7", 6, false, true),
      new ERC20Coin(this, "USDC", "USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, false, true),
      new ERC20Coin(this, "UNI", "Uniswap", "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", 18, false, true),
      new ERC20Coin(this, "LINK", "ChainLink", "0x514910771af9ca656af840dff83e8264ecf986ca", 18, false, true),
    ];

    this.uniswapCurrencyProvider = new EthereumMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 15;
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return EthereumAPI.getApiUrl(EthereumAPIType.RPC, "mainnet");
    else if (type === NetworkAPIURLType.ETHERSCAN)
      return EthereumAPI.getApiUrl(EthereumAPIType.ETHERSCAN_API, "mainnet");
    else
      throw new Error(`EthereumMainNetNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
