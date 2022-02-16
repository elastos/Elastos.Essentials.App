import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { ERC20Coin } from "../../coin";
import { ElastosIdentityChainNetworkWallet } from "../../wallets/elastos/networkwallets/identitychain.networkwallet";
import { ElastosMainChainNetworkWallet } from "../../wallets/elastos/networkwallets/mainchain.networkwallet";
import { ElastosSmartChainNetworkWallet } from "../../wallets/elastos/networkwallets/smartchain.networkwallet";
import { MasterWallet } from "../../wallets/masterwallet";
import { NetworkWallet } from "../../wallets/networkwallet";
import { UniswapCurrencyProvider } from "../uniswap.currencyprovider";
import { ElastosMainnetUniswapCurrencyProvider } from "./currency/elastos.uniswap.currency.provider";
import { elastosMainnetElkBridgeProvider, elastosMainnetGlideBridgeProvider, elastosMainnetShadowTokenBridgeProvider } from "./earn/bridge.providers";
import { elastosMainnetElkEarnProvider } from "./earn/earn.providers";
import { elastosMainnetElkSwapProvider, elastosMainnetGlideSwapProvider } from "./earn/swap.providers";
import { ElastosNetworkBase } from "./elastos.base.network";
import { ElastosPasarERC1155Provider } from "./nfts/pasar.provider";

/**
 * Elastos main chain
 */
export class ElastosMainChainMainNetNetwork extends ElastosNetworkBase {
  constructor() {
    super("elastos", "Elastos main chain", MAINNET_TEMPLATE);
  }

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosMainChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ELA'] = {};
    onGoingConfig['IDChain'] = {};
  }
}

/**
 * Elastos smart chain
 */
export class ElastosSmartChainMainNetNetwork extends ElastosNetworkBase {
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

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosSmartChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
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
export class ElastosIdentityChainMainNetNetwork extends ElastosNetworkBase {
  constructor() {
    super("elastosidchain", "Elastos identity chain", MAINNET_TEMPLATE);
  }

  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<NetworkWallet> {
    let wallet = new ElastosIdentityChainNetworkWallet(masterWallet, this);
    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public getMainChainID(): number {
    return 22; // ETHDID
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHDID'] = { ChainID: 22, NetworkID: 22 };
  }
}