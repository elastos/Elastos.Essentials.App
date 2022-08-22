import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "../../../coin";
import { UniswapCurrencyProvider } from "../../evms/uniswap.currencyprovider";
import { FantomMainnetUniswapCurrencyProvider } from "../currency/fantom.uniswap.currency.provider";
import { fantomMainnetElkBridgeProvider } from "../earn/bridge.providers";
import { fantomMainnetElkEarnProvider } from "../earn/earn.providers";
import { fantomMainnetElkSwapProvider } from "../earn/swap.providers";
import { FantomBaseNetwork } from "./fantom.base.network";

export class FantomMainNetNetwork extends FantomBaseNetwork {
  private uniswapCurrencyProvider: FantomMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "fantom",
      "Fantom",
      "Fantom",
      "assets/wallet/networks/fantom.png",
      "FTM",
      "Fantom Token",
      MAINNET_TEMPLATE,
      250,
      [],
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

    this.builtInCoins = [
      new ERC20Coin(this, "ETH", "Fantom ETH", "0x658b0c7613e890ee50b8c4bc6a3f41ef411208ad", 18, false, true),
      new ERC20Coin(this, "USDC", "Fantom USDC", "0x04068da6c83afcfa0e13ba15a6696662335d5b75", 6, false, true),
      new ERC20Coin(this, "LINK", "ChainLink", "0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8", 18, false, true)
    ];

    this.uniswapCurrencyProvider = new FantomMainnetUniswapCurrencyProvider(this);
    this.averageBlocktime = 5 // 1;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }
}
