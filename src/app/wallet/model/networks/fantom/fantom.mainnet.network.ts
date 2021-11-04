import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../coin";
import { EVMNetwork } from "../evm.network";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { FantomMainnetUniswapCurrencyProvider } from "./currency/fantom.uniswap.currency.provider";
import { fantomMainnetElkBridgeProvider } from "./earn/bridge.providers";
import { fantomMainnetElkEarnProvider } from "./earn/earn.providers";
import { fantomMainnetElkSwapProvider } from "./earn/swap.providers";
import { FantomAPI, FantomApiType } from "./fantom.api";

export class FantomMainNetNetwork extends EVMNetwork {
  private uniswapCurrencyProvider: FantomMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "fantom",
      "Fantom",
      "assets/wallet/networks/fantom.png",
      "FTM",
      "Fantom Token",
      FantomAPI.getApiUrl(FantomApiType.RPC, MAINNET_TEMPLATE),
      FantomAPI.getApiUrl(FantomApiType.ACCOUNT_RPC, MAINNET_TEMPLATE),
      MAINNET_TEMPLATE,
      250,
      [
        new ERC20Coin("ETH", "Fantom ETH", "0x658b0c7613e890ee50b8c4bc6a3f41ef411208ad", 18, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("USDC", "Fantom USDC", "0x04068da6c83afcfa0e13ba15a6696662335d5b75", 6, MAINNET_TEMPLATE, false, true),
        new ERC20Coin("LINK", "ChainLink", "0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8", 18, MAINNET_TEMPLATE, false, true)
      ],
      [
        fantomMainnetElkEarnProvider
      ],
      [
        fantomMainnetElkSwapProvider
      ],
      [
        fantomMainnetElkBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new FantomMainnetUniswapCurrencyProvider();
    this.averageBlocktime = 5 // 1;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
