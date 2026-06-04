import { Logger } from 'src/app/logger';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { CoinID, ERC20Coin, StandardCoinName } from 'src/app/wallet/model/coin';
import { AccountAbstractionMasterWallet } from 'src/app/wallet/model/masterwallets/account.abstraction.masterwallet';
import type { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import type { MasterWallet, StandardMasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { PrivateKeyType, WalletNetworkOptions, WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { NetworkAPIURLType } from '../../../../base/networkapiurltype';
import type { AnyNetworkWallet } from '../../../../base/networkwallets/networkwallet';
import { ERC20SubWallet } from '../../../../evms/subwallets/erc20.subwallet';
import { UniswapCurrencyProvider } from '../../../../evms/uniswap.currencyprovider';
import { ElastosEVMNetwork } from '../../../network/elastos.evm.network';
import { ElastosECOOracleCustomCurrencyProvider } from '../currency/eco.oracle.custom.currency.provider';
import { EcoERC20SubWallet } from '../subwallets/eco.erc20.subwallet';

export abstract class ElastosECONetworkBase extends ElastosEVMNetwork<WalletNetworkOptions> {
  public static NETWORK_KEY = 'elastoseco';

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const ElastosECOChainStandardNetworkWallet = (await import('../networkwallets/standard/eco.networkwallet'))
          .ElastosECOChainStandardNetworkWallet;
        return new ElastosECOChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        const ElastosECOLedgerNetworkWallet = (await import('../networkwallets/ledger/eco.networkwallet'))
          .ElastosECOLedgerNetworkWallet;
        return new ElastosECOLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      case WalletType.ACCOUNT_ABSTRACTION:
        const ElastosECOChainAccountAbstractionNetworkWallet = (
          await import('../networkwallets/account-abstraction/eco.networkwallet')
        ).ElastosECOAccountAbstractionNetworkWallet;
        return new ElastosECOChainAccountAbstractionNetworkWallet(masterWallet as AccountAbstractionMasterWallet, this);
      default:
        Logger.warn('wallet', 'Elastos ECO does not support ', masterWallet.type);
        return null;
    }
  }

  public async createERC20SubWallet(
    networkWallet: AnyNetworkWallet,
    coinID: CoinID,
    startBackgroundUpdates = true
  ): Promise<ERC20SubWallet> {
    let subWallet = new EcoERC20SubWallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates) void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getEVMSPVConfigName(): string {
    return StandardCoinName.ETHECO;
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
    };
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    // None by default. If this method is not overriden by the network,
    // the network can't handle any import by private key
    return [PrivateKeyType.EVM];
  }

  public getMainColor(): string {
    return '535353';
  }

  /*
   * Unit: sela
   */
  public getCrossChainFee(): number {
    // The minimum gas price set for eco sidechain is 50, The gas limit for cross chain transactions is approximately 21512,
    // so the fee set in the SDK is 150000.
    return 150000;
  }
}

/**
 * Elastos PGP ECO Chain
 */
export class ElastosECOMainNetNetwork extends ElastosECONetworkBase {
  constructor() {
    super(
      ElastosECONetworkBase.NETWORK_KEY,
      'Elastos PGP ECO Chain',
      'ECO',
      'assets/wallet/networks/elastos-eco.svg',
      MAINNET_TEMPLATE,
      12343,
      [
        {
          name: 'Official Elastos Node',
          url: 'https://api.elastos.io/eco'
        },
        {
          name: 'Official Elastos Node 2',
          url: 'https://api2.elastos.io/eco'
        },
        {
          name: '大陆高防BGP节点',
          url: 'https://pgpnode.battlechicken.cn'
        },
        {
          name: '全球备用节点',
          url: 'https://sknode.pgachain.org'
        },
        {
          name: 'Hong Kong Node',
          url: 'https://node.shenzhou-crypto.com'
        }
      ]
    );

    this.builtInCoins = [
      new ERC20Coin(this, 'USDT', 'PGA-USDT', '0x1C4E7cd89ea67339d4A5ed2780703180a19757d7', 18, false, true),
      new ERC20Coin(this, 'BTCD', 'BTC Dollar', '0x45ec25a63e010BFb84629242f40DDa187f83833E', 18, false, true),
      new ERC20Coin(this, 'FIST', 'FIST on ECO', '0x67d8183f13043Be52F64FB434F1AA5e5d1C58775', 18, false, true),
      new ERC20Coin(this, 'PGA', 'PanGu Asset', '0x8152557DD7d8dBFa2E85EaE473f8B897a5b6CCA9', 18, false, true)
    ];

    // this.uniswapCurrencyProvider = new ElastosECOPGProvider(this);
    this.customCurrencyProviders.push(new ElastosECOOracleCustomCurrencyProvider(this));
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHECO),
        MAINNET_TEMPLATE
      );
    else if (type === NetworkAPIURLType.ETHERSCAN) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHECO),
        MAINNET_TEMPLATE
      );
    } else if (type === NetworkAPIURLType.BLOCK_EXPLORER) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBlockExplorer(StandardCoinName.ETHECO),
        MAINNET_TEMPLATE
      );
    } else return null;
  }

  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
    // return this.uniswapCurrencyProvider;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return this.builtInCoins;
  }

  // When the user manually sets the gas price, it cannot be less than this value.
  // The unit is gwei.
  public getMinGasprice(): number {
    // return 50;
    return 1;
  }
}

export class ElastosECOTestNetNetwork extends ElastosECONetworkBase {
  constructor() {
    super(
      ElastosECONetworkBase.NETWORK_KEY,
      'ECO Testnet',
      'ECO Testnet',
      'assets/wallet/networks/elastos-eco.svg',
      TESTNET_TEMPLATE,
      800007,
      [
        {
          name: 'Elastos ECO Chain Testnet RPC',
          url: GlobalElastosAPIService.instance.getApiUrl(
            GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHECO),
            TESTNET_TEMPLATE
          )
        }
      ]
    );
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHECO),
        TESTNET_TEMPLATE
      );
    else if (type === NetworkAPIURLType.ETHERSCAN) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHECO),
        TESTNET_TEMPLATE
      );
    } else if (type === NetworkAPIURLType.BLOCK_EXPLORER) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBlockExplorer(StandardCoinName.ETHECO),
        TESTNET_TEMPLATE
      );
    } else return null;
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }

  // When the user manually sets the gas price, it cannot be less than this value.
  // The unit is gwei.
  public getMinGasprice(): number {
    // return 50;
    return 1;
  }
}
