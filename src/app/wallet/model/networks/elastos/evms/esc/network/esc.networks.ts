import { Logger } from "src/app/logger";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin } from "src/app/wallet/model/coin";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import { UniswapCurrencyProvider } from "../../../../evms/uniswap.currencyprovider";
import { ElastosNetworkBase } from "../../../network/elastos.base.network";
import { ElastosMainnetUniswapCurrencyProvider } from "../currency/elastos.uniswap.currency.provider";
import { elastosMainnetElkBridgeProvider, elastosMainnetGlideBridgeProvider, elastosMainnetShadowTokenBridgeProvider } from "../earn/bridge.providers";
import { elastosMainnetElkEarnProvider } from "../earn/earn.providers";
import { elastosMainnetElkSwapProvider, elastosMainnetGlideSwapProvider } from "../earn/swap.providers";
import { ElastosSmartChainLedgerNetworkWallet } from "../networkwallets/ledger/smartchain.networkwallet";
import { ElastosSmartChainStandardNetworkWallet } from "../networkwallets/standard/smartchain.networkwallet";
import { ElastosPasarERC1155Provider } from "../nfts/pasar.provider";

export abstract class ElastosSmartChainNetworkBase extends ElastosNetworkBase<WalletNetworkOptions> {
  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new ElastosSmartChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      case WalletType.LEDGER:
        wallet = new ElastosSmartChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
        break;
      default:
        Logger.warn('wallet', 'Elastos Smart Chain does not support ', masterWallet.type);
        return null;
    }

    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public supportsERC20Coins() {
    return true;
  }

  public supportsERCNFTs() {
    return true;
  }

  public getDefaultWalletNetworkOptions(): WalletNetworkOptions {
    return {
      network: this.key
    }
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    // None by default. If this method is not overriden by the network,
    // the network can't handle any import by private key
    return [
      PrivateKeyType.EVM
    ];
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
      "assets/wallet/coins/ela-gray.svg",
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

export class ElastosSmartChainTestNetNetwork extends ElastosSmartChainNetworkBase {
  constructor() {
    super(
      "elastossmartchain",
      "Elastos smart chain Testnet",
      "assets/wallet/coins/ela-gray.svg",
      TESTNET_TEMPLATE
    );
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];
    availableCoins.push(new ERC20Coin("TTECH", "Trinity Tech", "0xFDce7FB4050CD43C654C6ceCeAd950343990cE75", 0, TESTNET_TEMPLATE, false));
    return availableCoins;
  }

  public getMainChainID(): number {
    return 21; // ETHSC is the main evm network for elastos
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHSC'] = { ChainID: 21, NetworkID: 21 };
  }
}
