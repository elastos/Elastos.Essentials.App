import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Subject } from "rxjs";
import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { LocalStorage } from "src/app/wallet/services/storage.service";
import { trc20CoinsSerializer } from "src/app/wallet/services/tvm/trc20coin.service";
import { Coin, CoinID, CoinType, TRC20Coin } from "../../../coin";
import { BridgeProvider } from "../../../earn/bridgeprovider";
import { EarnProvider } from "../../../earn/earnprovider";
import { SwapProvider } from "../../../earn/swapprovider";
import type { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { PrivateKeyType, WalletNetworkOptions, WalletType } from "../../../masterwallets/wallet.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import type { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnyNetwork, Network } from "../../network";
import { TRC20SubWallet } from "../subwallets/trc20.subwallet";

export abstract class TronNetworkBase extends Network<WalletNetworkOptions> {
  public static networkKey = "tron";

  private availableCoins: Coin[] = null;
  private deletedTRC20Coins: TRC20Coin[] = [];

  public onCoinAdded: Subject<string> = new Subject(); // Event - when a coin is added - provides the coin ID
  public onCoinDeleted: Subject<string> = new Subject(); // Event - when a coin is added - provides the coin ID

  protected averageBlocktime = 5; // Unit Second
  protected mainRpcUrl: string = null;
  private lastAccessTimestamp = 0;
  private localStorageKey = ''

  constructor(
    displayName: string,
    networkTemplate: string,
    protected builtInCoins?: TRC20Coin[],
    earnProviders?: EarnProvider[],
    swapProviders?: SwapProvider[],
    bridgeProviders?: BridgeProvider[]) {
    super(
      TronNetworkBase.networkKey,
      displayName,
      displayName,
      "assets/wallet/networks/tron.svg",
      "TRON",
      networkTemplate,
      earnProviders,
      swapProviders,
      bridgeProviders);
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

  public async newNetworkWallet(masterWallet: MasterWallet): Promise<AnyNetworkWallet> {
    switch (masterWallet.type) {
      case WalletType.STANDARD:
        const StandardTronNetworkWallet = (await import("../networkwallets/standard/standard.tron.networkwallet")).StandardTronNetworkWallet;
        return new StandardTronNetworkWallet(masterWallet as StandardMasterWallet, this);
      default:
        Logger.warn('wallet', 'TRON does not support ', masterWallet.type);
        return null;
    }
  }

  /**
   * Returns a list of available TRC20 coins that we trust for this network, and that user will be able to
   * display on this wallet or not.
   */
  public getBuiltInTRC20Coins(): TRC20Coin[] {
    return this.builtInCoins || [];
  }

  private async initCoins() {
    this.availableCoins = [];

    // Add default TRC20 tokens built-in essentials
    this.availableCoins = this.getBuiltInTRC20Coins();

    // Add custom TRC20 tokens, manually added by the user or discovered
    this.availableCoins = [...this.availableCoins, ...await this.getCustomTRC20Coins()];

    await this.initDeletedCustomTRC20Coins(this);

    this.lastAccessTimestamp = await LocalStorage.instance.get("custom-trc20-coins-accesstime-" + this.localStorageKey);

    // Logger.log('wallet', "Available coins for network " + this.key + ":", this.availableCoins);
    // Logger.log('wallet', "Deleted coins for network " + this.key + ":", this.deletedTRC20Coins);
  }

  public getAvailableCoins(): Coin[] {
    // Return only coins that are usable on the active network.
    return this.availableCoins || [];
  }

  public getAvailableTRC20Coins(): TRC20Coin[] {
    // Return only TRC20 coins that are usable on the active network.
    return this.getAvailableCoins().filter(c => {
      return (c.getType() === CoinType.TRC20);
    }) as TRC20Coin[] || [];
  }

  public getCoinByID(id: CoinID): Coin {
    return this.getAvailableCoins().find((c) => {
      return c.getID() === id;
    });
  }

  public getTRC20CoinByContractAddress(address: string): TRC20Coin | null {
    return this.getAvailableTRC20Coins().find((c) => {
      return c.getContractAddress().toLowerCase() === address.toLowerCase();
    }) || null;
  }

  public coinAlreadyExists(address: string): boolean {
    return this.getTRC20CoinByContractAddress(address) != null;
  }

  public isCoinDeleted(address: string) {
    for (let coin of this.deletedTRC20Coins) {
      if (coin.getContractAddress().toLowerCase() === address.toLowerCase()) return true;
    }
    return false;
  }

  /**
   * Adds a custom TRC20 coin to the list of available coins.
   * The new coin is activated in all the wallets passed as activateInWallets.
   *
   * Returns true if the coin was added, false otherwise (already existing or error).
   */
  public async addCustomTRC20Coin(trc20Coin: TRC20Coin): Promise<boolean> {
    Logger.log('wallet', "Adding coin to custom TRC20 coins list", trc20Coin);

    const existingCoins = await this.getCustomTRC20Coins();
    if (this.coinAlreadyExists(trc20Coin.getContractAddress())) {
      Logger.log('wallet', "Not adding coin, it already exists", trc20Coin);
      return false;
    }

    existingCoins.push(trc20Coin);

    // Add to the available coins list
    this.availableCoins.push(trc20Coin);

    // Save to permanent storage
    await LocalStorage.instance.set("custom-trc20-coins-" + this.localStorageKey, trc20CoinsSerializer.serializeObjectArray(existingCoins));

    this.deletedTRC20Coins = this.deletedTRC20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== trc20Coin.getContractAddress().toLowerCase());
    await LocalStorage.instance.set("custom-trc20-coins-deleted-" + this.localStorageKey, trc20CoinsSerializer.serializeObjectArray(this.deletedTRC20Coins));

    this.onCoinAdded.next(trc20Coin.getID());

    return true;
  }

  public async deleteTRC20Coin(trc20Coin: TRC20Coin) {
    this.availableCoins = this.availableCoins.filter((coin) => coin.getID() !== trc20Coin.getID());
    let allCustomtrc20Coins = await this.getCustomTRC20Coins();
    allCustomtrc20Coins = allCustomtrc20Coins.filter((coin) => coin.getContractAddress().toLowerCase() !== trc20Coin.getContractAddress().toLowerCase());
    await LocalStorage.instance.set("custom-trc20-coins-" + this.localStorageKey, trc20CoinsSerializer.serializeObjectArray(allCustomtrc20Coins));
    Logger.log('wallet', 'availableCoins after deleting', this.availableCoins);

    this.deletedTRC20Coins.push(trc20Coin);
    await LocalStorage.instance.set("custom-trc20-coins-deleted-" + this.localStorageKey, trc20CoinsSerializer.serializeObjectArray(this.deletedTRC20Coins));

    this.onCoinDeleted.next(trc20Coin.getID());
  }

  public async getCustomTRC20Coins(): Promise<TRC20Coin[]> {
    const rawCoinList = await LocalStorage.instance.get("custom-trc20-coins-" + this.localStorageKey);
    if (!rawCoinList) {
      return [];
    }

    const customCoins: TRC20Coin[] = [];
    let someCoinsWereRemoved = false;
    for (let rawCoin of rawCoinList) {
      // Use the contract address as id.
      if ((rawCoin.id as string).startsWith('T')) {
        let coin = TRC20Coin.fromJson(rawCoin, this);

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
      await LocalStorage.instance.set("custom-trc20-coins-" + this.localStorageKey, trc20CoinsSerializer.serializeObjectArray(customCoins));
    }

    return customCoins;
  }

  private async initDeletedCustomTRC20Coins(network: AnyNetwork): Promise<TRC20Coin[]> {
    const rawCoinList = await LocalStorage.instance.get("custom-trc20-coins-deleted-" + this.localStorageKey);
    if (!rawCoinList) {
      return [];
    }

    let deletedTRC20Coins: TRC20Coin[] = [];
    for (let rawCoin of rawCoinList) {
      deletedTRC20Coins.push(TRC20Coin.fromJson(rawCoin, network));
    }

    this.deletedTRC20Coins = deletedTRC20Coins;
  }

  public updateAccessTime(timestamp: number) {
    this.lastAccessTimestamp = timestamp;
    void LocalStorage.instance.set("custom-trc20-coins-accesstime-" + this.localStorageKey, this.lastAccessTimestamp);
  }

  // The last time that the user viewed the coin list screen.
  // We decide whether to display newly discovered tokens based on this time.
  public getLastAccessTime() {
    return this.lastAccessTimestamp;
  }

  public async createTRC20SubWallet(networkWallet: AnyNetworkWallet, coinID: CoinID, startBackgroundUpdates = true): Promise<TRC20SubWallet> {
    let subWallet = new TRC20SubWallet(networkWallet, coinID, networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC));
    await subWallet.initialize();

    if (startBackgroundUpdates)
      void subWallet.startBackgroundUpdates();

    return subWallet;
  }

  public getMainEvmAccountApiUrl(): string {
    return null;
  }

  public getMainTokenSymbol(): string {
    return 'TRX';
  }

  public getMainChainID(): number {
    return -1;
  }

  public updateSPVNetworkConfig(onGoingConfig: ConfigInfo) {
  }

  public supportedPrivateKeyTypes(): PrivateKeyType[] {
    return [PrivateKeyType.EVM];
  }

  public supportsTRC20Coins(): boolean {
    return true;
  }

  public getMainColor(): string {
    return "a62c25";
  }
}