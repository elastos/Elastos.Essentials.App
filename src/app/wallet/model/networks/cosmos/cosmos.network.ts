import { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Subject } from "rxjs";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { Coin, CoinID, CoinType, ERC20Coin } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { PrivateKeyType, WalletNetworkOptions } from "../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../base/networkapiurltype";
import { Network } from "../network";

export abstract class CosmosNetwork extends Network<WalletNetworkOptions> {
  private availableCoins: Coin[] = null;
  private deletedERC20Coins: ERC20Coin[] = [];

  public onCoinAdded: Subject<string> = new Subject(); // Event - when a coin is added - provides the coin ID
  public onCoinDeleted: Subject<string> = new Subject(); // Event - when a coin is added - provides the coin ID

  protected averageBlocktime = 5; // Unit Second
  protected mainRpcUrl: string = null;
  private lastAccessTimestamp = 0;
  private localStorageKey = ''

  constructor(
    public key: string, // unique identifier
    name: string, // Human readable network name - Elastos, HECO
    public shortName: string,
    public logo: string, // Path to the network icon
    protected mainTokenSymbol: string, // Symbol of the main EVM token: Ex: HT, BSC...
    protected mainTokenFriendlyName: string, // Ex: Huobi Token
    networkTemplate: string, // For which network template is this network available
    protected addressPrefix: string,
    protected hdPath: string,
    protected builtInCoins?: ERC20Coin[],
    earnProviders: EarnProvider[] = [],
    swapProviders: SwapProvider[] = [],
    bridgeProviders: BridgeProvider[] = [],
  ) {
    super(key, name, shortName, logo, "Cosmos" + key.toUpperCase(), networkTemplate, earnProviders, swapProviders, bridgeProviders, [], []);
  }

  public async init(): Promise<void> {
    await super.init();

    const activeNetworkTemplate = GlobalNetworksService.instance.activeNetworkTemplate.value;
    this.localStorageKey = this.key + '-' + activeNetworkTemplate;

    await this.initCoins();
  }

  public getDefaultWalletNetworkOptions(): WalletNetworkOptions {
    return {
      network: this.key
    }
  }

  /**
   * Live update of this network instance info. Used for example when a custom network info is modified
   * by the user.
   */
  public updateInfo(name: string, prefix: string, hdPath: string, rpcUrl: string, mainCurrencySymbol: string) {
    this.name = name;
    this.addressPrefix = prefix;
    this.hdPath = hdPath;
    this.mainRpcUrl = rpcUrl;
    this.mainTokenFriendlyName = mainCurrencySymbol;
    this.mainTokenSymbol = mainCurrencySymbol;
  }

  /**
   * Returns a list of available ERC20 coins that we trust for this network, and that user will be able to
   * display on this wallet or not.
   */
  public getBuiltInERC20Coins(): ERC20Coin[] {
    return this.builtInCoins || [];
  }

  private async initCoins() {
    this.availableCoins = [];
  }

  public getAvailableCoins(): Coin[] {
    // Return only coins that are usable on the active network.
    return this.availableCoins || [];
  }

  public getAvailableERC20Coins(): ERC20Coin[] {
    // Return only ERC20 coins that are usable on the active network.
    return this.getAvailableCoins().filter(c => {
      return (c.getType() === CoinType.ERC20);
    }) as ERC20Coin[] || [];
  }

  public getCoinByID(id: CoinID): Coin {
    return this.getAvailableCoins().find((c) => {
      return c.getID() === id;
    });
  }

  public getERC20CoinByContractAddress(address: string): ERC20Coin | null {
    return this.getAvailableERC20Coins().find((c) => {
      return c.getContractAddress().toLowerCase() === address.toLowerCase();
    }) || null;
  }

  public coinAlreadyExists(address: string): boolean {
    return this.getERC20CoinByContractAddress(address) != null;
  }

  public isCoinDeleted(address: string) {
    for (let coin of this.deletedERC20Coins) {
      if (coin.getContractAddress().toLowerCase() === address.toLowerCase()) return true;
    }
    return false;
  }

  /**
  * Returns the url of a target api type. This method must be overriden by most networks to define
  * one or several available API endpoing such as the main RPC node, covalent, etherscan, etc.
  *
  * For custom networks, only mainRpcUrl is loaded from disk and returned.
  */
  public getAPIUrlOfType(type: NetworkAPIURLType): string {
    if (type === NetworkAPIURLType.RPC) {
      if (this.mainRpcUrl)
        return this.mainRpcUrl;
      else
        throw Error(`CosmosNetwork: getAPIUrlOfType() default implementation called for RPC type, but mainRpcUrl is undefined`);
    }
    else
      throw new Error(`CosmosNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainTokenSymbol(): string {
    return this.mainTokenSymbol;
  }

  public getMainChainID(networkTemplate?: string): number {
    return 0;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.EVM];
  }

  public supportsERC20Coins(): boolean {
    return false;
  }

  public supportsERCNFTs(): boolean {
    return false;
  }

  public isEVMNetwork(): boolean {
    return false;
  }
}