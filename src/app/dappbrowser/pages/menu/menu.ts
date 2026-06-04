import { HttpClient } from '@angular/common/http';
import { Component, NgZone, ViewChild } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import {
  BuiltInIcon,
  TitleBarIcon,
  TitleBarIconSlot,
  TitleBarMenuItem
} from 'src/app/components/titlebar/titlebar.types';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { BTCNetworkWallet } from 'src/app/wallet/model/networks/btc/networkwallets/btc.networkwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { EVMNetworkWallet } from 'src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet';
import {
  BrowserConnectionType,
  BrowserWalletConnectionsService
} from 'src/app/wallet/services/browser-wallet-connections.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { WalletUIService } from 'src/app/wallet/services/wallet.ui.service';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { DappBrowserService } from '../../services/dappbrowser.service';
import { FavoritesService } from '../../services/favorites.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;
@Component({
  selector: 'page-menu',
  templateUrl: 'menu.html',
  styleUrls: ['menu.scss']
})
export class MenuPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public browsedAppInfo: BrowsedAppInfo = null;
  public connectedEVMWallet: EVMNetworkWallet<any, any> = null;
  public connectedBitcoinWallet: BTCNetworkWallet<any, any> = null;
  public connectedEVMNetwork: EVMNetwork = null;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    public translate: TranslateService,
    private nav: GlobalNavService,
    public theme: GlobalThemeService,
    public httpClient: HttpClient,
    public zone: NgZone,
    private native: GlobalNativeService,
    public favoritesService: FavoritesService,
    public dappBrowserService: DappBrowserService,
    public walletNetworkService: WalletNetworkService,
    private walletNetworkUIService: WalletNetworkUIService,
    public walletService: WalletService,
    private walletUIService: WalletUIService,
    private browserWalletConnectionsService: BrowserWalletConnectionsService,
    private globalIntentService: GlobalIntentService,
    private clipboard: Clipboard,
    private globalNative: GlobalNativeService
  ) {}

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('dappbrowser.menu-title'));
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: 'close',
      iconPath: BuiltInIcon.CLOSE
    });

    this.titleBar.addOnItemClickedListener(
      (this.titleBarIconClickedListener = () => {
        void this.goback();
      })
    );

    this.subscriptions.push(
      this.dappBrowserService.activeBrowsedAppInfo.subscribe(browsedAppInfo => {
        this.zone.run(() => {
          this.browsedAppInfo = browsedAppInfo;
        });
      })
    );

    this.subscriptions.push(
      this.browserWalletConnectionsService.activeDappEVMNetwork.subscribe(network => {
        this.zone.run(() => {
          console.log('Menu: EVM network changed:', network);
          this.connectedEVMNetwork = network;
        });
      })
    );

    this.subscriptions.push(
      this.browserWalletConnectionsService.activeDappEVMWallet.subscribe(evmWallet => {
        this.zone.run(() => {
          console.log('Menu: EVM wallet changed:', evmWallet);
          this.connectedEVMWallet = evmWallet;
        });
      })
    );

    this.subscriptions.push(
      this.browserWalletConnectionsService.activeDappBitcoinWallet.subscribe(bitcoinWallet => {
        this.zone.run(() => {
          console.log('Menu: Bitcoin wallet changed:', bitcoinWallet);
          this.connectedBitcoinWallet = bitcoinWallet;
        });
      })
    );

    Logger.log('dappbrowser', 'Showing menu for browsed app', this.browsedAppInfo);
  }

  ionViewWillLeave() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions = [];

    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  ionViewDidEnter() {
    // Load connected wallets when the view becomes active
    // console.log('Menu: View entered, loading wallets');
    // Check if the subscription has already handled this URL to avoid duplicate calls
    // const currentActiveUrl = this.browserWalletConnectionsService.getActiveDappUrl();
    // if (currentActiveUrl !== this.browsedAppInfo?.url) {
    //   void this.loadConnectedWallets();
    // } else {
    //   console.log('Menu: Subscription already handled this URL, skipping loadConnectedWallets');
    // }
  }

  async goback() {
    await this.nav.navigateBack();
  }

  public isInFavorites(): boolean {
    if (!this.browsedAppInfo) {
      return false;
    }

    return !!this.favoritesService.findFavoriteByUrl(this.browsedAppInfo.url);
  }

  public async addToFavorites() {
    await this.favoritesService.addToFavorites(this.browsedAppInfo);
    this.native.genericToast('dappbrowser.added-to-favorites');
  }

  public async removeFromFavorites() {
    let existingFavorite = this.favoritesService.findFavoriteByUrl(this.browsedAppInfo.url);
    await this.favoritesService.removeFromFavorites(existingFavorite);
    this.native.genericToast('dappbrowser.removed-from-favorites');
  }

  public async pickEVMNetwork() {
    if (!this.browsedAppInfo?.url) {
      return;
    }

    const selectedNetwork = await this.browserWalletConnectionsService.selectEVMNetwork(this.browsedAppInfo.url);
    console.log('Menu: EVM network selected:', selectedNetwork);
    if (selectedNetwork) {
      void this.goback(); // Exit menu after selecting network
    }
  }

  public openExternal() {
    void this.globalIntentService.sendIntent('openurl', { url: this.browsedAppInfo.url });
  }

  public async reloadPage() {
    // Reload first then go back - because when reloading, the webview gets opened but hidden.
    // And the browser screen shows it when it's ready
    await this.dappBrowserService.reload(); // await is important here!
    await this.goback();
  }

  public copyUrl() {
    void this.clipboard.copy(this.browsedAppInfo.url);
    this.globalNative.genericToast('common.copied-to-clipboard', 2000);
  }

  public shareUrl() {
    void this.globalIntentService.sendIntent('share', {
      title: this.browsedAppInfo.title,
      url: this.browsedAppInfo.url
    });
  }

  /**
   * Tells if the HTML header was loaded yet or not.
   */
  public appMetaLoaded(): boolean {
    return this.browsedAppInfo && this.browsedAppInfo.title !== '';
  }

  public getConnectedEVMNetworkLogo(): string {
    if (!this.browsedAppInfo?.url || !this.connectedEVMNetwork) {
      return transparentPixelIconDataUrl();
    }

    try {
      return this.connectedEVMNetwork.logo || transparentPixelIconDataUrl();
    } catch (error) {
      console.error('Menu: Error getting EVM network logo:', error);
      return transparentPixelIconDataUrl();
    }
  }

  public getConnectedEVMNetworkName(): string {
    if (!this.browsedAppInfo?.url || !this.connectedEVMNetwork) {
      return '';
    }

    try {
      return this.connectedEVMNetwork.getEffectiveName() || '';
    } catch (error) {
      console.error('Menu: Error getting EVM network name:', error);
      return '';
    }
  }

  public getConnectedBitcoinNetworkName(): string {
    if (this.connectedBitcoinWallet) {
      return this.translate.instant('dappbrowser.connected');
    } else {
      return this.translate.instant('dappbrowser.no-wallet-connected');
    }
  }

  public getConnectedBitcoinNetworkLogo(): string {
    if (this.walletNetworkService.getBitcoinNetwork()) {
      return this.walletNetworkService.getBitcoinNetwork().logo;
    } else {
      return transparentPixelIconDataUrl();
    }
  }

  /**
   * Loads the connected wallets for the current dapp using reactive subjects
   */
  // private async loadConnectedWallets() {
  //   if (!this.browsedAppInfo?.url) {
  //     console.log('Menu: No browsedAppInfo URL, clearing wallets');
  //     this.connectedEVMWallet = null;
  //     this.connectedBitcoinWallet = null;
  //     return;
  //   }

  //   console.log('Menu: Loading connected wallets for URL:', this.browsedAppInfo.url);

  //   // The reactive subjects will update our properties automatically
  //   this.connectedEVMWallet = this.browserWalletConnectionsService.activeDappEVMWallet.value;
  //   this.connectedBitcoinWallet = this.browserWalletConnectionsService.activeDappBitcoinWallet.value;

  //   console.log(
  //     'Menu: EVM wallet loaded:',
  //     this.connectedEVMWallet ? this.connectedEVMWallet.masterWallet.name : 'null'
  //   );
  //   console.log(
  //     'Menu: Bitcoin wallet loaded:',
  //     this.connectedBitcoinWallet ? this.connectedBitcoinWallet.masterWallet.name : 'null'
  //   );
  // }

  /**
   * Handles Bitcoin wallet selection for the current dapp
   */
  public async pickBitcoinWallet() {
    if (!this.browsedAppInfo?.url) {
      console.log('Menu: No URL available for Bitcoin wallet selection');
      return;
    }

    console.log('Menu: Starting Bitcoin wallet selection for URL:', this.browsedAppInfo.url);

    try {
      const connectedWallet = await this.browserWalletConnectionsService.connectWallet(
        this.browsedAppInfo.url,
        BrowserConnectionType.BITCOIN
      );

      console.log('Menu: Bitcoin wallet selection result:', connectedWallet ? connectedWallet.name : 'cancelled');

      // if (connectedWallet) {
      //   // Force UI update by running in zone
      //   await this.zone.run(async () => {
      //     await this.loadConnectedWallets();

      //     // Update the Unisat provider with the new wallet
      //     await this.updateUnisatProvider(connectedWallet);

      //     console.log('Menu: Bitcoin wallet UI updated');
      //   });

      //   // Wallet was successfully connected, exit menu
      //   void this.goback();
      // }
    } catch (error) {
      console.error('Menu: Error selecting Bitcoin wallet:', error);
    }
  }

  /**
   * Handles EVM wallet selection for the current dapp
   */
  public async pickEVMWallet() {
    if (!this.browsedAppInfo?.url) {
      console.log('Menu: No URL available for EVM wallet selection');
      return;
    }

    console.log('Menu: Starting EVM wallet selection for URL:', this.browsedAppInfo.url);

    try {
      const connectedWallet = await this.browserWalletConnectionsService.connectWallet(
        this.browsedAppInfo.url,
        BrowserConnectionType.EVM
      );

      console.log('Menu: EVM wallet selection result:', connectedWallet ? connectedWallet.name : 'cancelled');

      // if (connectedWallet) {
      //   // Force UI update by running in zone
      //   await this.zone.run(async () => {
      //     await this.loadConnectedWallets();
      //     console.log('Menu: EVM wallet UI updated');
      //   });

      //   // Wallet was successfully connected, exit menu
      //   void this.goback();
      // }
    } catch (error) {
      console.error('Menu: Error selecting EVM wallet:', error);
    }
  }

  /**
   * Updates the Unisat provider with the selected Bitcoin wallet
   */
  // private async updateUnisatProvider(wallet: any) {
  //   try {
  //     // Get the Bitcoin address from the wallet
  //     const address = await this.getWalletBitcoinAddress(wallet.masterWallet);

  //     if (address) {
  //       // Update the Unisat provider with the new address
  //       const updateScript = `
  //         if (window.unisat && window.unisat.setAddress) {
  //           window.unisat.setAddress('${address}');
  //         }
  //         if (window.okxwallet && window.okxwallet.bitcoin && window.okxwallet.bitcoin.setAddress) {
  //           window.okxwallet.bitcoin.setAddress('${address}');
  //         }
  //       `;

  //       // Execute the script in the dApp context
  //       await dappBrowser.executeScript({
  //         code: updateScript
  //       });

  //       Logger.log('dappbrowser', 'Updated Unisat provider with address:', address);
  //     }
  //   } catch (error) {
  //     Logger.error('dappbrowser', 'Error updating Unisat provider:', error);
  //   }
  // }

  /**
   * Gets the Bitcoin address from a master wallet
   */
  // private async getWalletBitcoinAddress(masterWallet: any): Promise<string> {
  //   try {
  //     // Get the Bitcoin subwallet from the master wallet
  //     const bitcoinSubwallet = masterWallet.getSubWallet('BTC');
  //     if (bitcoinSubwallet) {
  //       return await bitcoinSubwallet.getCurrentReceiverAddress();
  //     }
  //   } catch (error) {
  //     Logger.error('dappbrowser', 'Error getting Bitcoin address:', error);
  //   }
  //   return '';
  // }

  /**
   * Disconnects the EVM wallet for the current dapp
   */
  public async disconnectEVMWallet(event: Event) {
    event.stopPropagation(); // Prevent the wallet selection dialog from opening

    if (!this.browsedAppInfo?.url) {
      return;
    }

    try {
      await this.browserWalletConnectionsService.disconnectWallet(this.browsedAppInfo.url, BrowserConnectionType.EVM);

      Logger.log('dappbrowser', 'EVM wallet disconnected for url', this.browsedAppInfo.url);
      this.native.genericToast('dappbrowser.wallet-disconnected');
    } catch (error) {
      Logger.error('dappbrowser', 'Error disconnecting EVM wallet:', error);
      this.native.genericToast('dappbrowser.wallet-disconnect-error');
    }
  }

  /**
   * Disconnects the Bitcoin wallet for the current dapp
   */
  public async disconnectBitcoinWallet(event: Event) {
    event.stopPropagation(); // Prevent the wallet selection dialog from opening

    if (!this.browsedAppInfo?.url) {
      return;
    }

    try {
      await this.browserWalletConnectionsService.disconnectWallet(
        this.browsedAppInfo.url,
        BrowserConnectionType.BITCOIN
      );

      Logger.log('dappbrowser', 'Bitcoin wallet disconnected for url', this.browsedAppInfo.url);
      this.native.genericToast('dappbrowser.wallet-disconnected');
    } catch (error) {
      Logger.error('dappbrowser', 'Error disconnecting Bitcoin wallet:', error);
      this.native.genericToast('dappbrowser.wallet-disconnect-error');
    }
  }

  /**
   * Asks the browser plugin to clear cached data for the current url:
   * - local storage
   * - databases
   */
  public async clearBrowserData() {
    if (!this.browsedAppInfo || !this.browsedAppInfo.url) return;

    Logger.log('dappbrowser', 'Clearing browser data for url', this.browsedAppInfo.url);
    await dappBrowser.clearData(this.browsedAppInfo.url);
    await this.reloadPage();

    this.globalNative.genericToast('dappbrowser.browser-data-cleared', 2000);
  }
}
