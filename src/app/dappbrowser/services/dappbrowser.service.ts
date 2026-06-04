import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { lazyPhishingDetectorImport } from 'src/app/helpers/import.helper';
import { urlDomain } from 'src/app/helpers/url.helpers';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
// Ethereum request params imports moved to EthereumProtocolService
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
// EVM, Network, and Intent result imports moved to EthereumProtocolService
import { BrowserWalletConnectionsService } from 'src/app/wallet/services/browser-wallet-connections.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import type { BrowsedAppInfo } from '../model/browsedappinfo';
import { ElastosMainchainProtocolService } from './web3-provider-protocols/elastos-mainchain-protocol.service';
import { EthereumProtocolService } from './web3-provider-protocols/ethereum-protocol.service';
import { UnisatProtocolService } from './web3-provider-protocols/unisat-protocol.service';
import PQueue from 'p-queue';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

type InjectedProviderType = 'ethereum' | 'elastos' | 'elamain' | 'unisat';

const MAX_RECENT_APPS = 100;

export type DABMessage = {
  type: 'message';
  data: {
    id: number;
    name: string; // Command name
    object: any; // Usually, the ETH JSON RPC payload.
  };
};

export type DABError = {
  type: 'loaderror';
  url: string;
  code?: number;
  message: string;
  sslerror?: string;
};

export type DABLoadStop = {
  type: 'loadstop';
  url: string;
};

export type DABUrlChangedEvent = {
  type: 'urlchanged';
  url: string;
};

// AddressType enum moved to ElastosMainchainProtocolService

type WalletPermissionCaveat = {
  type: string;
  value: any;
};

type WalletPermission = {
  caveats: WalletPermissionCaveat[];
  date: number; // The date the permission was granted, in UNIX epoch time
  id?: string;
  invoker: string; //`http://${string}` | `https://${string}`
  parentCapability: 'eth_accounts' | string;
};

/**
 * Mode used to run dapps. Depending on this mode, different things are done.
 * Android normally uses the IN_APP mode while iOS uses EXTERNAL_BROWSER (in app forbidden by apple)
 */
enum DAppsBrowseMode {
  IN_APP = 0,
  EXTERNAL_BROWSER = 1
}

export interface DappBrowserClient {
  onExit: (mode?: string) => void;
  onLoadStart?: () => void;
  onLoadStop?: (info: DABLoadStop) => void;
  onLoadError?: (error: DABError) => void;
  onBeforeLoad?: () => void;
  onMessage?: (info: DABMessage) => void;
  onProgress?: (progress: number) => void;
  onUrlChanged?: (url: string) => void;
  onHtmlHead?: (head: Document) => void;
  onThemeColor?: (themeColor: string) => void; // Theme color meta found in the page header
  onCustomScheme?: (url: string) => void;
}
@Injectable({
  providedIn: 'root'
})
export class DappBrowserService implements GlobalService {
  public static instance: DappBrowserService = null;

  private dabClient: DappBrowserClient = null;
  public title: string = null;
  public url: string;
  public activeBrowsedAppInfo = new BehaviorSubject<BrowsedAppInfo>(null); // Extracted info about a fetched dapp, after it's successfully loaded.
  public recentApps = new BehaviorSubject<string[]>([]);
  public confirming = false;

  public askedDomains = [];

  private queue: PQueue = new PQueue({ concurrency: 1 });

  constructor(
    public translate: TranslateService,
    private nav: GlobalNavService,
    public theme: GlobalThemeService,
    public httpClient: HttpClient,
    public zone: NgZone,
    private platform: Platform,
    private prefs: GlobalPreferencesService,
    private globalStorageService: GlobalStorageService,
    private globalIntentService: GlobalIntentService,
    public globalPopupService: GlobalPopupService,
    private walletNetworkService: WalletNetworkService,
    private browserWalletConnectionsService: BrowserWalletConnectionsService,
    private unisatProtocolService: UnisatProtocolService,
    private elastosMainchainProtocolService: ElastosMainchainProtocolService,
    private ethereumProtocolService: EthereumProtocolService
  ) {
    DappBrowserService.instance = this;

    void this.init();
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.loadRecentApps();

    this.setupDappWalletSubscriptions();

    return;
  }

  onUserSignOut(): Promise<void> {
    this.removeDappWalletSubscriptions();

    return;
  }

