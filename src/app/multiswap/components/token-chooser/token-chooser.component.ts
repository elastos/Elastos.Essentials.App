import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Coin, CoinType, ERC20Coin } from 'src/app/wallet/model/coin';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AnyEVMNetworkWallet, EVMNetworkWallet } from 'src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletPrefsService } from "src/app/wallet/services/pref.service";
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { UIToken } from '../../model/uitoken';

/**
 * Filter method to return only some networks to show in the chooser.
 */
//export type NetworkChooserFilter = (networks: AnyNetwork) => boolean;

export type TokenChooserComponentOptions = {
  entryNetwork?: EVMNetwork;

  /**
   * Depending on the mode, the chooser behaves differently.
   * EG:
   * - In source mode, only user tokens with non 0 balance are added. "All networks" can be shown at once
   * - In destination mode, tokens list is more complex and included tokens not owned by the user.
   */
  mode: "source" | "destination";

  /**
   * Whether to show the "all" networks button. If false, user needs to pick a
   * specific network first.
   */
  //showAllNetworksSelector: boolean;

  //showZeroBalanceTokens: boolean;

  /**
   * Optional filter. Only returned networks will show in the list.
   * Return true to keep the network in the list, false to hide it.
   */
  //filter?: NetworkChooserFilter;
}

export type TokenChooserComponentResult = {
  pickedToken?: UIToken;
}

