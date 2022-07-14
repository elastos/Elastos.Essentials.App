import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { ERC20Coin, StandardCoinName } from "src/app/wallet/model/coin";
import type { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import type { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { NetworkAPIURLType } from "../../../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import type { UniswapCurrencyProvider } from "../../../../evms/uniswap.currencyprovider";
import { ElastosEVMNetwork } from "../../../network/elastos.evm.network";
import { ElastosMainnetUniswapCurrencyProvider } from "../currency/elastos.uniswap.currency.provider";
import { elastosMainnetElkBridgeProvider, elastosMainnetGlideBridgeProvider, elastosMainnetShadowTokenBridgeProvider } from "../earn/bridge.providers";
import { elastosMainnetElkEarnProvider } from "../earn/earn.providers";
import { elastosMainnetElkSwapProvider, elastosMainnetGlideSwapProvider } from "../earn/swap.providers";
import { ElastosMeteastERC721Provider } from "../nfts/meteast.provider";
import { ElastosPasarERC1155Provider } from "../nfts/pasar.provider";

export abstract class ElastosSmartChainNetworkBase extends ElastosEVMNetwork<WalletNetworkOptions> {
  public static NETWORK_KEY = "elastossmartchain";

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const ElastosSmartChainStandardNetworkWallet = (await import("../networkwallets/standard/smartchain.networkwallet")).ElastosSmartChainStandardNetworkWallet;
        return new ElastosSmartChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        const ElastosSmartChainLedgerNetworkWallet = (await import("../networkwallets/ledger/smartchain.networkwallet")).ElastosSmartChainLedgerNetworkWallet;
        return new ElastosSmartChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      default:
        Logger.warn('wallet', 'Elastos Smart Chain does not support ', masterWallet.type);
        return null;
    }
  }

  public getEVMSPVConfigName(): string {
    return StandardCoinName.ETHSC;
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
      ElastosSmartChainNetworkBase.NETWORK_KEY,
      "Elastos smart chain",
      "assets/wallet/coins/ela-gray.svg",
      MAINNET_TEMPLATE,
      20,
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
      ],
      [
        new ElastosMeteastERC721Provider()
      ]
    );

    this.uniswapCurrencyProvider = new ElastosMainnetUniswapCurrencyProvider();
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC), MAINNET_TEMPLATE);
    else if (type === NetworkAPIURLType.ETHERSCAN) {
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHSC), MAINNET_TEMPLATE);
    } else
      return null;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return this.uniswapCurrencyProvider;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];

    availableCoins.push(new ERC20Coin("GLIDE", "Glide", "0xd39eC832FF1CaaFAb2729c76dDeac967ABcA8F27", 18, MAINNET_TEMPLATE, false, true));
    availableCoins.push(new ERC20Coin("CREDA", "CreDA Protocol Token", "0xc136E6B376a9946B156db1ED3A34b08AFdAeD76d", 18, MAINNET_TEMPLATE, false, true));
    availableCoins.push(new ERC20Coin("FILDA", "FilDA on ESC", "0x00E71352c91Ff5B820ab4dF08bb47653Db4e32C0", 18, MAINNET_TEMPLATE, false, true));
    availableCoins.push(new ERC20Coin("ELK", "Elk", "0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE", 18, MAINNET_TEMPLATE, false, true));

    return availableCoins;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHSC'] = { ChainID: 20, NetworkID: 20 };
  }
}

export class ElastosSmartChainTestNetNetwork extends ElastosSmartChainNetworkBase {
  constructor() {
    super(
      ElastosSmartChainNetworkBase.NETWORK_KEY,
      "Elastos smart chain Testnet",
      "assets/wallet/coins/ela-gray.svg",
      TESTNET_TEMPLATE,
      21,
      [], [], [],
      [
        new ElastosPasarERC1155Provider()
      ]
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC), TESTNET_TEMPLATE);
    else if (type === NetworkAPIURLType.ETHERSCAN) {
      return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHSC), TESTNET_TEMPLATE);
    } else
      return null;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    let availableCoins: ERC20Coin[] = [];

    //availableCoins.push(new ERC20Coin("TTECH", "Trinity Tech", "0xFDce7FB4050CD43C654C6ceCeAd950343990cE75", 0, TESTNET_TEMPLATE, false));

    return availableCoins;
  }

  public updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig) {
    onGoingConfig['ETHSC'] = { ChainID: 21, NetworkID: 21 };
  }
}