  public async getBrowseMode(): Promise<DAppsBrowseMode> {
    if (await this.prefs.getUseBuiltInBrowser(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate))
      return DAppsBrowseMode.IN_APP;
    else return DAppsBrowseMode.EXTERNAL_BROWSER;
  }

  public async canBrowseInApp(): Promise<boolean> {
    let browseMode = await this.getBrowseMode();
    return browseMode === DAppsBrowseMode.IN_APP;
  }

  public setClient(dabClient: DappBrowserClient) {
    this.dabClient = dabClient;
  }

  public getActiveBrowsedAppInfo(): BrowsedAppInfo {
    return this.activeBrowsedAppInfo.value;
  }

  public async setActiveBrowsedAppInfoNetwork(networkKey: string) {
    let appInfo = this.activeBrowsedAppInfo.value;
    if (appInfo) {
      appInfo.network = networkKey;
      await this.saveBrowsedAppInfo(appInfo);
    }
  }

  public getDomain(url, subdomain = true): string {
    url = url.replace(/(https?:\/\/)?/i, '');

    if (!subdomain) {
      url = url.split('.');
      url = url.slice(url.length - 2).join('.');
    }

    if (url.indexOf('/') !== -1) {
      return url.split('/')[0];
    }

    return url;
  }

  public async checkScamDomain(domain: string): Promise<boolean> {
    if (this.askedDomains.includes(domain)) {
      return false;
    }

    //Can add some items on phishingConfig
    const checkDomain = await lazyPhishingDetectorImport();
    var ret = <boolean>checkDomain(domain);
    Logger.log('dappbrowser', 'detector return', domain, ret);
    return ret;
  }

  public async showScamWarning(domain: string): Promise<boolean> {
    this.confirming = true;
    let ret = await this.globalPopupService.ionicConfirm(
      'dappbrowser.scam-warning-title',
      'dappbrowser.scam-warning-message',
      'common.leave',
      'common.continue'
    );
    this.confirming = false;
    if (!ret) {
      this.askedDomains.push(domain);
    }
    return ret;
  }

  private async checkScamUrl(url: string): Promise<boolean> {
    let domain = this.getDomain(url);
    if (await this.checkScamDomain(domain)) {
      return await this.showScamWarning(domain);
    }
  }

  /**
   * Opens a url either in the in-app browser, or in the external browser, depending on the current
   * "browse mode". This allows opening apps inside essentials on android, and in the external browser
   * on ios.
   */
  public async openForBrowseMode(url: string, title?: string, target?: string): Promise<void> {
    if (await this.checkScamUrl(url)) {
      return;
    }

    if (await this.canBrowseInApp()) {
      GlobalFirebaseService.instance.logEvent('browser_open_url_in_app');

      // We cano use the "standard" way to open dapps in app.
      return this.open(url, title, target);
    } else {
      GlobalFirebaseService.instance.logEvent('browser_open_url_outside');

      void this.globalIntentService.sendIntent('openurl', { url });

      // In external mode, while we open the app in the external browser, we also fetch its
      // header here to get the title, icon, description and store it as recently browsed.
      void this.backgroundFetchUrlInfo(url);
    }
  }

