import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { SPVNetworkConfig } from "../../../services/wallet.service";
import { CoinID, ERC20Coin, StandardCoinName } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { ERC1155Provider } from "../../nfts/erc1155.provider";
import { ElastosWalletNetworkOptions, WalletNetworkOptions, WalletType } from "../../wallet.types";
import { ElastosERC20SubWallet } from "../../wallets/elastos/elastos.erc20.subwallet";
import { ElastosIdentityChainStandardNetworkWallet } from "../../wallets/elastos/standard/networkwallets/identitychain.networkwallet";
import { ElastosMainChainStandardNetworkWallet } from "../../wallets/elastos/standard/networkwallets/mainchain.networkwallet";
import { ElastosSmartChainStandardNetworkWallet } from "../../wallets/elastos/standard/networkwallets/smartchain.networkwallet";
import { ERC20SubWallet } from "../../wallets/erc20.subwallet";
import { MasterWallet, StandardMasterWallet } from "../../wallets/masterwallet";
import { AnyNetworkWallet } from "../../wallets/networkwallet";
import { Network } from "../network";

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