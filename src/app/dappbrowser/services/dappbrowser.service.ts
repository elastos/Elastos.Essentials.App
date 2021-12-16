import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { DID } from "@elastosfoundation/elastos-connectivity-sdk-js";
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { BehaviorSubject, Subscription } from 'rxjs';
import { urlDomain } from 'src/app/helpers/url.helpers';
import { CredImportIdentityIntentParams } from 'src/app/identity/model/identity.intents';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from 'src/app/model/ethereum/requestparams';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { SignTypedDataIntentResult } from 'src/app/wallet/pages/intents/signtypeddata/signtypeddata.page';
import { EditCustomNetworkIntentResult } from 'src/app/wallet/pages/settings/edit-custom-network/edit-custom-network.page';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { BrowsedAppInfo } from '../model/browsedappinfo';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;
declare let didManager: DIDPlugin.DIDManager;

const MAX_RECENT_APPS = 10;

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
    onCustomScheme?: (url: string) => void;
}
@Injectable({
    providedIn: 'root'
})
export class DappBrowserService implements GlobalService {
    private userAddress: string = null;
    private web3ProviderCode: string = null;
    private elastosConnectorCode: string = null;
    private activeChainID: number;
    private rpcUrl: string = null;
    private dabClient: DappBrowserClient = null;
    public title: string = null;
    public url: string;
    public activeBrowsedAppInfo = new BehaviorSubject<BrowsedAppInfo>(null); // Extracted info about a fetched dapp, after it's successfully loaded.
    public recentApps = new BehaviorSubject<string[]>([]);