  /**
   * Opens a new browser to display the target url.
   *
   * @param url The dApp URL to show.
   * @param [target="_webview"]  The target in which to load the URL, an optional parameter that defaults to _webview.
   *                 _self: Opens in the WebView if the URL is in the white list, otherwise it opens in the DappBrowser.
   *                 _webview: Opens in the Webview.
   *                 _system: Opens in the system's web browser.
   * @param title The dApp title to show, if have title the url bar hide, otherwise show url bar.
   *
   */
  public async open(url: string, title?: string, target?: string, navigate = true) {
    this.url = url;

    // Initialize protocol services
    await this.ethereumProtocolService.initialize();
    await this.elastosMainchainProtocolService.initialize();

    // Close any previous browser if needed, without going back in navigation
    await this.close('reload');

    if (await this.checkScamUrl(url)) {
      return;
    }

    Logger.log('dappbrowser', 'Opening url', url);

    if (!target || target == null) {
      target = '_webview';
    }

    // Network setup is now handled by EthereumProtocolService

    // Set the active dApp and update wallet connections/subscriptions
    await this.browserWalletConnectionsService.setActiveDapp(url);
    // this.setupDappWalletSubscriptions();

    var options: any = {
      titlebarheight: 50,
      backgroundcolor: '#bfbfbf',
      hidden: target == '_webview',
      did: DIDSessionsStore.signedInDIDString.replace(/:/g, '_')
    };

    await dappBrowser.setInjectedJavascript(await this.getInjectedJs()); // Inject the web3 provider and connector at document start

    if (title && title != null) {
      this.title = title;
      options.title = title;
    } else {
      this.title = null;
    }

    dappBrowser.addEventListener(ret => {
      this.zone.run(() => {
        void this.handleEvent(ret);
      });
    });

    try {
      await dappBrowser.open(url, target, options);
    } catch (error) {
      Logger.error('dappbrowser', 'dappBrowser.open error:', error);
      return;
    }

    if (target == '_webview' && navigate) {
      void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/browser', {
        animated: false
      });
    }

    // Remember this application as browsed permanently.
    let appInfo: BrowsedAppInfo = {
      url: this.url,
      title: '',
      description: '',
      iconUrl: '',
      network: 'unknown',
      lastBrowsed: moment().unix(),
      useExternalBrowser: false
    };
    this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo(appInfo));
  }

  /**
   * Javascript code to inject at documents start
   */
  private async getInjectedJs(): Promise<string> {
    const currentUrl = this.url;
    if (!currentUrl) {
      Logger.warn('dappbrowser', 'No current URL available for connection check');
      return await this.getDefaultInjectedJs();
    }

    // Delegate to protocol services to handle their specific wallet connections and injection code
    const [ethereumCode, unisatCode, elastosCode] = await Promise.all([
      this.ethereumProtocolService.getInjectionCodeForUrl(currentUrl),
      this.unisatProtocolService.getInjectionCodeForUrl(currentUrl),
      this.elastosMainchainProtocolService.getInjectionCodeForUrl(currentUrl)
    ]);

    return `${ethereumCode}\n${unisatCode}\n${elastosCode}`;
  }

  /**
   * Fallback method for when no URL is available
   */
  private async getDefaultInjectedJs(): Promise<string> {
    // Delegate to protocol services with empty URL to get default injection code
    const [ethereumCode, unisatCode, elastosCode] = await Promise.all([
      this.ethereumProtocolService.getInjectionCodeForUrl(''),
      this.unisatProtocolService.getInjectionCodeForUrl(''),
      this.elastosMainchainProtocolService.getInjectionCodeForUrl('')
    ]);

    return `${ethereumCode}\n${unisatCode}\n${elastosCode}`;
  }

  /**
   * Closes the active browser, if any.
   *
   * Check browser.ts in the browser screen for the list of special modes when closing, for specific follow up action.
   * If no mode is given, the navigation simply goes back.
   */
  public close(mode?: 'goToLauncher' | 'reload'): Promise<void> {
    Logger.log('dappbrowser', 'Closing current webview, if any');

    // Clear the active dApp when closing
    this.browserWalletConnectionsService.clearActiveDapp();

    return dappBrowser.close(mode);
  }

  /**
   * Hides the active browser, if any
   */
  public hideActiveBrowser() {
    Logger.log('dappbrowser', 'Hiding active browser');
    dappBrowser.hide();
  }

  public async reload() {
    Logger.log('dappbrowser', 'Reloading current url');

    // Trick / Note:
    // - When we first open the browser we create the web3 provider constructor JS code, and the cordova plugin decides what is the right
    // time to inject it (different on android and ios.
    // - When we reload the page, the browser re-injects this JS code as it was originally.
    // - Though, the network can have been changed in the meantime from the status bar, by the user or programatically by the dapp.
    // - Because of that, apps like ELK think we are on the wrong (old) network but we are not, and our provider is not up-to-date with the right
    // chain id, so the app is stuck in a loop trying to request a network change that never happens.
    // - So we close the webview and we reopen it for simplicity.
    await this.close('reload');
    void this.open(this.url, this.title, null, false);
  }

  public async handleEvent(event: DappBrowserPlugin.DappBrowserEvent) {
    Logger.log('dappbrowser', 'Received event', event);
    switch (event.type) {
      case 'loadstart':
        await this.handleLoadStartEvent(event);
        if (this.dabClient != null && this.dabClient.onLoadStart) {
          this.dabClient.onLoadStart();
        }
        break;
      case 'loadstop':
        await this.handleLoadStopEvent(event as DABLoadStop);
        if (this.dabClient != null && this.dabClient.onLoadStop) {
          this.dabClient.onLoadStop(event as DABLoadStop);
        }
        break;
      case 'loaderror':
        if (this.dabClient != null && this.dabClient.onLoadError) {
          this.dabClient.onLoadError(event as DABError);
        }
        break;
      case 'beforeload':
        if (this.dabClient != null && this.dabClient.onBeforeLoad) {
          this.dabClient.onBeforeLoad();
        }
        break;
      case 'message':
        await this.handleDABMessage(event as DABMessage);
        if (this.dabClient != null && this.dabClient.onMessage) {
          this.dabClient.onMessage(event as DABMessage);
        }
        break;
      case 'progress':
        if (this.dabClient != null && this.dabClient.onProgress) {
          this.dabClient.onProgress(event.progress);
        }
        break;
      case 'urlchanged':
        await this.handleUrlChangedEvent(event as DABUrlChangedEvent);
        if (this.dabClient != null && this.dabClient.onUrlChanged) {
          this.dabClient.onUrlChanged(event.url);
        }
        break;
      case 'head':
        let htmlHeader = await this.handleHtmlHeader(event);
        if (this.dabClient != null && this.dabClient.onHtmlHead) {
          this.dabClient.onHtmlHead(htmlHeader);
        }
        break;
      case 'customscheme':
        if (this.dabClient != null && this.dabClient.onCustomScheme) {
          this.dabClient.onCustomScheme(event.url);
        }
        break;
      case 'exit':
        await this.handleDABExit();
        if (this.dabClient != null) {
          this.dabClient.onExit(event.mode);
        }
        break;
    }
  }

  private async handleLoadStartEvent(event: DappBrowserPlugin.DappBrowserEvent) {
    // Updated the browsed url
    this.url = event.url;

    // Remember this application as browsed permanently.
    let appInfo: BrowsedAppInfo = {
      url: this.url,
      title: '',
      description: '',
      iconUrl: '',
      lastBrowsed: moment().unix(),
      network: this.getActiveNetworkKey(),
      useExternalBrowser: false
    };
    this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo(appInfo));
  }

  private handleLoadStopEvent(event: DABLoadStop): Promise<void> {
    // if (!this.networkSubscription) {
    //   this.networkSubscription = this.browserWalletConnectionsService.activeDappEVMNetwork.subscribe(activeNetwork => {
    //     void this.sendActiveNetworkToDApp(activeNetwork);
    //   });
    // }

    // Wallet subscriptions are now handled by setupDappWalletSubscriptions()

    return;
  }

  private async handleUrlChangedEvent(event: DABUrlChangedEvent): Promise<void> {
    // Update the active dApp connections
    await this.browserWalletConnectionsService.setActiveDapp(event.url);
    return;
  }

  private async extractHtmlInfoAndUpdatedBrowsedDApp(html: string, forUrl: string): Promise<Document> {
    let domParser = new DOMParser();
    let htmlHeader = domParser.parseFromString(html, 'text/html');
    //console.log("HEADER", event, htmlHeader, event.data);

    // Extract all the information we can, but mostly the app title, description and icon
    let metas = htmlHeader.getElementsByTagName('meta');

    // TITLE
    let title: string = null;
    let titleTags = htmlHeader.getElementsByTagName('title');
    if (titleTags && titleTags.length > 0) {
      title = titleTags[0].innerText;
    }

    if (!title) {
      // No standard <title> tag found, try to get more info from the metas.
      if (metas && metas.length > 0) {
        let appNameMeta = Array.from(metas).find(m => m.name && m.name.toLowerCase() === 'application-name');
        if (appNameMeta) title = appNameMeta.content;
      }

      if (!title) {
        // No title found, use a placeholder
        title = 'Untitled';
      }
    }

    // DESCRIPTION
    let description = ''; // Default description is empty if nothing is found
    if (metas && metas.length > 0) {
      let descriptionMeta = Array.from(metas).find(m => m.name && m.name.toLowerCase() === 'description');
      if (descriptionMeta) description = descriptionMeta.content;
    }

    // ICON
    let iconUrl: string = null;
    let links = htmlHeader.getElementsByTagName('link');
    if (links && links.length > 0) {
      let iconLink = Array.from(links).find(l => l.rel && l.rel.toLowerCase().indexOf('icon') >= 0);
      if (iconLink) {
        iconUrl = iconLink.getAttribute('href');
        if (iconUrl) {
          if (!iconUrl.startsWith('http')) {
            // Not an absolute url, so we have to concatenate the dapp url
            let url = new URL(forUrl);
            url.pathname = iconUrl;
            // The icon URL of some websites is xxx.ico?r1, so url.toString() will be 'xxx.ico%3Fr1'
            iconUrl = url.toString().replace(/%3F/g, '?');
          }
        }
      }
    }

    // THEME COLOR
    let themeColor: string = null;
    if (metas && metas.length > 0) {
      let themeColorMeta = Array.from(metas).find(m => m.name && m.name.toLowerCase() === 'theme-color');
      if (themeColorMeta) themeColor = themeColorMeta.content;
    }
    if (this.dabClient && themeColor) {
      this.dabClient.onThemeColor?.(themeColor);
      Logger.log('dappbrowser', 'Extracted website theme color:', themeColor);
    }

    Logger.log('dappbrowser', 'Extracted website title:', title);
    Logger.log('dappbrowser', 'Extracted website description:', description);
    Logger.log('dappbrowser', 'Extracted website icon URL:', iconUrl);

    // Remember this application as browsed permanently.
    this.activeBrowsedAppInfo.next(
      await this.saveBrowsedAppInfo({
        url: forUrl,
        title,
        description,
        iconUrl,
        lastBrowsed: moment().unix(),
        network: this.getActiveNetworkKey(),
        useExternalBrowser: false
      })
    );

    return htmlHeader;
  }

  private handleHtmlHeader(event: DappBrowserPlugin.DappBrowserEvent): Promise<Document> {
    return this.extractHtmlInfoAndUpdatedBrowsedDApp(event.data, this.url);
  }

  /**
   * Handles Web3 requests received from a dApp through the injected web3 provider.
   */
  private handleDABMessage(message: DABMessage) {
    if (message.type != 'message') {
      Logger.warn('dappbrowser', 'Received unknown message type', message.type);
      return;
    }

    Logger.log('dappbrowser', 'Received dApp message:', message.data);

    return this.queue.add(async () => {
      try {
        // UNISAT
        if (message.data.name.startsWith('unisat_')) {
          await this.unisatProtocolService.handleMessage(message);
          return;
        }

        // Elastos main chain and Elastos connector
        if (message.data.name.startsWith('elamain_') || message.data.name.startsWith('elastos_')) {
          await this.elastosMainchainProtocolService.handleMessage(message);
          return;
        }

        // Ethereum/EVM messages
        if (
          message.data.name.startsWith('eth_') ||
          message.data.name.startsWith('wallet_') ||
          message.data.name === 'personal_sign' ||
          message.data.name === 'signInsecureMessage'
        ) {
          await this.zone.run(async () => {
            await this.ethereumProtocolService.handleMessage(message);
          })
          return;
        }

        // If we get here, it's an unhandled message type
        Logger.warn('dappbrowser', 'Unhandled message command', message.data.name);
      } catch (error) {
        Logger.error('dappbrowser', 'Error handling dApp message:', error);
      }
    });
  }

  private handleDABExit() {
    this.activeBrowsedAppInfo.next(null);
  }

  private getActiveNetworkKey(): string {
    return WalletNetworkService.instance.activeNetwork.value
      ? WalletNetworkService.instance.activeNetwork.value.key
      : null;
  }

  /**
   * Consider we have enough info about an app when title and icon url are set.
   */
  private browsedAppInfoDataFilled(appInfo: BrowsedAppInfo): boolean {
    if (!appInfo.title || !appInfo.iconUrl) return false;

    if (appInfo.title === '' || appInfo.iconUrl === '') return false;

    return true;
  }

  /**
   * Saves information about a browsed dapp for later use (for example when adding to favorites)
   */
  public async saveBrowsedAppInfo(appInfo: BrowsedAppInfo): Promise<BrowsedAppInfo> {
    // Make sure to save only app info with clean data
    if (!this.browsedAppInfoDataFilled(appInfo)) {
      return appInfo;
    }

    let key = 'appinfo-' + appInfo.url; // Use the url as access key
    await this.globalStorageService.setSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'dappbrowser',
      key,
      appInfo
    );

    // Add to recently browsed apps list as well
    await this.addAppToRecent(appInfo.url);

    return appInfo;
  }

  public async getBrowsedAppInfo(url: string): Promise<BrowsedAppInfo> {
    let key = 'appinfo-' + url; // Use the url as access key
    let appInfo = await this.globalStorageService.getSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'dappbrowser',
      key,
      null
    );
    return appInfo;
  }

  /**
   * Add a browsed url to recently browsed apps. The recent apps array is always sorted by most
   * recent first.
   */
  private async addAppToRecent(url: string) {
    let recentApps = this.recentApps.value;

    // Remove this url from recents if already inside.
    // We use unique root domains to replace older recent dapps, as browsed info can contain
    // several sub paths while browinsg an app (1 app, multiple "browsed app info").
    let rootDomain = urlDomain(url);
    let existingIndex = this.recentApps.value.findIndex(appUrl => urlDomain(appUrl) === rootDomain);
    if (existingIndex >= 0) recentApps.splice(existingIndex, 1);

    // Add to front of recents
    recentApps.splice(0, 0, url); // Save the url to be able to open it, not the root domain

    // Remove old recents
    recentApps = recentApps.slice(0, MAX_RECENT_APPS);

    this.recentApps.next(recentApps);

    await this.saveRecentApps();
  }

  private async saveRecentApps() {
    await this.globalStorageService.setSetting<string[]>(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'dappbrowser',
      'recentapps',
      this.recentApps.value
    );
  }

  private async loadRecentApps() {
    this.recentApps.next(
      await this.globalStorageService.getSetting<string[]>(
        DIDSessionsStore.signedInDIDString,
        NetworkTemplateStore.networkTemplate,
        'dappbrowser',
        'recentapps',
        []
      )
    );
  }

  public async getRecentAppsWithInfo(): Promise<BrowsedAppInfo[]> {
    let appInfos: BrowsedAppInfo[] = [];
    for (let appUrl of this.recentApps.value) {
      let appInfo = await this.getBrowsedAppInfo(appUrl);
      if (appInfo) appInfos.push(appInfo);
    }
    return appInfos;
  }

  private async backgroundFetchUrlInfo(url: string): Promise<void> {
    console.log('backgroundFetchUrlInfo', url);
    try {
      // Note: this "add" is actually a "set" listener.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      dappBrowser.addEventListener(async event => {
        if (event.type == 'head') {
          await this.extractHtmlInfoAndUpdatedBrowsedDApp(event.data, url);
          await dappBrowser.close();
        } else if (event.type == 'loaderror') {
          await dappBrowser.close();
        }
      });
      await dappBrowser.open(url, '_webview', {
        hidden: true
      });

      console.log('backgroundFetchUrlInfo after loadurl');
    } catch (e) {
      Logger.warn('dappbrowser', `Failed to fetch background url info for url ${url}`, e);
    }
  }

  /**
   * Launch a recently browsed app.
   */
  public openRecentApp(recentApp: BrowsedAppInfo) {
    if (recentApp.useExternalBrowser) {
      void this.globalIntentService.sendIntent('openurl', {
        url: recentApp.url
      });
      // Update lastBrowsed.
      recentApp.lastBrowsed = moment().unix();
      void this.saveBrowsedAppInfo(recentApp);
    } else {
      void this.openForBrowseMode(recentApp.url, recentApp.title);
    }
  }

  public async clearRecentApps(): Promise<void> {
    this.recentApps.next([]);
    await this.saveRecentApps();
  }

  public showWebView() {
    if (!this.confirming) {
      Logger.log('dappbrowser', 'Showing web view');
      void dappBrowser.show();
    }
  }

  /**
   * Sets up subscriptions to dApp-specific wallet changes
   */
  private setupDappWalletSubscriptions(): void {
    this.ethereumProtocolService.setupSubscriptions();
    this.unisatProtocolService.setupSubscriptions();
  }

  private removeDappWalletSubscriptions(): void {
    this.ethereumProtocolService.removeSubscriptions();
    this.unisatProtocolService.removeSubscriptions();
  }
}
