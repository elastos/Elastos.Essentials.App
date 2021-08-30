import { Subject } from "rxjs";
import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { GlobalPreferencesService } from "src/app/services/global.preferences.service";
import { WalletNetworkService } from "../../services/network.service";
import { LocalStorage } from "../../services/storage.service";
import { SPVNetworkConfig } from "../../services/wallet.service";
import { Coin, CoinID, CoinType, ERC20Coin, StandardCoinName } from "../Coin";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { MasterWallet } from "../wallets/masterwallet";
import { NetworkWallet } from "../wallets/networkwallet";

export abstract class Network {
  private availableCoins: Coin[] = null;
  private deletedERC20Coins: ERC20Coin[] = [];

  private activeNetworkTemplate: string;

  public onCoinAdded: Subject<string> = new Subject(); // Event - when a coin is added - provides the coin ID
  public onCoinDeleted: Subject<string> = new Subject(); // Event - when a coin is added - provides the coin ID

  constructor(
    public key: string, // unique identifier
    public name: string, // Human readable network name - Elastos, HECO
    public logo: string // Path to the network icon
  ) {
    this.activeNetworkTemplate = GlobalNetworksService.instance.getActiveNetworkTemplate();
  }

  public async init(): Promise<void> {
    await this.refreshCoins();
  }

  /**
   * Returns a list of available ERC20 coins that we trust for this network, and that user will be able to
   * display on this wallet or not.
   */
  public abstract getBuiltInERC20Coins(networkTemplate: string): ERC20Coin[];

  /**
   * Creates a network wallet for the given master wallet.
   * If startBackgroundUpdates is true some initializations such as getting balance or transactions are launched in background.
   * Otherwise, startBackgroundUpdates() has to be called manually later on the network wallet.
   */
  public abstract createNetworkWallet(masterWallet: MasterWallet, startBackgroundUpdates?: boolean): Promise<NetworkWallet>;

  /**
   * Creates the right ERC20 sub wallet instance for this network.
   */
  public abstract createERC20SubWallet(networkWallet: NetworkWallet, coinID: CoinID): ERC20SubWallet;

  public abstract getMainEvmRpcApiUrl(): string;

  public abstract getMainTokenSymbol(): string;

  /**
   * Returns the EVM chain ID for this network (i.e. 128 for heco) according to the active network template.
   * For elastos, as there are multiple EVM chains, the ETHSC is the "main" one.
   */
  public abstract getMainChainID(networkTemplate?: string): number;

  public abstract updateSPVNetworkConfig(onGoingConfig: SPVNetworkConfig, networkTemplate: string);


  private async refreshCoins() {
    Logger.log("wallet", "Coin service - refreshing available coins");

    this.availableCoins = [];

    // Add default ERC20 tokens built-in essentials
    this.availableCoins = this.getBuiltInERC20Coins(this.activeNetworkTemplate);

    // Add custom ERC20 tokens, manually added by the user or discovered
    this.availableCoins = [...this.availableCoins, ...await this.getCustomERC20Coins()];

    await this.initDeletedCustomERC20Coins(this);

    Logger.log('wallet', "Available coins for network " + this.key + ":", this.availableCoins);
    Logger.log('wallet', "Deleted coins for network " + this.key + ":", this.deletedERC20Coins);
  }

  public getAvailableCoins(): Coin[] {
    // Return only coins that are usable on the active network.
    return this.availableCoins.filter(c => {
      return c.networkTemplate == null || c.networkTemplate === this.activeNetworkTemplate;
    });
  }

  public getAvailableERC20Coins(): ERC20Coin[] {
    // Return only ERC20 coins that are usable on the active network.
    return this.availableCoins.filter(c => {
      return (c.networkTemplate == null || c.networkTemplate === this.activeNetworkTemplate) && (c.getType() === CoinType.ERC20);
    }) as ERC20Coin[];
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
    existingCoins.push(erc20Coin);

    if (this.coinAlreadyExists(erc20Coin.getContractAddress())) {
      Logger.log('wallet', "Not adding coin, it already exists", erc20Coin);
      return false;
    }

    // Add to the available coins list
    this.availableCoins.push(erc20Coin);

    // Save to permanent storage
    await LocalStorage.instance.set("custom-erc20-coins-" + this.key, existingCoins);

    this.deletedERC20Coins = this.deletedERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== coin.getContractAddress().toLowerCase());
    await LocalStorage.instance.set("custom-erc20-coins-deleted-" + this.key, this.deletedERC20Coins);

    // Activate this new coin in all wallets
    /* TODO: MIGRATE THIS - WE DON4T ACTIVATE HERE - THE CALLER SHOULD ACTIVATE IN THE RIGHT NETWORK WALLT
     for (let wallet of activateInWallets) {
      // Make sure user has the ETH sidechain enabled
      if (!wallet.hasSubWallet(StandardCoinName.ETHSC)) {
        console.warn("Wallet doesn't have ESC. No activating the new ERC token");
        continue;
      }

      await wallet.createNonStandardSubWallet(erc20Coin);
    } */

    this.onCoinAdded.next(erc20Coin.getID());

    return true;
  }

  public async deleteERC20Coin(erc20Coin: ERC20Coin) {
    this.availableCoins = this.availableCoins.filter((coin) => coin.getID() !== erc20Coin.getID());
    let allCustomERC20Coins = await this.getCustomERC20Coins();
    allCustomERC20Coins = allCustomERC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== erc20Coin.getContractAddress().toLowerCase());
    await LocalStorage.instance.set("custom-erc20-coins-" + this.key, allCustomERC20Coins);
    Logger.log('wallet', 'availableCoins after deleting', this.availableCoins);

    this.deletedERC20Coins.push(erc20Coin);
    await LocalStorage.instance.set("custom-erc20-coins-deleted-" + this.key, this.deletedERC20Coins);

    this.onCoinDeleted.next(erc20Coin.getID());
  }

  public async getCustomERC20Coins(): Promise<ERC20Coin[]> {
    const rawCoinList = await LocalStorage.instance.get("custom-erc20-coins-" + this.key);
    if (!rawCoinList) {
      return [];
    }

    const customCoins: ERC20Coin[] = [];
    for (let rawCoin of rawCoinList) {
      let coin = ERC20Coin.fromJson(rawCoin);
      if (!this.coinAlreadyExists(coin.getContractAddress()))
        customCoins.push();
    }

    return customCoins;
  }

  private async initDeletedCustomERC20Coins(network: Network): Promise<ERC20Coin[]> {
    const rawCoinList = await LocalStorage.instance.get("custom-erc20-coins-deleted-" + network.key);
    if (!rawCoinList) {
      return [];
    }

    let deletedERC20Coins: ERC20Coin[] = [];
    for (let rawCoin of rawCoinList) {
      deletedERC20Coins.push(ERC20Coin.fromJson(rawCoin));
    }

    this.deletedERC20Coins = deletedERC20Coins;
  }
}