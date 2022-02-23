import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { SPVNetworkConfig } from "../../../../services/wallet.service";
import { CoinID, ERC20Coin, StandardCoinName } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { ElastosWalletNetworkOptions, PrivateKeyType, WalletNetworkOptions, WalletType } from "../../../masterwallets/wallet.types";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { ERC1155Provider } from "../../evms/nfts/erc1155.provider";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { Network } from "../../network";
import { ElastosMainChainLedgerNetworkWallet } from "../networkwallets/ledger/mainchain.networkwallet";
import { ElastosIdentityChainStandardNetworkWallet } from "../networkwallets/standard/identitychain.networkwallet";
import { ElastosMainChainStandardNetworkWallet } from "../networkwallets/standard/mainchain.networkwallet";
import { ElastosSmartChainStandardNetworkWallet } from "../networkwallets/standard/smartchain.networkwallet";
import { ElastosERC20SubWallet } from "../subwallets/elastos.erc20.subwallet";

export abstract class ElastosNetworkBase<WalletNetworkOptionsType extends WalletNetworkOptions> extends Network<WalletNetworkOptionsType> {

  constructor(
    key: string,
    displayName: string,
    networkTemplate: string,
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[],
    erc1155Providers?: ERC1155Provider[]) {
    super(
      key,
      displayName,
      "assets/wallet/networks/elastos.svg",
      networkTemplate,
      earnProviders,
      swapProviders,
      bridgeProviders,
      erc1155Providers);
  }

  protected async initCreatedNetworkWallet(wallet: AnyNetworkWallet, startBackgroundUpdates: boolean): Promise<AnyNetworkWallet> {
    await wallet.initialize();
    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();
    return wallet;
  }

  public async createERC20SubWallet(networkWallet: AnyNetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    let subWallet = new ElastosERC20SubWallet(networkWallet, coinID);
    await subWallet.initialize();
    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();
    return subWallet;
  }

  public getMainEvmRpcApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForRpc(StandardCoinName.ETHSC));
  }

  public getMainEvmAccountApiUrl(): string {
    return GlobalElastosAPIService.instance.getApiUrl(GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(StandardCoinName.ETHSC));
  }

  public getMainTokenSymbol(): string {
    return 'ELA';
  }

  public getBuiltInERC20Coins(): ERC20Coin[] {
    return [];
  }

  public abstract getMainChainID(): number;

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig);
}

export abstract class ElastosMainChainNetworkBase extends ElastosNetworkBase<ElastosWalletNetworkOptions> {
  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new ElastosMainChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      case WalletType.LEDGER:
        wallet = new ElastosMainChainLedgerNetworkWallet(masterWallet as LedgerMasterWallet, this);
        break;
      default:
        return null;
    }

    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public getDefaultWalletNetworkOptions(): ElastosWalletNetworkOptions {
    return {
      network: this.key,
      singleAddress: true
    }
  }
}

export abstract class ElastosSmartChainNetworkBase extends ElastosNetworkBase<WalletNetworkOptions> {
  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new ElastosSmartChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      default:
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

export abstract class ElastosIdentityChainNetworkBase extends ElastosNetworkBase<WalletNetworkOptions> {
  public createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new ElastosIdentityChainStandardNetworkWallet(masterWallet as StandardMasterWallet, this);
        break;
      default:
        return null;
    }

    return this.initCreatedNetworkWallet(wallet, startBackgroundUpdates);
  }

  public supportsERC20Coins() {
    return false;
  }

  public supportsERCNFTs() {
    return false;
  }

  public getDefaultWalletNetworkOptions(): WalletNetworkOptions {
    return {
      network: this.key
    }
  }
}