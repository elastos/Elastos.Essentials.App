import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { MAINNET_TEMPLATE, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { CoinID, ERC20Coin, StandardCoinName } from "src/app/wallet/model/coin";
import type { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import type { MasterWallet, StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../../../base/networkwallets/networkwallet";
import { ElastosEVMNetwork } from "../../../network/elastos.evm.network";
import { ERC20SubWallet } from "../../../../evms/subwallets/erc20.subwallet";
import { PGPERC20SubWallet } from "../subwallets/pgp.erc20.subwallet";
import { ElastosECOPGPOracleCustomCurrencyProvider } from "../currency/pgp.oracle.custom.currency.provider";

export abstract class ElastosPGPNetworkBase extends ElastosEVMNetwork<WalletNetworkOptions> {
  public static NETWORK_KEY = "elastosecopgp";

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const ElastosPGPChainStandardNetworkWallet = (await import("../networkwallets/standard/pgp.networkwallet"))
          .ElastosPGPChainStandardNetworkWallet;
        return new ElastosPGPChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
      case WalletType.LEDGER:
        const ElastosPGPLedgerNetworkWallet = (await import("../networkwallets/ledger/pgp.networkwallet"))
          .ElastosPGPLedgerNetworkWallet;
        return new ElastosPGPLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
      default:
        Logger.warn('wallet', 'PGP does not support ', masterWallet.type);
        return null;
    }
  }

  public async createERC20SubWallet(
      networkWallet: AnyNetworkWallet,
      coinID: CoinID,
      startBackgroundUpdates = true
  ): Promise<ERC20SubWallet> {
    let subWallet = new PGPERC20SubWallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates) void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getEVMSPVConfigName(): string {
    return StandardCoinName.ETHECOPGP;
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

  public getMainTokenSymbol(): string {
    return 'PGA';
  }

  public getMainColor(): string {
    return '535353';
  }

  public getELATokenContract() {
    return "0x0000000000000000000000000000000000000065";
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
 * Elastos ECO Chain
 */
export class ElastosPGPMainNetNetwork extends ElastosPGPNetworkBase {
  constructor() {
    super(
      ElastosPGPNetworkBase.NETWORK_KEY,
      "PGP Chain",
      "PGP",
      // "assets/wallet/networks/pgp.png",
      'assets/wallet/networks/elastos-eco.svg',
      MAINNET_TEMPLATE,
      860621,
      [
        {
          name: 'Official Elastos Node',
          url: 'https://api.elastos.io/pg'
        },
        {
          name: 'Official Elastos Node 2',
          url: 'https://api2.elastos.io/pg'
        },
        {
          name: 'Official Elastos Node 3',
          url: 'https://pgp-node.elastos.io'
        }
      ]
    );

    this.builtInCoins = [
      new ERC20Coin(this, "ELA", "ELA on PGP", "0x0000000000000000000000000000000000000065", 8, false, true),
      new ERC20Coin(this, 'USDT', 'PGP-USDT', '0xdF72788af68E7902F61377D246Dd502b0b383385', 18, false, true),
      new ERC20Coin(this, 'BTCD', 'BTC Dollar', '0xF9BF836FEd97a9c9Bfe4D4c28316b9400C59Cc6B', 18, false, true),
      new ERC20Coin(this, 'FIST', 'FIST on PGP', '0x800E5c441b84a3E809E2ec922BeEE9f32f954B11', 18, false, true),
    ];

    this.customCurrencyProviders.push(new ElastosECOPGPOracleCustomCurrencyProvider(this));
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHECOPGP),
        MAINNET_TEMPLATE);
    else if (type === NetworkAPIURLType.ETHERSCAN) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHECOPGP),
        MAINNET_TEMPLATE);
    } else if (type === NetworkAPIURLType.BLOCK_EXPLORER) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBlockExplorer(StandardCoinName.ETHECOPGP),
        MAINNET_TEMPLATE);
    } else
      return null;
  }

  // When the user manually sets the gas price, it cannot be less than this value.
  // The unit is gwei.
  public getMinGasprice(): number {
    return 1;
  }
}

export class ElastosPGPTestNetNetwork extends ElastosPGPNetworkBase {
  constructor() {
    super(
      ElastosPGPNetworkBase.NETWORK_KEY,
      "PGP Testnet",
      "PGP Testnet",
      // "assets/wallet/networks/pgp.png",
      'assets/wallet/networks/elastos-eco.svg',
      TESTNET_TEMPLATE,
      12345,
      [
        {
          name: 'PGP Chain Testnet RPC',
          url: GlobalElastosAPIService.instance.getApiUrl(
            GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHECOPGP),
            TESTNET_TEMPLATE
          )
        }
      ]
    );

    this.builtInCoins = [
      new ERC20Coin(this, "ELA", "ELA on PGP", "0x0000000000000000000000000000000000000065", 8, false, true),
    ];

    this.customCurrencyProviders.push(new ElastosECOPGPOracleCustomCurrencyProvider(this));
  }

  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC)
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHECOPGP),
        TESTNET_TEMPLATE);
    else if (type === NetworkAPIURLType.ETHERSCAN) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHECOPGP),
        TESTNET_TEMPLATE);
    } else if (type === NetworkAPIURLType.BLOCK_EXPLORER) {
      return GlobalElastosAPIService.instance.getApiUrl(
        GlobalElastosAPIService.instance.getApiUrlTypeForBlockExplorer(StandardCoinName.ETHECOPGP),
        TESTNET_TEMPLATE);
    } else
      return null;
  }

  // When the user manually sets the gas price, it cannot be less than this value.
  // The unit is gwei.
  public getMinGasprice(): number {
    return 1;
  }
}
