import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { ERC20Coin } from "../../coin";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { ElastosMainnetUniswapCurrencyProvider } from "./currency/elastos.uniswap.currency.provider";
import { elastosMainnetElkBridgeProvider, elastosMainnetGlideBridgeProvider, elastosMainnetShadowTokenBridgeProvider } from "./earn/bridge.providers";
import { elastosMainnetElkEarnProvider } from "./earn/earn.providers";
import { elastosMainnetElkSwapProvider, elastosMainnetGlideSwapProvider } from "./earn/swap.providers";
import { ElastosNetworkBase } from "./elastos.base.network";

export class ElastosMainNetNetwork extends ElastosNetworkBase {
  private uniswapCurrencyProvider: ElastosMainnetUniswapCurrencyProvider = null;


  constructor() {
    super("Elastos",
      [
        elastosMainnetElkEarnProvider
      ],
      [
        elastosMainnetGlideSwapProvider,
        elastosMainnetElkSwapProvider
      ],
      [
        elastosMainnetGlideBridgeProvider,
        elastosMainnetShadowTokenBridgeProvider,
        elastosMainnetElkBridgeProvider
      ]
    );

    this.uniswapCurrencyProvider = new ElastosMainnetUniswapCurrencyProvider();

    // Remove it if block height > 1032840
    // Use new protocol after 1032840.
    this.blockHeightForCrossChainV2 = 1032840;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];

    availableCoins.push(new ERC20Coin("TTECH", "Trinity Tech", "0xa4e4a46b228f3658e96bf782741c67db9e1ef91c", 18, MAINNET_TEMPLATE, false));

    return availableCoins;
  }

  public getMainChainID(): number {
    return 20; // ETHSC is the main evm network for elastos
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
    onGoingConfig['ETHSC'] = { ChainID: 20, NetworkID: 20 };
    onGoingConfig['ETHDID'] = { ChainID: 22, NetworkID: 22 };
  }
}