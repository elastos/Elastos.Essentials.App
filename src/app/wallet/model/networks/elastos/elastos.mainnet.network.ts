import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { ERC20Coin } from "../../coin";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { ElastosMainnetUniswapCurrencyProvider } from "./currency/elastos.uniswap.currency.provider";
import { elastosMainnetElkBridgeProvider, elastosMainnetGlideBridgeProvider, elastosMainnetShadowTokenBridgeProvider } from "./earn/bridge.providers";
import { elastosMainnetElkEarnProvider } from "./earn/earn.providers";
import { elastosMainnetElkSwapProvider, elastosMainnetGlideSwapProvider } from "./earn/swap.providers";
import { ElastosIdentityChainNetworkBase, ElastosMainChainNetworkBase, ElastosSmartChainNetworkBase } from "./elastos.base.network";
import { ElastosPasarERC1155Provider } from "./nfts/pasar.provider";

/**
 * Elastos main chain
 */
export class ElastosMainChainMainNetNetwork extends ElastosMainChainNetworkBase {
  constructor() {
    super("elastos", "Elastos main chain", MAINNET_TEMPLATE);
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }

  public supportsERC20Coins() {
    return false;
  }

  public supportsERCNFTs() {
    return false;
  }
}

/**
 * Elastos smart chain
 */
export class ElastosSmartChainMainNetNetwork extends ElastosSmartChainNetworkBase {
  private uniswapCurrencyProvider: ElastosMainnetUniswapCurrencyProvider = null;

  constructor() {
    super(
      "elastossmartchain",
      "Elastos smart chain",
      MAINNET_TEMPLATE,
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
      ],
      [
        new ElastosPasarERC1155Provider()
      ]
    );

    this.uniswapCurrencyProvider = new ElastosMainnetUniswapCurrencyProvider();
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
    onGoingConfig['ETHSC'] = { ChainID: 20, NetworkID: 20 };
  }
}

/**
 * Elastos EID chain (EVM based)
 */
export class ElastosIdentityChainMainNetNetwork extends ElastosIdentityChainNetworkBase {
  constructor() {
    super("elastosidchain", "Elastos identity chain", MAINNET_TEMPLATE);
  }

  public getMainChainID(): number {
    return 22; // ETHDID
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHDID'] = { ChainID: 22, NetworkID: 22 };
  }
}