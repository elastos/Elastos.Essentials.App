import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { GetCredentialsQuery } from '@elastosfoundation/elastos-connectivity-sdk-cordova/typings/did';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from 'src/app/model/ethereum/requestparams';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';
import { GlobalSwitchNetworkService } from 'src/app/services/global.switchnetwork.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { EditCustomNetworkIntentResult } from 'src/app/wallet/pages/settings/edit-custom-network/edit-custom-network.page';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

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

export interface DappBrowserClient {
    onExit:(mode?: string)=>void;
    onLoadStart?:()=>void;
    onLoadStop?:()=>void;
    onLoadError?:(error: DABError)=>void;
    onBeforeLoad?:()=>void;
    onMessage?:(info: DABMessage)=>void;
    onProgress?:(progress: number)=>void;
    onUrlChanged?:(url: string)=>void;
    onMenu?:()=>void;
    onHtmlHead?:(head: Document)=>void;
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
    private dabClient: DappBrowserClient;
    public title: string = null;
    public url: string;

    private domParser = new DOMParser();
    public head: Document;

    constructor(
        public translate: TranslateService,
        private nav: GlobalNavService,
        public theme: GlobalThemeService,
        public httpClient: HttpClient,
        public zone: NgZone,
        private platform: Platform,
        private globalStartupService: GlobalStartupService
    ) {
        this.init()
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

        // Get the active wallet address
        let subwallet = WalletService.instance.getActiveNetworkWallet().getMainEvmSubWallet();
        this.userAddress = await subwallet.createAddress();

        // Get the active netwok chain ID
        this.activeChainID = WalletService.instance.activeNetworkWallet.value.network.getMainChainID();

        // Get the active network RPC URL
        this.rpcUrl = WalletService.instance.activeNetworkWallet.value.network.getMainEvmRpcApiUrl();
    }

    public setClient(dabClient: DappBrowserClient) {
        this.dabClient = dabClient;
    }

    /**
     * Opens a new browser to display the target url.
     *
     * @param url The dApp URL to show.
     * @param [target="_webview"]  The target in which to load the URL, an optional parameter that defaults to _webview.
     *                 _self: Opens in the WebView if the URL is in the white list, otherwise it opens in the DappBrowser.
     *                 _blank: Opens in the DappBrowser.
     *                 _webview: Opens in the Webview.
     *                 _system: Opens in the system's web browser.
     * @param title The dApp title to show, if have title the url bar hide, otherwise show url bar.
     *
     */
    public async open(url: string, target?:string, title?: string) {
        this.url = url;

        if (!target || target == null) {
            target = "_webview";
        }

        var options: any = {
            titlebar: true,
            darkMode: this.theme.darkMode,
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
            this.handleEvent(ret);
        });

        await dappBrowser.open(url, target, options);
    }

    public async handleEvent(event: DappBrowserPlugin.DappBrowserEvent) {
        Logger.log("dappbrowser", "Received event", event);
        switch (event.type) {
            case "loadstart":
                this.handleLoadStartEvent(event);
                if (this.dabClient.onLoadStart) {
                    this.dabClient.onLoadStart();
                }
                break;
            case "loadstop":
                if (this.dabClient.onLoadStop) {
                    this.dabClient.onLoadStop();
                }
                break;
            case "loaderror":
                if (this.dabClient.onLoadError) {
                    this.dabClient.onLoadError(event as DABError);
                }
                break;
            case "beforeload":
                if (this.dabClient.onBeforeLoad) {
                    this.dabClient.onBeforeLoad();
                }
                break;
            case "message":
                this.handleDABMessage(event as DABMessage);
                if (this.dabClient.onMessage) {
                    this.dabClient.onMessage(event as DABMessage);
                }
                break;
            case "progress":
                if (this.dabClient.onProgress) {
                    this.dabClient.onProgress(event.progress);
                }
                break;
            case "urlchanged":
                if (this.dabClient.onUrlChanged) {
                    this.dabClient.onUrlChanged(event.url);
                }
                break;
            case "menu":
                if (this.dabClient.onMenu) {
                    this.dabClient.onMenu();
                }
                break;
            case "head":
                this.head = this.domParser.parseFromString(event.data, "text/html")
                if (this.dabClient.onHtmlHead) {
                    this.dabClient.onHtmlHead(this.head);
                }
                break;
            case "exit":
                this.dabClient.onExit(event.mode);
                break;
        }
    }

    private async handleLoadStartEvent(event: DappBrowserPlugin.DappBrowserEvent) {
        // Inject the web3 provider
        Logger.log("dappbrowser", "Executing Web3 provider injection script");
        void dappBrowser.executeScript({
            code: this.web3ProviderCode + "\
            console.log('Elastos Essentials Web3 provider is being created'); \
            window.ethereum = new InAppBrowserWeb3Provider();\
            window.web3 = { \
                currentProvider: window.ethereum\
            };\
            console.log('Elastos Essentials Web3 provider is injected', window.ethereum, window.web3); \
            \
            window.ethereum.setChainId("+ this.activeChainID + "); \
            window.ethereum.setAddress('"+ this.userAddress + "');\
            window.ethereum.setRPCApiEndpoint("+ this.activeChainID + ", '" + this.rpcUrl + "');\
        "});

        // Inject the Elastos connectivity connector
        Logger.log("dappbrowser", "Executing Elastos connector injection script");
        void dappBrowser.executeScript({
            code: this.elastosConnectorCode + "\
            console.log('Elastos Essentials in app browser connector is being created'); \
            window.elastos = new EssentialsIABConnector();\
            console.log('Elastos Essentials in app browser connector is injected', window.elastos); \
        "});

        Logger.log("dappbrowser", "Load start completed");

        // TODO: window.ethereum.setAddress() should maybe be called only when receiving a eth_requestAccounts request.
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
                dappBrowser.show();
                break;
            case "eth_requestAccounts":
                // NOTE: for now, directly return user accounts without asking for permission
                await this.handleRequestAccounts(message);
                break;
            case "wallet_switchEthereumChain":
                Logger.log("dappbrowser", "Received switch ethereum chain request");
                await this.handleSwitchEthereumChain(message);
                break;
            case "wallet_addEthereumChain":
                Logger.log("dappbrowser", "Received add ethereum chain request");
                await this.handleAddEthereumChain(message);
                break;

            // ELASTOS CONNECTOR
            case "elastos_getCredentials":
                dappBrowser.hide();
                await this.handleElastosGetCredentials(message);
                dappBrowser.show();
                break;

            default:
                Logger.warn("dappbrowser", "Unhandled message command", message.data.name);
        }
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