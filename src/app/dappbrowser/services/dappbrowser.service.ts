import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { DID } from "@elastosfoundation/elastos-connectivity-sdk-js";
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { BehaviorSubject, Subscription } from 'rxjs';
import { lazyPhishingDetectorImport } from 'src/app/helpers/import.helper';
import { urlDomain } from 'src/app/helpers/url.helpers';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from 'src/app/model/ethereum/requestparams';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { MasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import type { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { BTCMainNetNetwork } from 'src/app/wallet/model/networks/btc/network/btc.mainnet.network';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import type { EthSignIntentResult } from 'src/app/wallet/pages/intents/ethsign/intentresult';
import type { PersonalSignIntentResult } from 'src/app/wallet/pages/intents/personalsign/intentresult';
import type { SignTypedDataIntentResult } from 'src/app/wallet/pages/intents/signtypeddata/intentresult';
import type { EditCustomNetworkIntentResult } from 'src/app/wallet/pages/settings/edit-custom-network/intentresult';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import type { BrowsedAppInfo } from '../model/browsedappinfo';
import { ElastosMainChainMainNetNetwork, ElastosMainChainNetworkBase } from 'src/app/wallet/model/networks/elastos/mainchain/network/elastos.networks';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { SHA256 } from 'src/app/helpers/crypto/sha256';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

type InjectedProviderType = "ethereum" | "elastos" | "elamain" | "unisat";

const MAX_RECENT_APPS = 100;

export type DABMessage = {
    type: "message";
    data: {
        id: number;
        name: string; // Command name
        object: any; // Usually, the ETH JSON RPC payload.
    }
}

export type DABError = {
    type: "loaderror";
    url: string;
    code?: number;
    message: string;
    sslerror?: string;
}

export type DABLoadStop = {
    type: "loadstop";
    url: string;
}

enum AddressType  {
    Normal_external = 'normal-external',
    Normal_internal = 'normal-internal',
    Owner = 'owner',
    CROwnerDeposit = 'cr-owner-deposit',
    OwnerDeposit = 'owner-deposit',
    OwnerStake = 'owner-stake',
    All = 'all'
  }

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

    // Latest data sent to the provider, still while in app
    private userEVMAddress: string = null; // EVM wallet address
    private activeChainID: number; // EVM network ID
    private activeEVMNetworkRpcUrl: string = null;
    private userBTCAddress: string = null; // Bitcoin wallet address
    private btcRpcUrl: string = null;
    private userELAMainChainAddress: string = null; // ELA main chain wallet address
    private elamainRpcUrl: string = null;

    private dabClient: DappBrowserClient = null;
    public title: string = null;
    public url: string;
    public activeBrowsedAppInfo = new BehaviorSubject<BrowsedAppInfo>(null); // Extracted info about a fetched dapp, after it's successfully loaded.
    public recentApps = new BehaviorSubject<string[]>([]);

    private networkSubscription: Subscription = null;
    private walletSubscription: Subscription = null;
    public confirming = false;

    public askedDomains = [];

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
        private walletNetworkService: WalletNetworkService
    ) {
        DappBrowserService.instance = this;

        void this.init();
    }

    public init() {
        GlobalServiceManager.getInstance().registerService(this);
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        await this.loadRecentApps();
        return;
    }

    onUserSignOut(): Promise<void> {
        return;
    }

    public async getBrowseMode(): Promise<DAppsBrowseMode> {
        if (await this.prefs.getUseBuiltInBrowser(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate))
            return DAppsBrowseMode.IN_APP;
        else
            return DAppsBrowseMode.EXTERNAL_BROWSER;
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
        Logger.log("dappbrowser", "detector return", domain, ret);
        return ret;
    }

    public async showScamWarning(domain: string): Promise<boolean> {
        this.confirming = true;
        let ret = await this.globalPopupService.ionicConfirm("dappbrowser.scam-warning-title", "dappbrowser.scam-warning-message",
            'common.leave', 'common.continue');
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
            GlobalFirebaseService.instance.logEvent("browser_open_url_in_app");

            // We cano use the "standard" way to open dapps in app.
            return this.open(url, title, target);
        }
        else {
            GlobalFirebaseService.instance.logEvent("browser_open_url_outside");

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

        // Close any previous browser if needed, without going back in navigation
        await this.close("reload");

        if (await this.checkScamUrl(url)) {
            return;
        }

        Logger.log("dappbrowser", "Opening url", url);

        if (!target || target == null) {
            target = "_webview";
        }

        const activeNetwork = WalletNetworkService.instance.activeNetwork.value;
        const masterWallet = WalletService.instance.getActiveMasterWallet();

        // The main chain ID is -1 if there is no EVM subwallet. eg. BTC.
        if (activeNetwork instanceof EVMNetwork) {
            // Get the active network chain ID
            this.activeChainID = activeNetwork.getMainChainID();

            // Get the active network RPC URL
            this.activeEVMNetworkRpcUrl = activeNetwork.getRPCUrl();

            this.userEVMAddress = null;
            // Get the active wallet address
            if (WalletService.instance.activeNetworkWallet.value) {
                // EVM configuration
                let evmSubwallet = WalletService.instance.activeNetworkWallet.value.getMainEvmSubWallet();
                if (evmSubwallet)
                    this.userEVMAddress = await evmSubwallet.getCurrentReceiverAddress();

                // Bitcoin configuration
                const bitcoinNetwork = this.getBitcoinNetwork();
                this.btcRpcUrl = bitcoinNetwork.getRPCUrl();
                this.userBTCAddress = await this.getWalletBitcoinAddress(masterWallet);

                // Ela main chain configuration
                const elamainNetwork = this.getELAMainChainNetwork();
                this.elamainRpcUrl = elamainNetwork.getRPCUrl();
                this.userELAMainChainAddress = (await this.getWalletELAMainChainAddressesByType(masterWallet, 1))?.[0];
            }
        }
        else {
            this.userEVMAddress = null;
            this.activeChainID = -1;
            this.userBTCAddress = null;
            this.btcRpcUrl = null;
            this.userELAMainChainAddress = null;
            this.elamainRpcUrl = null;
        }

        var options: any = {
            titlebarheight: 50,
            backgroundcolor: "#bfbfbf",
            hidden: (target == "_webview"),
            did: DIDSessionsStore.signedInDIDString.replace(/:/g, "_")
        }

        await dappBrowser.setInjectedJavascript(await this.getInjectedJs()); // Inject the web3 provider and connector at document start

        if (title && title != null) {
            this.title = title;
            options.title = title;
        }
        else {
            this.title = null;
        }

        dappBrowser.addEventListener((ret) => {
            void this.handleEvent(ret);
        });

        await dappBrowser.open(url, target, options);
        if (target == "_webview" && navigate) {
            void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/browser', { animated: false });
        }

        // Remember this application as browsed permanently.
        let appInfo: BrowsedAppInfo = {
            url: this.url,
            title: "",
            description: "",
            iconUrl: "",
            network: WalletNetworkService.instance.activeNetwork.value.key,
            lastBrowsed: moment().unix(),
            useExternalBrowser: false
        }
        this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo(appInfo));
    }

    /**
     * Javascript code to inject at documents start
     */
    private async getInjectedJs(): Promise<string> {
        // Prepare our web3 provider bridge and elastos connectors for injection
        Logger.log("dappbrowser", "Loading the IAB web3 provider");
        let web3ProviderCode = await this.httpClient.get('assets/essentialsiabweb3provider.js', { responseType: 'text' }).toPromise();
        web3ProviderCode = web3ProviderCode + `
        console.log('Essentials Web3 provider is being created');
        window.ethereum = new DappBrowserWeb3Provider(${this.activeChainID}, '${this.activeEVMNetworkRpcUrl}', '${this.userEVMAddress}');
        window.web3 = {
            currentProvider: window.ethereum
        };
        console.log('Essentials Web3 provider is injected', window.ethereum, window.web3);

        const bitcoinProvider = new DappBrowserUnisatProvider('${this.btcRpcUrl}', '${this.userBTCAddress}');
        window.unisat = bitcoinProvider;
        window.okxwallet = {
            bitcoin: bitcoinProvider
        }
        console.log('Essentials Unisat/OKX providers are injected', bitcoinProvider);

        const elamainProvider = new DappBrowserElaMainProvider('${this.elamainRpcUrl}', '${this.userELAMainChainAddress}');
        window.elamain = elamainProvider;
        console.log('Essentials Ela main chain providers are injected', elamainProvider);
        `;

        Logger.log("dappbrowser", "Loading the IAB elastos connector");
        let elastosConnectorCode = await this.httpClient.get('assets/essentialsiabconnector.js', { responseType: 'text' }).toPromise();
        elastosConnectorCode = elastosConnectorCode + "\
        console.log('Essentials dapp browser connector is being created'); \
        window.elastos = new EssentialsDABConnector();\
        console.log('Essentials dapp browser connector is injected', window.elastos);";

        return web3ProviderCode + elastosConnectorCode;
    }

    /**
     * Closes the active browser, if any.
     *
     * Check browser.ts in the browser screen for the list of special modes when closing, for specific follow up action.
     * If no mode is given, the navigation simply goes back.
     */
    public close(mode?: "goToLauncher" | "reload"): Promise<void> {
        Logger.log("dappbrowser", "Closing current webview, if any");
        return dappBrowser.close(mode);
    }

    /**
     * Hides the active browser, if any
     */
    public hideActiveBrowser() {
        Logger.log("dappbrowser", "Hiding active browser");
        dappBrowser.hide();
    }

    public async reload() {
        Logger.log("dappbrowser", "Reloading current url");

        // Trick / Note:
        // - When we first open the browser we create the web3 provider constructor JS code, and the cordova plugin decides what is the right
        // time to inject it (different on android and ios.
        // - When we reload the page, the browser re-injects this JS code as it was originally.
        // - Though, the network can have been changed in the meantime from the status bar, by the user or programatically by the dapp.
        // - Because of that, apps like ELK think we are on the wrong (old) network but we are not, and our provider is not up-to-date with the right
        // chain id, so the app is stuck in a loop trying to request a network change that never happens.
        // - So we close the webview and we reopen it for simplicity.
        await this.close("reload");
        void this.open(this.url, this.title, null, false);
    }

    public async handleEvent(event: DappBrowserPlugin.DappBrowserEvent) {
        Logger.log("dappbrowser", "Received event", event);
        switch (event.type) {
            case "loadstart":
                await this.handleLoadStartEvent(event);
                if (this.dabClient != null && this.dabClient.onLoadStart) {
                    this.dabClient.onLoadStart();
                }
                break;
            case "loadstop":
                await this.handleLoadStopEvent(event as DABLoadStop);
                if (this.dabClient != null && this.dabClient.onLoadStop) {
                    this.dabClient.onLoadStop(event as DABLoadStop);
                }
                break;
            case "loaderror":
                if (this.dabClient != null && this.dabClient.onLoadError) {
                    this.dabClient.onLoadError(event as DABError);
                }
                break;
            case "beforeload":
                if (this.dabClient != null && this.dabClient.onBeforeLoad) {
                    this.dabClient.onBeforeLoad();
                }
                break;
            case "message":
                await this.handleDABMessage(event as DABMessage);
                if (this.dabClient != null && this.dabClient.onMessage) {
                    this.dabClient.onMessage(event as DABMessage);
                }
                break;
            case "progress":
                if (this.dabClient != null && this.dabClient.onProgress) {
                    this.dabClient.onProgress(event.progress);
                }
                break;
            case "urlchanged":
                if (this.dabClient != null && this.dabClient.onUrlChanged) {
                    this.dabClient.onUrlChanged(event.url);
                }
                break;
            case "head":
                let htmlHeader = await this.handleHtmlHeader(event);
                if (this.dabClient != null && this.dabClient.onHtmlHead) {
                    this.dabClient.onHtmlHead(htmlHeader);
                }
                break;
            case "customscheme":
                if (this.dabClient != null && this.dabClient.onCustomScheme) {
                    this.dabClient.onCustomScheme(event.url);
                }
                break;
            case "exit":
                await this.handleDABExit();
                if (this.dabClient != null) {
                    this.dabClient.onExit(event.mode);
                }
                break;
        }
    }

    private async sendActiveNetworkToDApp(activeNetwork: AnyNetwork) {
        // Get the active network RPC URL
        if (activeNetwork instanceof EVMNetwork) {
            this.activeEVMNetworkRpcUrl = activeNetwork.getRPCUrl();
            // Get the active network chain ID
            this.activeChainID = activeNetwork.getMainChainID();
        }
        else {
            this.activeEVMNetworkRpcUrl = null;
            this.activeChainID = -1;
        }

        Logger.log("dappbrowser", "Sending active network to dapp", activeNetwork.key, this.activeChainID, this.activeEVMNetworkRpcUrl);

        await dappBrowser.setInjectedJavascript(await this.getInjectedJs()); // Inject the web3 provider and connector at document start
        void dappBrowser.executeScript({
            code: `
                window.ethereum.setRPCApiEndpoint(${this.activeChainID}, '${this.activeEVMNetworkRpcUrl}');
                window.ethereum.setChainId(${this.activeChainID});
            `});

        // Save new network to browsed app info
        await this.setActiveBrowsedAppInfoNetwork(activeNetwork.key);
    }

    private async sendActiveWalletToDApp(networkWallet: AnyNetworkWallet) {
        // Get the active wallet address
        if (networkWallet) {
            let evmSubwallet = networkWallet.getMainEvmSubWallet();
            if (evmSubwallet) {
                this.userEVMAddress = await evmSubwallet.getCurrentReceiverAddress();
            } else {
                this.userEVMAddress = null;
            }
            this.userBTCAddress = await this.getWalletBitcoinAddress(networkWallet.masterWallet);

            this.userELAMainChainAddress = (await this.getWalletELAMainChainAddressesByType(networkWallet.masterWallet, 1))?.[0];

            Logger.log("dappbrowser", "Sending active address to dapp", this.userEVMAddress, this.userBTCAddress, this.userELAMainChainAddress);

            await dappBrowser.setInjectedJavascript(await this.getInjectedJs()); // Inject the web3 provider and connector at document start
            void dappBrowser.executeScript({
                code: `
                    window.ethereum.setAddress('${this.userEVMAddress}');
                    window.unisat.setAddress('${this.userBTCAddress}');
                    window.elamain.setAddress('${this.userELAMainChainAddress}');
                `});
        }
    }

    private async handleLoadStartEvent(event: DappBrowserPlugin.DappBrowserEvent) {
        // Updated the browsed url
        this.url = event.url;

        // Remember this application as browsed permanently.
        let appInfo: BrowsedAppInfo = {
            url: this.url,
            title: "",
            description: "",
            iconUrl: "",
            lastBrowsed: moment().unix(),
            network: this.getActiveNetworkKey(),
            useExternalBrowser: false
        }
        this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo(appInfo));
    }

    private handleLoadStopEvent(event: DABLoadStop): Promise<void> {
        if (!this.networkSubscription) {
            this.networkSubscription = WalletNetworkService.instance.activeNetwork.subscribe(activeNetwork => {
                void this.sendActiveNetworkToDApp(activeNetwork);
            });
        }

        if (!this.walletSubscription) {
            this.walletSubscription = WalletService.instance.activeNetworkWallet.subscribe(netWallet => {
                void this.sendActiveWalletToDApp(netWallet);
            });
        }

        return;
    }

    private async extractHtmlInfoAndUpdatedBrowsedDApp(html: string, forUrl: string): Promise<Document> {
        let domParser = new DOMParser();
        let htmlHeader = domParser.parseFromString(html, "text/html");
        //console.log("HEADER", event, htmlHeader, event.data);

        // Extract all the information we can, but mostly the app title, description and icon
        let metas = htmlHeader.getElementsByTagName("meta");

        // TITLE
        let title: string = null;
        let titleTags = htmlHeader.getElementsByTagName("title");
        if (titleTags && titleTags.length > 0) {
            title = titleTags[0].innerText;
        }

        if (!title) {
            // No standard <title> tag found, try to get more info from the metas.
            if (metas && metas.length > 0) {
                let appNameMeta = Array.from(metas).find(m => m.name && m.name.toLowerCase() === "application-name");
                if (appNameMeta)
                    title = appNameMeta.content;
            }

            if (!title) {
                // No title found, use a placeholder
                title = "Untitled";
            }
        }

        // DESCRIPTION
        let description = ""; // Default description is empty if nothing is found
        if (metas && metas.length > 0) {
            let descriptionMeta = Array.from(metas).find(m => m.name && m.name.toLowerCase() === "description");
            if (descriptionMeta)
                description = descriptionMeta.content;
        }

        // ICON
        let iconUrl: string = null;
        let links = htmlHeader.getElementsByTagName("link");
        if (links && links.length > 0) {
            let iconLink = Array.from(links).find(l => l.rel && l.rel.toLowerCase().indexOf("icon") >= 0);
            if (iconLink) {
                iconUrl = iconLink.getAttribute("href");
                if (iconUrl) {
                    if (!iconUrl.startsWith("http")) { // Not an absolute url, so we have to concatenate the dapp url
                        let url = new URL(forUrl);
                        url.pathname = iconUrl;
                        // The icon URL of some websites is xxx.ico?r1, so url.toString() will be 'xxx.ico%3Fr1'
                        iconUrl = url.toString().replace(/%3F/g, "?");
                    }
                }
            }
        }

        // THEME COLOR
        let themeColor: string = null;
        if (metas && metas.length > 0) {
            let themeColorMeta = Array.from(metas).find(m => m.name && m.name.toLowerCase() === "theme-color");
            if (themeColorMeta)
                themeColor = themeColorMeta.content;
        }
        if (this.dabClient && themeColor) {
            this.dabClient.onThemeColor?.(themeColor);
            Logger.log("dappbrowser", "Extracted website theme color:", themeColor);
        }

        Logger.log("dappbrowser", "Extracted website title:", title);
        Logger.log("dappbrowser", "Extracted website description:", description);
        Logger.log("dappbrowser", "Extracted website icon URL:", iconUrl);

        // Remember this application as browsed permanently.
        this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo({
            url: forUrl,
            title,
            description,
            iconUrl,
            lastBrowsed: moment().unix(),
            network: this.getActiveNetworkKey(),
            useExternalBrowser: false
        }));

        return htmlHeader;
    }

    private handleHtmlHeader(event: DappBrowserPlugin.DappBrowserEvent): Promise<Document> {
        return this.extractHtmlInfoAndUpdatedBrowsedDApp(event.data, this.url);
    }

    /**
     * Handles Web3 requests received from a dApp through the injected web3 provider.
     */
    private async handleDABMessage(message: DABMessage) {
        if (message.type != "message") {
            Logger.warn("dappbrowser", "Received unknown message type", message.type);
            return;
        }

        // UNISAT
        if (message.data.name.startsWith("unisat_")) {
            await this.handleUnisatMessage(message);
            return;
        }

        // Elastos main chain
        if (message.data.name.startsWith("elamain_")) {
            await this.handleElaMainMessage(message);
            return;
        }

        // EVM, Elastos connectivity SDK
        switch (message.data.name) {
            // WEB3 PROVIDER
            case "eth_sendTransaction":
                dappBrowser.hide();
                await this.handleSendTransaction(message);
                this.showWebView();
                break;
            case "eth_requestAccounts":
                // NOTE: for now, directly return user accounts without asking for permission
                await this.handleRequestAccounts(message);
                break;
            case "eth_signTypedData":
                dappBrowser.hide();
                await this.handleSignTypedData(message);
                this.showWebView();
                break;
            case "personal_sign":
                dappBrowser.hide();
                await this.handlePersonalSign(message);
                this.showWebView();
                break;
            case "signInsecureMessage":
                dappBrowser.hide();
                await this.handleInsecureEthSign(message);
                void dappBrowser.show();
                break;
            case "wallet_switchEthereumChain":
                Logger.log("dappbrowser", "Received switch ethereum chain request");
                dappBrowser.hide();
                await this.handleSwitchEthereumChain(message);
                this.showWebView();
                break;
            case "wallet_addEthereumChain":
                Logger.log("dappbrowser", "Received add ethereum chain request");
                dappBrowser.hide();
                await this.handleAddEthereumChain(message);
                this.showWebView();
                break;

            // ELASTOS CONNECTOR
            case "elastos_getCredentials":
                dappBrowser.hide();
                await this.handleElastosGetCredentials(message);
                this.showWebView();
                break;
            /* case "elastos_requestCredentials":
                dappBrowser.hide();
                await this.handleElastosRequestCredentials(message);
                this.showWebView();
                break; */
            /* case "elastos_importCredentials":
                dappBrowser.hide();
                await this.handleElastosImportCredentials(message);
                this.showWebView();
                break; */
            case "elastos_signData":
                dappBrowser.hide();
                await this.handleElastosSignData(message);
                this.showWebView();
                break;
            case "elastos_essentials_url_intent":
                dappBrowser.hide();
                await this.handleEssentialsUrlIntent(message);
                this.showWebView();
                break;

            default:
                Logger.warn("dappbrowser", "Unhandled message command", message.data.name);
        }
    }

    private handleDABExit() {
        this.activeBrowsedAppInfo.next(null);
    }

    /**
     * Executes a smart contract transaction then returns the result to the calling dApp.
     */
    private async handleSendTransaction(message: DABMessage): Promise<void> {
        let response: {
            action: string,
            result: {
                txid: string,
                status: "published" | "cancelled"
            }
        } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/esctransaction", {
            payload: {
                params: [
                    message.data.object
                ]
            }
        });

        // 32 Bytes - the transaction hash, or the zero hash if the transaction is not yet available.
        if (response.result.txid) {
            this.sendInjectedResponse("ethereum", message.data.id, response.result.txid);
        } else {
            let errorMessage = 'Transaction rejected.';
            let code = 32003;
            if (response.result.status == 'cancelled') {
                errorMessage = "User rejected the request.";
                code = 4001;
            }
            this.sendInjectedError("ethereum", message.data.id, { code: code, message: errorMessage});
        }
    }

    /**
     * Returns the active user address to the calling dApp.
     */
    private handleRequestAccounts(message: DABMessage): Promise<void> {
        this.sendInjectedResponse("ethereum", message.data.id, [this.userEVMAddress]);
        return;
    }

    /**
     * Sign data with wallet private key according to EIP 712.
     */
    private async handleSignTypedData(message: DABMessage): Promise<void> {
        let rawData: { payload: string, useV4: boolean } = message.data.object
        let response: { result: SignTypedDataIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/signtypeddata", rawData);
        this.sendInjectedResponse("ethereum", message.data.id, response.result.signedData);
    }

    /**
     * Sign data with wallet private key according to EIP 712.
     */
    private async handlePersonalSign(message: DABMessage): Promise<void> {
        let rawData: { data: unknown } = message.data.object
        let response: { result: PersonalSignIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/personalsign", rawData);
        this.sendInjectedResponse("ethereum", message.data.id, response.result.signedData);
    }

    /**
     * Sign data with wallet private key according. Legacy insecure eth_sign command support.
     */
    private async handleInsecureEthSign(message: DABMessage): Promise<void> {
        let rawData: { data: unknown } = message.data.object
        let response: { result: EthSignIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/insecureethsign", rawData);
        this.sendInjectedResponse("ethereum", message.data.id, response.result.signedData);
    }

    private async handleSwitchEthereumChain(message: DABMessage): Promise<void> {
        let switchParams: SwitchEthereumChainParameter = message.data.object;

        let chainId = parseInt(switchParams.chainId);

        let targetNetwork = WalletNetworkService.instance.getNetworkByChainId(chainId);
        if (!targetNetwork) {
            // We don't support this network
            this.sendInjectedError("ethereum", message.data.id, {
                code: 4902,
                message: "Unsupported network"
            });
            return;
        }
        else {
            // Do nothing if already on the right network
            if ((WalletNetworkService.instance.activeNetwork.value as EVMNetwork).getMainChainID() === chainId) {
                Logger.log("dappbrowser", "Already on the right network");
                this.sendInjectedResponse("ethereum", message.data.id, {}); // Successfully switched
                return;
            }

            let networkSwitched = await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
            if (networkSwitched) {
                Logger.log("dappbrowser", "Successfully switched to the new network");
                this.sendInjectedResponse("ethereum", message.data.id, {}); // Successfully switched
            }
            else {
                Logger.log("dappbrowser", "Network switch cancelled");
                this.sendInjectedError("ethereum", message.data.id, {
                    code: -1,
                    message: "Cancelled operation"
                });
            }
        }
    }

    private async handleAddEthereumChain(message: DABMessage): Promise<void> {
        // Check if this network already exists or not.
        let addParams: AddEthereumChainParameter = message.data.object;
        let chainId = parseInt(addParams.chainId);

        let networkWasAdded = false;
        let addedNetworkKey: string;
        let existingNetwork = WalletNetworkService.instance.getNetworkByChainId(chainId);
        if (!existingNetwork) {
            // Network doesn't exist yet. Send an intent to the wallet and wait for the response.
            let response: EditCustomNetworkIntentResult = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/addethereumchain", addParams);

            if (response && response.networkAdded) {
                networkWasAdded = true;
                addedNetworkKey = response.networkKey;
            }
        }

        // Not on this network, ask user to switch
        if ((WalletNetworkService.instance.activeNetwork.value as EVMNetwork).getMainChainID() !== chainId) {
            let targetNetwork = existingNetwork;
            if (!targetNetwork)
                targetNetwork = WalletNetworkService.instance.getNetworkByKey(addedNetworkKey);

            if (targetNetwork) {
                // Ask user to switch but we don't mind the result.
                await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
            }
        }

        if (networkWasAdded || existingNetwork) {
            // Network added, or network already existed => success, no matter if user chosed to switch or not
            this.sendInjectedResponse("ethereum", message.data.id, {}); // Successfully added or existing
        }
        else {
            this.sendInjectedError("ethereum", message.data.id, {
                code: 4001,
                message: "User rejected the request."
            });
        }
    }

    private async handleElastosGetCredentials(message: DABMessage): Promise<void> {
        try {
            let query = message.data.object as DID.GetCredentialsQuery;

            let res: { result: { presentation: DIDPlugin.VerifiablePresentation } };
            res = await GlobalIntentService.instance.sendIntent("https://did.web3essentials.io/credaccess", query);

            if (!res || !res.result || !res.result.presentation) {
                console.warn("Missing presentation. The operation was maybe cancelled.");
                this.sendInjectedError("elastos", message.data.id, "Missing presentation. The operation was maybe cancelled.");
                return;
            }

            this.sendInjectedResponse("elastos", message.data.id, res.result.presentation);
        }
        catch (e) {
            this.sendInjectedError("elastos", message.data.id, e);
        }
    }

    private async handleElastosSignData(message: DABMessage): Promise<void> {
        try {
            let query = message.data.object as { data: string, jwtExtra?: any, signatureFieldName?: string };

            let res: { result: DID.SignedData };
            res = await GlobalIntentService.instance.sendIntent("https://did.web3essentials.io/didsign", query);

            if (!res || !res.result) {
                console.warn("Missing signature data. The operation was maybe cancelled.");
                this.sendInjectedError("elastos", message.data.id, "Missing signature data. The operation was maybe cancelled.");
                return;
            }

            this.sendInjectedResponse("elastos", message.data.id, res.result);
        }
        catch (e) {
            this.sendInjectedError("elastos", message.data.id, e);
        }
    }

    /**
     * Message has been received from the injected unisat provider.
     */
    private async handleUnisatMessage(message: DABMessage) {
        console.log("Unisat command received");

        switch (message.data.name) {
            case "unisat_sendBitcoin":
                let response: {
                    action: string,
                    result: {
                        txid: string,
                        status: "published" | "cancelled"
                    }
                } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/sendbitcoin", {
                    payload: {
                        params: [
                            message.data.object
                        ]
                    }
                })
                if (response.result.txid) {
                  this.sendInjectedResponse("unisat", message.data.id, response.result.txid);
                } else {
                  this.sendInjectedError("unisat", message.data.id, { code: 4001, message: "User rejected the request."});
                }
                break;
            case "unisat_signMessage":
                break;
            case "unisat_signData":
                let responseSigndata: {
                    action: string,
                    result: {
                        signature: string,
                    }
                } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/signbitcoindata", {
                    payload: {
                        params: [
                            message.data.object
                        ]
                    }
                })
                if (responseSigndata.result.signature) {
                  this.sendInjectedResponse("unisat", message.data.id, responseSigndata.result.signature);
                } else {
                  this.sendInjectedError("unisat", message.data.id, { code: 4001, message: "User rejected the request."});
                }
                break;
            default:
                Logger.warn("dappbrowser", "Unhandled unisat message command", message.data.name);
        }
    }

    /**
     * Message has been received from the injected elamain provider.
     */
    private async handleElaMainMessage(message: DABMessage) {
        console.log("Elamain command received", message);

        switch (message.data.name) {
            case "elamain_getMultiAddresses":
                const masterWallet = WalletService.instance.getActiveMasterWallet();
                const addresses = await this.getWalletELAMainChainAddressesByType(masterWallet, message.data.object.count, message.data.object.type, message.data.object.index);
                this.sendInjectedResponse("elamain", message.data.id, addresses);
                break;
            case "elamain_signMessage":
                let response: {
                    action: string,
                    result: {
                        signedDatas: string[],
                    }
                } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/elamainsignmessage", {
                    payload: message.data.object
                })
                if (response.result.signedDatas) {
                  this.sendInjectedResponse("elamain", message.data.id, response.result.signedDatas);
                } else {
                  this.sendInjectedError("elamain", message.data.id, { code: 4001, message: "User rejected the request."});
                }
                break;
            default:
                Logger.warn("dappbrowser", "Unhandled elamain message command", message.data.name);
        }
    }

    /**
     * Generic way to receive all kind of intents as if that came from native intents (eg: android).
     * TODO: This should replace other elastos_methods that don't require specific handling one by one.
     */
    private async handleEssentialsUrlIntent(message: DABMessage): Promise<void> {
        try {
            let query = message.data.object as { url: string, params: any };

            let res: { result: DID.SignedData };
            res = await GlobalIntentService.instance.sendIntent(query.url, query.params);

            if (!res || !res.result) {
                console.warn("Missing response data. The operation was maybe cancelled.");
                this.sendInjectedError("elastos", message.data.id, "Missing response data. The operation was maybe cancelled.");
                return;
            }

            this.sendInjectedResponse("elastos", message.data.id, res.result);
        }
        catch (e) {
            this.sendInjectedError("elastos", message.data.id, e);
        }
    }

    private sendInjectedResponse(provider: InjectedProviderType, id: number, result: any) {
        const stringifiedResult = JSON.stringify(result);
        const code = `window.${provider}.sendResponse(${id}, ${stringifiedResult})`;
        console.log("stringifiedResult", stringifiedResult, "code", code, "provider", provider);
        void dappBrowser.executeScript({ code });
    }

    private sendInjectedError(provider: InjectedProviderType, id: number, error: string | { code: number; message: string; }) {
        let stringifiedError: string;
        if (provider === "elastos")
            stringifiedError = typeof error == "string" ? error : new String(error).toString();
        else
            stringifiedError = JSON.stringify(error);

        const code = `window.${provider}.sendError(${id}, ${stringifiedError})`;
        console.log("stringifiedError", stringifiedError, "code", code, "provider", provider);
        void dappBrowser.executeScript({ code });
    }

    /**
     * Sends a request response from Essentials to the calling web app (web3).
     */
    /* private sendWeb3IABResponse(id: number, result: any) {
        let stringifiedResult = JSON.stringify(result);
        let code = 'window.ethereum.sendResponse(' + id + ', ' + stringifiedResult + ')';
        console.log("stringifiedResult", stringifiedResult, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    } */

    /* private sendWeb3IABError(id: number, error: { code: number; message: string; }) {
        let stringifiedError = JSON.stringify(error);
        let code = 'window.ethereum.sendError(' + id + ', ' + stringifiedError + ')';
        console.log("stringifiedError", stringifiedError, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    } */

    /* private sendElastosConnectorIABResponse(id: number, result: any) {
        let stringifiedResult = JSON.stringify(result);
        let code = 'window.elastos.sendResponse(' + id + ', ' + stringifiedResult + ')';
        console.log("stringifiedResult", stringifiedResult, "code", code);

        void dappBrowser.executeScript({ code });
    } */

    /* private sendElastosConnectorIABError(id: number, error: Error | string) {
        Logger.log("dappbrowser", "Sending elastos error", error);

        let stringifiedError = typeof error == "string" ? error : new String(error);
        let code = 'window.elastos.sendError(' + id + ', "' + stringifiedError + '")';
        console.log("stringifiedError", stringifiedError, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    } */

    private getActiveNetworkKey(): string {
        return WalletNetworkService.instance.activeNetwork.value ? WalletNetworkService.instance.activeNetwork.value.key : null;
    }

    /**
     * Consider we have enough info about an app when title and icon url are set.
     */
    private browsedAppInfoDataFilled(appInfo: BrowsedAppInfo): boolean {
        if (!appInfo.title || !appInfo.iconUrl)
            return false;

        if (appInfo.title === "" || appInfo.iconUrl === "")
            return false;

        return true;
    }

    /**
     * Saves information about a browsed dapp for later use (for example when adding to favorites)
     */
    public async saveBrowsedAppInfo(appInfo: BrowsedAppInfo): Promise<BrowsedAppInfo> {
        // Make sure to save only app info with clean data
        if (!this.browsedAppInfoDataFilled(appInfo))
            return appInfo;

        let key = "appinfo-" + appInfo.url; // Use the url as access key
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dappbrowser", key, appInfo);

        // Add to recently browsed apps list as well
        await this.addAppToRecent(appInfo.url);

        return appInfo;
    }

    public async getBrowsedAppInfo(url: string): Promise<BrowsedAppInfo> {
        let key = "appinfo-" + url; // Use the url as access key
        let appInfo = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dappbrowser", key, null);
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
        if (existingIndex >= 0)
            recentApps.splice(existingIndex, 1);

        // Add to front of recents
        recentApps.splice(0, 0, url); // Save the url to be able to open it, not the root domain

        // Remove old recents
        recentApps = recentApps.slice(0, MAX_RECENT_APPS);

        this.recentApps.next(recentApps);

        await this.saveRecentApps();
    }

    private async saveRecentApps() {
        await this.globalStorageService.setSetting<string[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dappbrowser", "recentapps", this.recentApps.value);
    }

    private async loadRecentApps() {
        this.recentApps.next(await this.globalStorageService.getSetting<string[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "dappbrowser", "recentapps", []));
    }

    public async getRecentAppsWithInfo(): Promise<BrowsedAppInfo[]> {
        let appInfos: BrowsedAppInfo[] = [];
        for (let appUrl of this.recentApps.value) {
            let appInfo = await this.getBrowsedAppInfo(appUrl);
            if (appInfo)
                appInfos.push(appInfo);
        }
        return appInfos;
    }

    private async backgroundFetchUrlInfo(url: string): Promise<void> {
        console.log("backgroundFetchUrlInfo", url);
        try {
            // Note: this "add" is actually a "set" listener.
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            dappBrowser.addEventListener(async event => {
                if (event.type == "head") {
                    await this.extractHtmlInfoAndUpdatedBrowsedDApp(event.data, url);
                    await dappBrowser.close();
                }
                else if (event.type == "loaderror") {
                    await dappBrowser.close();
                }
            });
            await dappBrowser.open(url, "_webview", {
                hidden: true
            });

            console.log("backgroundFetchUrlInfo after loadurl");
        }
        catch (e) {
            Logger.warn("dappbrowser", `Failed to fetch background url info for url ${url}`, e);
        }
    }

    /**
     * Launch a recently browsed app.
     */
    public openRecentApp(recentApp: BrowsedAppInfo) {
        /* if (recentApp.network && recentApp.network != this.getActiveNetworkKey()) {
            let previousNetwork = WalletNetworkService.instance.getNetworkByKey(recentApp.network);
            if (previousNetwork)
                await WalletNetworkService.instance.setActiveNetwork(previousNetwork);
        } */

        if (recentApp.useExternalBrowser) {
            void this.globalIntentService.sendIntent('openurl', { url: recentApp.url });
            // Update lastBrowsed.
            recentApp.lastBrowsed = moment().unix()
            void this.saveBrowsedAppInfo(recentApp)

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
            Logger.log("dappbrowser", "Showing web view");
            void dappBrowser.show();
        }
    }

    private getBitcoinNetwork(): BTCMainNetNetwork {
        return this.walletNetworkService.getNetworkByKey("btc") as BTCMainNetNetwork
    }

    private async getWalletBitcoinAddress(masterWallet: MasterWallet): Promise<string> {
        const bitcoinNetwork = this.getBitcoinNetwork();
        const bitcoinNetworkWallet = await bitcoinNetwork.createNetworkWallet(masterWallet, false)
        const addresses = bitcoinNetworkWallet?.safe.getAddresses(0, 1, false, null);
        return addresses?.[0];
    }

    private getELAMainChainNetwork(): ElastosMainChainMainNetNetwork {
        return this.walletNetworkService.getNetworkByKey(ElastosMainChainNetworkBase.networkKey) as ElastosMainChainMainNetNetwork
    }

    private async getWalletELAMainChainAddressesByType(masterWallet: MasterWallet, count, type = AddressType.Normal_external, index = 0) {
        const elaMainChainNetwork = this.getELAMainChainNetwork();
        const elaMainChainNetworkWallet = await elaMainChainNetwork.createNetworkWallet(masterWallet, false)
        if (!elaMainChainNetworkWallet) return [];

        let elaSubwallet = elaMainChainNetworkWallet.getSubWallet(StandardCoinName.ELA) as MainChainSubWallet;

        let addressArray = [];
        let address = null;
        let internal = false;
        switch (type) {
            case AddressType.CROwnerDeposit:
                address = elaSubwallet.getCRDepositAddress()
                if (address) addressArray.push(address)
                break;
            case AddressType.Owner:
                address = elaSubwallet.getOwnerAddress()
                if (address) addressArray.push(address)
                break;
            case AddressType.OwnerDeposit:
                address = elaSubwallet.getOwnerDepositAddress()
                if (address) addressArray.push(address)
                break;
            case AddressType.OwnerStake:
                address = elaSubwallet.getOwnerStakeAddress()
                if (address) addressArray.push(address)
                break;
            case AddressType.Normal_internal:
                internal = true;
            // eslint-disable-next-line no-fallthrough
            case AddressType.Normal_external:
                addressArray = elaMainChainNetworkWallet.safe.getAddresses(index, count, internal, null);
                break;
            case AddressType.All:
                // Add all special addresses first, then half the external addresses and half the internal addresses
                address = elaSubwallet.getCRDepositAddress()
                if (address) addressArray.push(address)
                address = elaSubwallet.getOwnerAddress()
                if (address) addressArray.push(address)
                address = elaSubwallet.getOwnerDepositAddress()
                if (address) addressArray.push(address)
                address = elaSubwallet.getOwnerStakeAddress()
                if (address) addressArray.push(address)

                let addressAccount = Math.ceil(count / 2)
                let addressesExternal = elaMainChainNetworkWallet.safe.getAddresses(index, addressAccount, true, null);
                addressArray = [...addressArray,  ...addressesExternal]

                let addressesInternal = elaMainChainNetworkWallet.safe.getAddresses(index, addressAccount, false, null);
                addressArray = [...addressArray,  ...addressesInternal]
                break;
        }
        return addressArray;
    }
}