    private networkSubscription: Subscription = null;
    private walletSubscription: Subscription = null;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalStorageService: GlobalStorageService,
        private walletNetworkService: WalletNetworkService,
        private walletService: WalletService,
        private g: GlobalDIDSessionsService,
        private globalIntentService: GlobalIntentService
    ) {
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

    public getBrowseMode(): DAppsBrowseMode {
        // TMP TRUE
        if (true || this.platform.platforms().indexOf('ios') >= 0)
            return DAppsBrowseMode.EXTERNAL_BROWSER;
        else
            return DAppsBrowseMode.IN_APP;
    }

    public canBrowseInApp(): boolean {
        return this.getBrowseMode() === DAppsBrowseMode.IN_APP;
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

    /**
     * Opens a url either in the in-app browser, or in the external browser, depending on the current
     * "browse mode". This allows opening apps inside essentials on android, and in the external browser
     * on ios.
     */
    public openForBrowseMode(url: string, title?: string, target?: string): Promise<void> {
        if (this.getBrowseMode() == DAppsBrowseMode.IN_APP) {
            // We cano use the "standard" way to open dapps in app.
            return this.open(url, title, target);
        }
        else {
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
    public async open(url: string, title?: string, target?: string) {
        this.url = url;

        if (!target || target == null) {
            target = "_webview";
        }

        let activeNetwork = WalletNetworkService.instance.activeNetwork.value;

        // Get the active network chain ID
        this.activeChainID = activeNetwork.getMainChainID();

        // The main chain ID is -1 if there is no EVM subwallet. eg. BTC.
        if (this.activeChainID != -1) {
            // Get the active network RPC URL
            this.rpcUrl = activeNetwork.getMainEvmRpcApiUrl();

            // Get the active wallet address
            if (WalletService.instance.activeNetworkWallet.value) {
                let subwallet = WalletService.instance.activeNetworkWallet.value.getMainEvmSubWallet();
                this.userAddress = await subwallet.createAddress();
            }
            else
                this.userAddress = null;
        }

        // Prepare our web3 provider bridge and elastos connectors for injection
        Logger.log("dappbrowser", "Loading the IAB web3 provider");
        if (this.userAddress) {
            this.web3ProviderCode = await this.httpClient.get('assets/essentialsiabweb3provider.js', { responseType: 'text' }).toPromise();
            this.web3ProviderCode = this.web3ProviderCode + `
            console.log('Elastos Essentials Web3 provider is being created');
            window.ethereum = new DappBrowserWeb3Provider(${this.activeChainID}, '${this.rpcUrl}', '${this.userAddress}');
            window.web3 = {
                currentProvider: window.ethereum
            };
            console.log('Elastos Essentials Web3 provider is injected', window.ethereum, window.web3);`;
        }
        else {
            this.web3ProviderCode = ''; // No wallet, no injection.
        }

        Logger.log("dappbrowser", "Loading the IAB elastos connector");
        this.elastosConnectorCode = await this.httpClient.get('assets/essentialsiabconnector.js', { responseType: 'text' }).toPromise();
        this.elastosConnectorCode = this.elastosConnectorCode + "\
        console.log('Elastos Essentials dapp browser connector is being created'); \
        window.elastos = new EssentialsDABConnector();\
        console.log('Elastos Essentials dapp browser connector is injected', window.elastos);";

        var options: any = {
            titlebarheight: 50,
            backgroundcolor: "#bfbfbf",
            hidden: (target == "_webview"),
            atdocumentstartscript: this.web3ProviderCode + this.elastosConnectorCode, // Inject the web3 provider and connector at document start
        }

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
        if (target == "_webview") {
            void this.nav.navigateTo(App.DAPP_BROWSER, '/dappbrowser/browser');
        }

        // Remember this application as browsed permanently.
        let appInfo: BrowsedAppInfo = {
            url: this.url,
            title: "",
            description: "",
            iconUrl: "",
            network: this.walletNetworkService.activeNetwork.value.key,
            lastBrowsed: moment().unix()
        }
        this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo(appInfo));
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

    private async sendActiveNetworkToDApp(activeNetwork: Network) {
        // Get the active network chain ID
        this.activeChainID = activeNetwork.getMainChainID();

        // Get the active network RPC URL
        this.rpcUrl = activeNetwork.getMainEvmRpcApiUrl();

        Logger.log("dappbrowser", "Sending active network to dapp", activeNetwork.key, this.activeChainID, this.rpcUrl);

        void dappBrowser.executeScript({
            code: `
                window.ethereum.setRPCApiEndpoint(${this.activeChainID}, '${this.rpcUrl}');
                window.ethereum.setChainId(${this.activeChainID});
            `});

        // Save new network to browsed app info
        await this.setActiveBrowsedAppInfoNetwork(activeNetwork.key);
    }

    private async sendActiveWalletToDApp(networkWallet: NetworkWallet) {
        // Get the active wallet address
        if (networkWallet) {
            let subwallet = networkWallet.getMainEvmSubWallet();
            this.userAddress = await subwallet.createAddress();

            Logger.log("dappbrowser", "Sending active address to dapp", this.userAddress);

            void dappBrowser.executeScript({
                code: " \
                    window.ethereum.setAddress('"+ this.userAddress + "');\
                "});
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
            network: this.getActiveNetworkKey()
        }
        this.activeBrowsedAppInfo.next(await this.saveBrowsedAppInfo(appInfo));
    }

    private handleLoadStopEvent(event: DABLoadStop): Promise<void> {
        if (!this.networkSubscription) {
            this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
                void this.sendActiveNetworkToDApp(activeNetwork);
            });
        }

        if (!this.walletSubscription) {
            this.walletSubscription = this.walletService.activeNetworkWallet.subscribe(netWallet => {
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

        // TITLE
        let title: string = null;
        let titleTags = htmlHeader.getElementsByTagName("title");
        if (titleTags && titleTags.length > 0) {
            title = titleTags[0].innerText;
        }

        if (!title) {
            // No title found, use a placeholder
            title = "Untitled";
        }

        // DESCRIPTION
        let description = ""; // Default description is empty if nothing is found
        let metas = htmlHeader.getElementsByTagName("meta");
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
            network: this.getActiveNetworkKey()
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

        switch (message.data.name) {
            // WEB3 PROVIDER
            case "eth_sendTransaction":
                dappBrowser.hide();
                await this.handleSendTransaction(message);
                void dappBrowser.show();
                break;
            case "eth_requestAccounts":
                // NOTE: for now, directly return user accounts without asking for permission
                await this.handleRequestAccounts(message);
                break;
            case "eth_signTypedData":
                dappBrowser.hide();
                await this.handleSignTypedData(message);
                void dappBrowser.show();
                break;
            case "wallet_switchEthereumChain":
                Logger.log("dappbrowser", "Received switch ethereum chain request");
                dappBrowser.hide();
                await this.handleSwitchEthereumChain(message);
                void dappBrowser.show();
                break;
            case "wallet_addEthereumChain":
                Logger.log("dappbrowser", "Received add ethereum chain request");
                dappBrowser.hide();
                await this.handleAddEthereumChain(message);
                void dappBrowser.show();
                break;

            // ELASTOS CONNECTOR
            case "elastos_getCredentials":
                dappBrowser.hide();
                await this.handleElastosGetCredentials(message);
                void dappBrowser.show();
                break;
            case "elastos_requestCredentials":
                dappBrowser.hide();
                await this.handleElastosRequestCredentials(message);
                void dappBrowser.show();
                break;
            case "elastos_importCredentials":
                dappBrowser.hide();
                await this.handleElastosImportCredentials(message);
                void dappBrowser.show();
                break;
            case "elastos_signData":
                dappBrowser.hide();
                await this.handleElastosSignData(message);
                void dappBrowser.show();
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
        } = await GlobalIntentService.instance.sendIntent("https://wallet.elastos.net/esctransaction", {
            payload: {
                params: [
                    message.data.object
                ]
            }
        });

        this.sendWeb3IABResponse(
            message.data.id,
            response.result.txid // 32 Bytes - the transaction hash, or the zero hash if the transaction is not yet available.
        );
    }

    /**
     * Returns the active user address to the calling dApp.
     */
    private handleRequestAccounts(message: DABMessage): Promise<void> {
        this.sendWeb3IABResponse(
            message.data.id,
            [this.userAddress]
        );
        return;
    }

    /**
     * Sign data with wallet private key according to EIP 712.
     */
    private async handleSignTypedData(message: DABMessage): Promise<void> {
        let rawData: { payload: string, useV4: boolean } = message.data.object
        let response: { result: SignTypedDataIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.elastos.net/signtypeddata", rawData);

        this.sendWeb3IABResponse(
            message.data.id,
            response.result.signedData
        );
    }

    private async handleSwitchEthereumChain(message: DABMessage): Promise<void> {
        let switchParams: SwitchEthereumChainParameter = message.data.object;

        let chainId = parseInt(switchParams.chainId);

        let targetNetwork = WalletNetworkService.instance.getNetworkByChainId(chainId);
        if (!targetNetwork) {
            // We don't support this network
            this.sendWeb3IABError(message.data.id, {
                code: 4902,
                message: "Unsupported network"
            });
            return;
        }
        else {
            // Do nothing if already on the right network
            if (WalletNetworkService.instance.activeNetwork.value.getMainChainID() === chainId) {
                Logger.log("walletconnect", "Already on the right network");
                this.sendWeb3IABResponse(message.data.id, {}); // Successfully switched
                return;
            }

            let networkSwitched = await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
            if (networkSwitched) {
                Logger.log("walletconnect", "Successfully switched to the new network");
                this.sendWeb3IABResponse(message.data.id, {}); // Successfully switched
            }
            else {
                Logger.log("walletconnect", "Network switch cancelled");
                this.sendWeb3IABError(message.data.id, {
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
            let response: EditCustomNetworkIntentResult = await GlobalIntentService.instance.sendIntent("https://wallet.elastos.net/addethereumchain", addParams);

            if (response && response.networkAdded) {
                networkWasAdded = true;
                addedNetworkKey = response.networkKey;
            }
        }

        // Not on this network, ask user to switch
        if (WalletNetworkService.instance.activeNetwork.value.getMainChainID() !== chainId) {
            let targetNetwork = existingNetwork;
            if (!targetNetwork)
                targetNetwork = WalletNetworkService.instance.getNetworkByKey(addedNetworkKey);

            // Ask user to switch but we don't mind the result.
            await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
        }

        if (networkWasAdded || existingNetwork) {
            // Network added, or network already existed => success, no matter if user chosed to switch or not
            this.sendWeb3IABResponse(message.data.id, {}); // Successfully added or existing
        }
        else {
            this.sendWeb3IABError(message.data.id, {
                code: -1,
                message: "Network not added"
            });
        }
    }

    private async handleElastosGetCredentials(message: DABMessage): Promise<void> {
        try {
            let query = message.data.object as DID.GetCredentialsQuery;

            let res: { result: { presentation: DIDPlugin.VerifiablePresentation } };
            res = await GlobalIntentService.instance.sendIntent("https://did.elastos.net/credaccess", query);

            if (!res || !res.result || !res.result.presentation) {
                console.warn("Missing presentation. The operation was maybe cancelled.");
                this.sendElastosConnectorIABError(message.data.id, "Missing presentation. The operation was maybe cancelled.");
                return;
            }

            this.sendElastosConnectorIABResponse(
                message.data.id,
                res.result.presentation
            );
        }
        catch (e) {
            this.sendElastosConnectorIABError(message.data.id, e);
        }
    }

    private async handleElastosRequestCredentials(message: DABMessage): Promise<void> {
        try {
            let request = message.data.object as DID.CredentialDisclosureRequest;

            let res: { result: { presentation: DIDPlugin.VerifiablePresentation } };
            res = await GlobalIntentService.instance.sendIntent("https://did.elastos.net/requestcredentials", { request });

            if (!res || !res.result || !res.result.presentation) {
                console.warn("Missing presentation. The operation was maybe cancelled.");
                this.sendElastosConnectorIABError(message.data.id, "Missing presentation. The operation was maybe cancelled.");
                return;
            }

            this.sendElastosConnectorIABResponse(
                message.data.id,
                res.result.presentation
            );
        }
        catch (e) {
            this.sendElastosConnectorIABError(message.data.id, e);
        }
    }

    private async handleElastosImportCredentials(message: DABMessage): Promise<void> {
        try {
            let request: { credentials: string[], options?: DID.ImportCredentialOptions } = message.data.object;

            let credentials: DIDPlugin.VerifiableCredential[] = [];
            for (let cs of request.credentials) {
                credentials.push(didManager.VerifiableCredentialBuilder.fromJson(cs));
            }

            request.options = request.options || {};

            let res: { result: { importedcredentials: string[] } };
            let importParams: CredImportIdentityIntentParams = {
                credentials,
                forceToPublishCredentials: request.options.forceToPublishCredentials,
                customization: null
            };
            res = await GlobalIntentService.instance.sendIntent("https://did.elastos.net/credimport", importParams);

            if (!res || !res.result || !res.result.importedcredentials) {
                console.warn("Missing imported credentials result. The operation was maybe cancelled.");
                this.sendElastosConnectorIABError(message.data.id, "Missing imported credentials result. The operation was maybe cancelled.");
                return;
            }

            this.sendElastosConnectorIABResponse(
                message.data.id,
                res.result.importedcredentials
            );
        }
        catch (e) {
            this.sendElastosConnectorIABError(message.data.id, e);
        }
    }

    private async handleElastosSignData(message: DABMessage): Promise<void> {
        try {
            let query = message.data.object as { data: string, jwtExtra?: any, signatureFieldName?: string };

            let res: { result: DID.SignedData };
            res = await GlobalIntentService.instance.sendIntent("https://did.elastos.net/didsign", query);

            if (!res || !res.result) {
                console.warn("Missing signature data. The operation was maybe cancelled.");
                this.sendElastosConnectorIABError(message.data.id, "Missing signature data. The operation was maybe cancelled.");
                return;
            }

            this.sendElastosConnectorIABResponse(
                message.data.id,
                res.result
            );
        }
        catch (e) {
            this.sendElastosConnectorIABError(message.data.id, e);
        }
    }

    /**
     * Sends a request response from Essentials to the calling web app (web3).
     */
    private sendWeb3IABResponse(id: number, result: any) {
        let stringifiedResult = JSON.stringify(result);
        let code = 'window.ethereum.sendResponse(' + id + ', ' + stringifiedResult + ')';
        console.log("stringifiedResult", stringifiedResult, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    }

    private sendWeb3IABError(id: number, error: { code: number; message: string; }) {
        let stringifiedError = JSON.stringify(error);
        let code = 'window.ethereum.sendError(' + id + ', ' + stringifiedError + ')';
        console.log("stringifiedError", stringifiedError, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    }

    private sendElastosConnectorIABResponse(id: number, result: any) {
        let stringifiedResult = JSON.stringify(result);
        let code = 'window.elastos.sendResponse(' + id + ', ' + stringifiedResult + ')';
        console.log("stringifiedResult", stringifiedResult, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    }

    private sendElastosConnectorIABError(id: number, error: Error | string) {
        Logger.log("dappbrowser", "Sending elastos error", error);

        let stringifiedError = typeof error == "string" ? error : new String(error);
        let code = 'window.elastos.sendError(' + id + ', "' + stringifiedError + '")';
        console.log("stringifiedError", stringifiedError, "code", code);

        void dappBrowser.executeScript({
            code: code
        });
    }

    private getActiveNetworkKey(): string {
        return this.walletNetworkService.activeNetwork.value ? this.walletNetworkService.activeNetwork.value.key : null;
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
        await this.globalStorageService.setSetting(GlobalDIDSessionsService.signedInDIDString, "dappbrowser", key, appInfo);

        // Add to recently browsed apps list as well
        await this.addAppToRecent(appInfo.url);

        return appInfo;
    }

    public async getBrowsedAppInfo(url: string): Promise<BrowsedAppInfo> {
        let key = "appinfo-" + url; // Use the url as access key
        let appInfo = await this.globalStorageService.getSetting(GlobalDIDSessionsService.signedInDIDString, "dappbrowser", key, null);
        return appInfo;
    }

    /**
     * Add a browsed url to recently browsed apps. The recents apps array is always sorted by most
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
        await this.globalStorageService.setSetting<string[]>(GlobalDIDSessionsService.signedInDIDString, "dappbrowser", "recentapps", this.recentApps.value);
    }

    private async loadRecentApps() {
        this.recentApps.next(await this.globalStorageService.getSetting<string[]>(GlobalDIDSessionsService.signedInDIDString, "dappbrowser", "recentapps", []));
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
     * Launch a recently browsed app. If the last network used while browing this dapp
     * is not the active one, first toggle to the right network that users like to use with this
     * dapp.
     */
    public async openRecentApp(recentApp: BrowsedAppInfo) {
        if (recentApp.network && recentApp.network != this.getActiveNetworkKey()) {
            let previousNetwork = this.walletNetworkService.getNetworkByKey(recentApp.network);
            if (previousNetwork)
                await this.walletNetworkService.setActiveNetwork(previousNetwork);
        }
        void this.openForBrowseMode(recentApp.url, recentApp.title);
    }

    public async clearRecentApps(): Promise<void> {
        this.recentApps.next([]);
        await this.saveRecentApps();
    }
}