@Component({
  selector: 'app-token-chooser',
  templateUrl: './token-chooser.component.html',
  styleUrls: ['./token-chooser.component.scss'],
})
export class TokenChooserComponent implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public options: TokenChooserComponentOptions = null;

  private masterWallet: MasterWallet = null;
  private networkWallets: EVMNetworkWallet<any, any>[] = [];
  public currentNetwork: EVMNetwork = null; // Network currently selected on the left column
  public networksToShowInList: EVMNetwork[] = [];
  public allTokens: UIToken[] = []; // All source tokens
  public displayableTokens: UIToken[] = []; // Tokens that can be displayed, based on filtered network / search

  public search = ""; // Search input value
  public totalTokensToFetch = 0; // Total number of tokens to fetch for balance
  public totalTokensFetched = 0; // Total number of tokens already fetched. When this number reaching the total number to fetch, the spinner is hidden
  public fetchingERC20Token = false;
  public inCustomTokenMode = false; // Whether the UI should show a custom layout as user is trying to deal with a token address in the search bar
  public customToken: UIToken = null;

  constructor(
    private navParams: NavParams,
    private walletService: WalletService,
    private networkService: WalletNetworkService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private zone: NgZone,
    private erc20CoinService: ERC20CoinService,
    private changeDetector: ChangeDetectorRef,
    private modalCtrl: ModalController,
    private prefs: WalletPrefsService
  ) {
  }

  ngOnInit() {
    this.options = {
      ...{
        entryNetwork: null,
        showAllNetworksSelector: false
      }, ...(this.navParams.data as TokenChooserComponentOptions)
    };

    this.masterWallet = this.walletService.getActiveMasterWallet();
    let networks = this.networkService.getDisplayableNetworks();

    // Only EVM networks for now
    this.networksToShowInList = <EVMNetwork[]>networks.filter(n => n instanceof EVMNetwork && !this.isNetworkExcluded(n));

    // If a forced network is provided, use it
    if (this.options.entryNetwork) {
      this.currentNetwork = this.options.entryNetwork;
    }
    else {
      // In source mode, keep the current network undefined to show "all".
      // In destination mode, select the active network by default to not show an empty list (only if the network is in the list)
      let activeNetwork = this.networkService.activeNetwork.value;
      if (this.options.mode === "destination" && this.networksToShowInList.find(n => n.equals(activeNetwork))) {
        this.currentNetwork = <EVMNetwork>activeNetwork;
      }
    }

    // Get network wallets for all displayed networks
    let networkWalletPromises: Promise<AnyNetworkWallet>[] = [];
    for (let network of this.networksToShowInList) {
      networkWalletPromises.push(this.getOrCreateNetworkWallet(this.masterWallet, network).then(networkWallet => {
        this.networkWallets.push(<AnyEVMNetworkWallet>networkWallet);

        // Start updating tokens as each wallet gets ready
        this.updateNetworkWalletTokens(networkWallet);

        return networkWallet;
      }));
    }
  }

  /**
   * Creates a network wallet based on the given parameters, or for the active network,
   * get the exiecting active wallet from the wallet service.
   *
   * IMPORTANT: We do not want to create another instance of the active wallet to be able to create subwallets from this screen.
   * If we use 2 different instances, the active network wallet overwrites the modified sub wallets when fetching new transactions.
   */
  private getOrCreateNetworkWallet(masterWallet: MasterWallet, network: AnyNetwork): Promise<AnyNetworkWallet> {
    if (this.walletService.activeNetworkWallet.value.network.equals(network)) {
      return Promise.resolve(this.walletService.activeNetworkWallet.value);
    }
    else {
      return network.createNetworkWallet(masterWallet, false);
    }
  }

  /**
   * Prepares all tokens we want to display for the given network wallet.
   * NOTE: The list of tokens is different in source and destination modes.
   */
  private updateNetworkWalletTokens(networkWallet: AnyNetworkWallet) {
    const network = networkWallet.network;

    // Only ERC20 support for now
    let subWallets = networkWallet.getSubWalletsByType(CoinType.ERC20);

    // Native network coin
    const standardSubWallet = networkWallet.getSubWalletsByType(CoinType.STANDARD)[0];
    let nativeUIToken = this.newUITokenFromCoin(standardSubWallet.getCoin());
    this.allTokens.push(nativeUIToken);

    // [destination mode only] Wrapped version of source token
    // TODO

    // Tokens displayed by the user
    this.totalTokensToFetch += subWallets.length;
    for (let subWallet of <ERC20SubWallet[]>subWallets) {
      // Add token first, with undefined balance. It gets updated asynchronously
      let uiToken = this.newUITokenFromCoin(subWallet.getCoin());
      this.allTokens.push(uiToken);

      void subWallet.updateBalance().then(() => {
        uiToken.amount = subWallet.getBalance();
        this.refreshDisplayableTokens();

        this.totalTokensFetched++;
      });
    }

    // [destination mode only] All curated tokens provided by the network
    if (this.options.mode === "destination" && network instanceof EVMNetwork) {
      let coins = network.getBuiltInERC20Coins();

      for (let coin of coins) {
        let uiToken: UIToken = {
          token: coin,
          amount: null
        }

        // Skip if already added
        if (this.allTokens.find(t => t.token.equals(coin)))
          continue;

        this.allTokens.push(uiToken);
      }
    }

    this.refreshDisplayableTokens();
  }

  /*
  - TODO: how to share fetched balances with the swap screen?
      - token balance service with cache that gets cleared when entering the swap screen?
      - why not using the mechanism already in the network wallet subwallets...?
   */

  ngOnDestroy() { }

  private newUITokenFromCoin(coin: Coin): UIToken {
    let uiToken: UIToken = {
      token: coin,
      amount: null
    }

    return uiToken;
  }

  /**
   * Hardcoded list of networks we want to exclude for now.
   */
  private isNetworkExcluded(network: AnyNetwork): boolean {
    return network.key === "elastosidchain";
  }

  selectNetwork(network: EVMNetwork) {
    Logger.log("token-chooser", "Network selected", network);

    this.currentNetwork = network;

    // Simulate a search change so we update the displayable tokens but also handle pasted token addresses to be imported
    this.onSearchInputChanged();
  }

  async selectToken(token: UIToken) {
    Logger.log("token-chooser", "Token selected", token);

    // If the selected token is the imported token, we automatically add this token to the network wallet's coins list
    // (available coins list + subwallet)
    if (this.customToken && token.token.equals(this.customToken.token)) {
      await this.importCustomToken();
    }

    this.dismissWithResult({
      pickedToken: token
    });
  }

  cancelOperation() {
    Logger.log("token-chooser", "Token selection cancelled");
    this.dismissWithResult({
      pickedToken: null
    });
  }

  private dismissWithResult(result: TokenChooserComponentResult) {
    void this.modalCtrl.dismiss(result);
  }

  public canDisplayToken(token: UIToken): boolean {
    // In source mode, only show non 0 balance tokens
    if (this.options.mode === "source") {
      if (token.amount === null || token.amount.lte(0))
        return false;
    }

    if (this.currentNetwork && !token.token.network.equals(this.currentNetwork))
      return false;

    return true;
  }

  public getDisplayableAmount(readableBalance: BigNumber): string {
    return readableBalance.toFixed(5);
  }

  public getTokenLogo(token: UIToken): string {
    return token.token.network.logo;
  }

  private refreshDisplayableTokens() {
    const lowercaseSearch = this.search.toLowerCase();

    this.displayableTokens = this.allTokens.filter(t => {
      if (!this.canDisplayToken(t))
        return false;

      if (this.search === "")
        return true;
      else // Search by token symbol or name
        return t.token.getSymbol().toLowerCase().indexOf(lowercaseSearch) >= 0 || t.token.getDescription().toLowerCase().indexOf(lowercaseSearch) >= 0;
    });
    this.changeDetector.detectChanges();
  }

  /**
   * Search input value changed, filter the tokens again
   */
  public onSearchInputChanged() {
    if (this.search.startsWith("0x")) { // TODO: Non EVM, iotex etc too
      this.inCustomTokenMode = true;

      // Seems to be a network address, try to find this as a ERC20 token.
      // If this seems to be a ERC20, user will be able to use that as selected coin
      void this.tryToImportERC20TokenByAddress(this.search.toLowerCase());
    }
    else {
      this.inCustomTokenMode = false;

      // Standard filter search, refresh the displayable tokens
      this.refreshDisplayableTokens();
    }
  }

  private async tryToImportERC20TokenByAddress(contractAddress: string): Promise<void> {
    this.customToken = null;

    if (!this.currentNetwork) {
      Logger.warn('token-chooser', `Cannot import ERC20 token info as no network is selected`);
      return;
    }

    // Fetch ERC20 token info on the active network
    this.fetchingERC20Token = true;
    const coinInfo = await this.erc20CoinService.getCoinInfo(this.currentNetwork, contractAddress);

    if (coinInfo) {
      // If valid, automatically add the coin to the displayed wallet coins
      this.customToken = {
        token: new ERC20Coin(this.currentNetwork, coinInfo.coinSymbol, coinInfo.coinName, contractAddress, coinInfo.coinDecimals, true, true),
        amount: null
      }
    } else {
      Logger.warn('token-chooser', `Cannot get ERC20 coin info at address ${contractAddress} - invalid contract? Not ERC20?`);
    }

    this.fetchingERC20Token = false;
  }

  /**
   * Saved user's custom token to wallet's coin list and subwallets.
   */
  private async importCustomToken() {
    if (this.customToken.token.network instanceof EVMNetwork) {
      // Find the network wallet where the custom token belongs
      let tokenNetworkWallet = this.networkWallets.find(nw => nw.network.equals(this.customToken.token.network));

      // Adds to network coins list
      await this.customToken.token.network.addCustomERC20Coin(<ERC20Coin>this.customToken.token);

      // Add as subwallet
      await tokenNetworkWallet.createNonStandardSubWallet(this.customToken.token);

      Logger.log("token-chooser", "Imported token to wallet", tokenNetworkWallet, this.customToken.token);
    }
  }

  public isSourceMode(): boolean {
    return this.options.mode === "source";
  }

  public isDestinationMode(): boolean {
    return this.options.mode === "destination";
  }
}
