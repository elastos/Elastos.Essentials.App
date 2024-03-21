import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Subject } from "rxjs";
import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { erc20CoinsSerializer } from "src/app/wallet/services/evm/erc20coin.service";
import { LocalStorage } from "src/app/wallet/services/storage.service";
import { Coin, CoinID, CoinType, ERC20Coin } from "../../coin";
import { BridgeProvider } from "../../earn/bridgeprovider";
import { EarnProvider } from "../../earn/earnprovider";
import { SwapProvider } from "../../earn/swapprovider";
import { PrivateKeyType, WalletNetworkOptions } from "../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../base/networkapiurltype";
import { AnyNetwork, Network } from "../network";
import { DexScreenerCurrencyProvider } from "./dexscreener.currencyprovider";
import { EVMNetworkWallet } from "./networkwallets/evm.networkwallet";
import { ERC1155Provider } from "./nfts/erc1155.provider";
import { ERC721Provider } from "./nfts/erc721.provider";
import { ERC20SubWallet } from "./subwallets/erc20.subwallet";
import { UniswapCurrencyProvider } from "./uniswap.currencyprovider";

export abstract class EVMNetwork extends Network<WalletNetworkOptions> {
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
    protected chainID: number,
    protected builtInCoins?: ERC20Coin[],
    earnProviders: EarnProvider[] = [],
    swapProviders: SwapProvider[] = [],
    bridgeProviders: BridgeProvider[] = [],
    erc1155Providers: ERC1155Provider[] = [],
    erc721Providers: ERC721Provider[] = []
  ) {
    super(key, name, shortName, logo, "ETH" + key.toUpperCase(), networkTemplate, earnProviders, swapProviders, bridgeProviders, erc1155Providers, erc721Providers);
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
  public updateInfo(name: string, chainId: number, rpcUrl: string, mainCurrencySymbol: string) {
    this.name = name;
    this.chainID = chainId;
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

    // Add default ERC20 tokens built-in essentials
    this.availableCoins = this.getBuiltInERC20Coins();

    // Add custom ERC20 tokens, manually added by the user or discovered
    this.availableCoins = [...this.availableCoins, ...await this.getCustomERC20Coins()];

    await this.initDeletedCustomERC20Coins(this);

    this.lastAccessTimestamp = await LocalStorage.instance.get("custom-erc20-coins-accesstime-" + this.localStorageKey);

    //Logger.log('wallet', "Available coins for network " + this.key + ":", this.availableCoins);
    //Logger.log('wallet', "Deleted coins for network " + this.key + ":", this.deletedERC20Coins);
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
   * Adds a custom ERC20 coin to the list of available coins.
   * The new coin is activated in all the wallets passed as activateInWallets.
   *
   * Returns true if the coin was added, false otherwise (already existing or error).
   */
  public async addCustomERC20Coin(erc20Coin: ERC20Coin): Promise<boolean> {
    Logger.log('wallet', "Adding coin to custom ERC20 coins list", erc20Coin);

    const existingCoins = await this.getCustomERC20Coins();
    if (this.coinAlreadyExists(erc20Coin.getContractAddress())) {
      Logger.log('wallet', "Not adding coin, it already exists", erc20Coin);
      return false;
    }

    existingCoins.push(erc20Coin);

    // Add to the available coins list
    this.availableCoins.push(erc20Coin);

    // Save to permanent storage
    await LocalStorage.instance.set("custom-erc20-coins-" + this.localStorageKey, erc20CoinsSerializer.serializeObjectArray(existingCoins));

    this.deletedERC20Coins = this.deletedERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== erc20Coin.getContractAddress().toLowerCase());
    await LocalStorage.instance.set("custom-erc20-coins-deleted-" + this.localStorageKey, erc20CoinsSerializer.serializeObjectArray(this.deletedERC20Coins));

    this.onCoinAdded.next(erc20Coin.getID());

    return true;
  }

  public async deleteERC20Coin(erc20Coin: ERC20Coin) {
    this.availableCoins = this.availableCoins.filter((coin) => coin.getID() !== erc20Coin.getID());
    let allCustomERC20Coins = await this.getCustomERC20Coins();
    allCustomERC20Coins = allCustomERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== erc20Coin.getContractAddress().toLowerCase());
    await LocalStorage.instance.set("custom-erc20-coins-" + this.localStorageKey, erc20CoinsSerializer.serializeObjectArray(allCustomERC20Coins));
    Logger.log('wallet', 'availableCoins after deleting', this.availableCoins);

    this.deletedERC20Coins.push(erc20Coin);
    await LocalStorage.instance.set("custom-erc20-coins-deleted-" + this.localStorageKey, erc20CoinsSerializer.serializeObjectArray(this.deletedERC20Coins));

    this.onCoinDeleted.next(erc20Coin.getID());
  }

  public async getCustomERC20Coins(): Promise<ERC20Coin[]> {
    const rawCoinList = await LocalStorage.instance.get("custom-erc20-coins-" + this.localStorageKey);
    if (!rawCoinList) {
      return [];
    }

    const customCoins: ERC20Coin[] = [];
    let someCoinsWereRemoved = false;
    for (let rawCoin of rawCoinList) {
      // Use the contract address as id.
      if ((rawCoin.id as string).startsWith('0x')) {
        let coin = ERC20Coin.fromJson(rawCoin, this);

        // Legacy support: we didn't save coins decimals earlier. So we delete custom coins from disk if we don't have the info.
        // Users have to re-add them manually.
        if (coin.decimals == -1) {
          someCoinsWereRemoved = true;
        }
        else {
          customCoins.push(coin);
        }
      }
    }

    if (someCoinsWereRemoved) {
      // Some coins were "repaired", so we save our list.
      await LocalStorage.instance.set("custom-erc20-coins-" + this.localStorageKey, erc20CoinsSerializer.serializeObjectArray(customCoins));
    }

    return customCoins;
  }

  private async initDeletedCustomERC20Coins(network: AnyNetwork): Promise<ERC20Coin[]> {
    const rawCoinList = await LocalStorage.instance.get("custom-erc20-coins-deleted-" + this.localStorageKey);
    if (!rawCoinList) {
      return [];
    }

    let deletedERC20Coins: ERC20Coin[] = [];
    for (let rawCoin of rawCoinList) {
      deletedERC20Coins.push(ERC20Coin.fromJson(rawCoin, network));
    }

    this.deletedERC20Coins = deletedERC20Coins;
  }

  public updateAccessTime(timestamp: number) {
    this.lastAccessTimestamp = timestamp;
    void LocalStorage.instance.set("custom-erc20-coins-accesstime-" + this.localStorageKey, this.lastAccessTimestamp);
  }

  // The last time that the user viewed the coin list screen.
  // We decide whether to display newly discovered tokens based on this time.
  public getLastAccessTime() {
    return this.lastAccessTimestamp;
  }

  /**
   * Returns the first provider able to support the provided erc1155 contract address
   */
  public getERC1155Provider(contractAddress: string): ERC1155Provider {
    let lowerCaseContract = contractAddress.toLowerCase();
    let provider = this.erc1155Providers.find(p => p.supportedContractAddresses.map(c => c.toLowerCase()).find(p => p.indexOf(lowerCaseContract) >= 0));
    return provider;
  }

  /**
   * Returns the first provider able to support the provided erc721 contract address
   */
  public getERC721Provider(contractAddress: string): ERC721Provider {
    let lowerCaseContract = contractAddress.toLowerCase();
    let provider = this.erc721Providers.find(p => p.supportedContractAddresses.map(c => c.toLowerCase()).find(p => p.indexOf(lowerCaseContract) >= 0));
    return provider;
  }

  /**
   * To be overriden by each network. By default, no provider is returned, meaning that ERC20 tokens
   * won't be able to get a USD pricing.
   */
  public getUniswapCurrencyProvider(): UniswapCurrencyProvider {
    return null;
  }

  /**
   * To be overriden by each network. By default, no provider is returned.
   */
  public getDexScreenerCurrencyProvider(): DexScreenerCurrencyProvider {
    return null;
  }

  /* public async createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates = true): Promise<AnyNetworkWallet> {
    let wallet: AnyNetworkWallet = null;
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        wallet = new StandardEVMNetworkWallet(masterWallet as StandardMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName, this.averageBlocktime);
        break;
      case WalletType.LEDGER:
        wallet = new LedgerEVMNetworkWallet(masterWallet as LedgerMasterWallet, this, this.getMainTokenSymbol(), this.mainTokenFriendlyName, this.averageBlocktime);
        break;
      default:
        return null;
    }

    await wallet.initialize();

    if (startBackgroundUpdates)
      void wallet.startBackgroundUpdates();

    return wallet;
  } */

  /**
 * Creates the right ERC20 sub wallet instance for this network.
 * If startBackgroundUpdates is true some initializations such as getting balance or transactions are launched in background.
 * Otherwise, startBackgroundUpdates() has to be called manually later on the network wallet.
 */
  public async createERC20SubWallet(networkWallet: EVMNetworkWallet<any, any>, coinID: CoinID, startBackgroundUpdates = true): Promise<ERC20SubWallet> {
    let subWallet = new ERC20SubWallet(networkWallet, coinID, networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC), "");
    await subWallet.initialize();

    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();

    return subWallet;
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
        throw Error(`EVMNetwork: getAPIUrlOfType() default implementation called for RPC type, but mainRpcUrl is undefined`);
    }
    else
      throw new Error(`EVMNetwork: getAPIUrlOfType() has no entry for url type ${type.toString()}`);
  }

  public getMainTokenSymbol(): string {
    return this.mainTokenSymbol;
  }

  /**
   * Returns the EVM chain ID for this network (i.e. 128 for heco) according to the active network template.
   * For elastos, as there are multiple EVM chains, the ETHSC is the "main" one.
   */
  public getMainChainID(networkTemplate?: string): number {
    return this.chainID;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo, networkTemplate: string) {
    onGoingConfig[this.getEVMSPVConfigName()] = {
      chainID: this.getMainChainID(networkTemplate).toString(),
      NetworkID: this.getMainChainID(networkTemplate).toString()
    };
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.EVM];
  }

  public supportsERC20Coins(): boolean {
    return true;
  }

  public supportsERCNFTs(): boolean {
    return true;
  }

  public isEVMNetwork(): boolean {
    return true;
  }

  // When the user manually sets the gas price, it cannot be less than this value.
  // The unit is gwei.
  public getMinGasprice(): number {
    return -1;
  }
}