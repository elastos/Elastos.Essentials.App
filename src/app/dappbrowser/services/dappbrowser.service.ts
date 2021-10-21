import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { GetCredentialsQuery } from '@elastosfoundation/elastos-connectivity-sdk-cordova/typings/did';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from 'src/app/model/ethereum/requestparams';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { SignTypedDataIntentResult } from 'src/app/wallet/pages/intents/signtypeddata/signtypeddata.page';
import { EditCustomNetworkIntentResult } from 'src/app/wallet/pages/settings/edit-custom-network/edit-custom-network.page';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { BrowsedAppInfo } from '../model/browsedappinfo';
import { StorageService } from './storage.service';

declare let dappBrowser: DappBrowserPlugin.DappBrowser;

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
export class DappBrowserService {
    private userAddress: string = null;
    private web3ProviderCode: string = null;
    private elastosConnectorCode: string = null;
    private activeChainID: number;
    private rpcUrl: string = null;
    private dabClient: DappBrowserClient = null;
    public title: string = null;
    public url: string;
    public activeBrowsedAppInfo = new BehaviorSubject<BrowsedAppInfo>(null); // Extracted info about a fetched dapp, after it's successfully loaded.

    private networkSubscription: Subscription = null;
    private walletSubscription: Subscription = null;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private walletNetworkService: WalletNetworkService,
        private walletService: WalletService,
        private storageService: StorageService
    ) {
        void this.init();
    }

    async init() {
        // NOTE: Make sure to load everything before creating the browser, to be able to synchronously
        // inject the code in the "loadstart" event. Otherwise, the target dapp code loads partially
        // or fully before our injection and the web3 provider is sometimes not found.

        // Prepare our web3 provider bridge and elastos connectors for injection
        Logger.log("dappbrowser", "Loading the IAB web3 provider");
        this.web3ProviderCode = await this.httpClient.get('assets/essentialsiabweb3provider.js', { responseType: 'text' }).toPromise();

        Logger.log("dappbrowser", "Loading the IAB elastos connector");
        this.elastosConnectorCode = await this.httpClient.get('assets/essentialsiabconnector.js', { responseType: 'text' }).toPromise();
    }

    public setClient(dabClient: DappBrowserClient) {
        this.dabClient = dabClient;
    }

    public getActiveBrowsedAppInfo(): BrowsedAppInfo {
        return this.activeBrowsedAppInfo.value;
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

        var options: any = {
            titlebarheight: 50,
            backgroundcolor: this.theme.darkMode ? "#121212" : "#F5F5FD",
            hidden: (target == "_webview"),
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
        this.activeBrowsedAppInfo.next(await this.storageService.saveBrowsedAppInfo(this.url, "", "", ""));
    }

    public async handleEvent(event: DappBrowserPlugin.DappBrowserEvent) {
        Logger.log("dappbrowser", "Received event", event);
        switch (event.type) {
            case "loadstart":
                if (this.dabClient != null && this.dabClient.onLoadStart) {
                    this.dabClient.onLoadStart();
                }
                break;
            case "loadstop":
                await this.injectWeb3Provider(event);
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

    private async injectWeb3Provider(event: DappBrowserPlugin.DappBrowserEvent) {
        // Updated the browsed url
        this.url = event.url;

        // Inject the web3 provider
        Logger.log("dappbrowser", "Executing Web3 provider injection script");
        void dappBrowser.executeScript({
            code: this.web3ProviderCode + "\
            console.log('Elastos Essentials Web3 provider is being created'); \
            window.ethereum = new DappBrowserWeb3Provider();\
            window.web3 = { \
                currentProvider: window.ethereum\
            };\
            console.log('Elastos Essentials Web3 provider is injected', window.ethereum, window.web3); \
        "});

        // Inject the Elastos connectivity connector
        Logger.log("dappbrowser", "Executing Elastos connector injection script");
        void dappBrowser.executeScript({
            code: this.elastosConnectorCode + "\
            console.log('Elastos Essentials dapp browser connector is being created'); \
            window.elastos = new EssentialsDABConnector();\
            console.log('Elastos Essentials dapp browser connector is injected', window.elastos); \
        "});

        Logger.log("dappbrowser", "Injection completed");

        // TODO: window.ethereum.setAddress() should maybe be called only when receiving a eth_requestAccounts request.

        if (!this.networkSubscription) {
            this.networkSubscription = this.walletNetworkService.activeNetwork.subscribe(activeNetwork => {
                this.sendActiveNetworkToDApp(activeNetwork);
            });
        }

        if (!this.walletSubscription) {
            this.walletSubscription = this.walletService.activeNetworkWallet.subscribe(netWallet => {
                void this.sendActiveWalletToDApp(netWallet);
            });
        }

        // Manually send current network and wallet first (behaviorsubject gets the event only for the first
        // dapp opened)
        this.sendActiveNetworkToDApp(WalletNetworkService.instance.activeNetwork.value);
        void this.sendActiveWalletToDApp(WalletService.instance.activeNetworkWallet.value);

        // Remember this application as browsed permanently.
        this.activeBrowsedAppInfo.next(await this.storageService.saveBrowsedAppInfo(this.url, "", "", ""));

        return;
    }

    private sendActiveNetworkToDApp(activeNetwork: Network) {
        // Get the active netwok chain ID
        this.activeChainID = activeNetwork.getMainChainID();

        // Get the active network RPC URL
        this.rpcUrl = activeNetwork.getMainEvmRpcApiUrl();

        void dappBrowser.executeScript({
            code: " \
                window.ethereum.setChainId("+ this.activeChainID + "); \
                window.ethereum.setRPCApiEndpoint("+ this.activeChainID + ", '" + this.rpcUrl + "');\
            "});
    }

    private async sendActiveWalletToDApp(networkWallet: NetworkWallet) {
        // Get the active wallet address
        let subwallet = networkWallet.getMainEvmSubWallet();
        this.userAddress = await subwallet.createAddress();

        void dappBrowser.executeScript({
            code: " \
                window.ethereum.setAddress('"+ this.userAddress + "');\
            "});
    }

    private async handleLoadStopEvent(info: DABLoadStop): Promise<void> {
    }

    private async handleHtmlHeader(event: DappBrowserPlugin.DappBrowserEvent): Promise<Document> {
        let domParser = new DOMParser();
        let htmlHeader = domParser.parseFromString(event.data, "text/html");
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
                        let url = new URL(this.url);
                        url.pathname = iconUrl;
                        iconUrl = url.toString();
                    }
                }
            }
        }
        if (iconUrl)
            iconUrl = iconUrl.toLowerCase();

        Logger.log("dappbrowser", "Extracted website title:", title);
        Logger.log("dappbrowser", "Extracted website description:", description);
        Logger.log("dappbrowser", "Extracted website icon URL:", iconUrl);

        // Remember this application as browsed permanently.
        this.activeBrowsedAppInfo.next(await this.storageService.saveBrowsedAppInfo(
            this.url,
            title,
            description,
            iconUrl));

        return htmlHeader;
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
            let query = message.data.object as GetCredentialsQuery;

            let res: { result: { presentation: DIDPlugin.VerifiablePresentation } };
            res = await GlobalIntentService.instance.sendIntent("https://did.elastos.net/credaccess", query);

            if (!res || !res.result || !res.result.presentation) {
                console.warn("Missing presentation. The operation was maybe cancelled.");
                // TODO: SEND IAB ERROR
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
}