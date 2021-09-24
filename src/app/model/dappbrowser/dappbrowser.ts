import { HttpClient } from "@angular/common/http";
import { GetCredentialsQuery } from "@elastosfoundation/elastos-connectivity-sdk-cordova/typings/did";
import { InAppBrowser, InAppBrowserObject } from "@ionic-native/in-app-browser/ngx";
import { Logger } from "src/app/logger";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { GlobalSwitchNetworkService } from "src/app/services/global.switchnetwork.service";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { EditCustomNetworkIntentResult } from "src/app/wallet/pages/settings/edit-custom-network/edit-custom-network.page";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from "../ethereum/requestparams";

type IABMessage = {
    type: "message";
    data: {
        id: number;
        name: string; // Command name
        object: any; // Usually, the ETH JSON RPC payload.
    }
}

export type IABExitData = {
    type: "exit";
    mode?: string;
}
export interface InAppBrowserClient {
    iab: InAppBrowser;
    httpClient: HttpClient;
    theme: GlobalThemeService;

    onExit(data: IABExitData);
}

export class DAppBrowser {
    private browser: InAppBrowserObject = null;
    private userAddress: string = null;

    /**
     * Opens a new browser to display the target url.
     *
     * @param iabClient Instance of the InAppBrowserClient interface.
     * @param url The dApp URL to show.
     * @param title The dApp title to show, if have title the url bar hide, otherwise show url bar.
     *
     */
    public static async open(iabClient: InAppBrowserClient, url: string, title?: string): Promise<DAppBrowser> {
        let dappBrowser = new DAppBrowser();

        // NOTE: Make sure to load everything before creating the browser, to be able to synchronously
        // inject the code in the "loadstart" event. Otherwise, the target dapp code loads partially
        // or fully before our injection and the web3 provider is sometimes not found.

        // Prepare our web3 provider bridge and elastos connectors for injection
        Logger.log("dappbrowser", "Loading the IAB web3 provider");
        let web3ProviderCode = await iabClient.httpClient.get('assets/essentialsiabweb3provider.js', { responseType: 'text' }).toPromise();

        Logger.log("dappbrowser", "Loading the IAB elastos connector");
        let elastosConnectorCode = await iabClient.httpClient.get('assets/essentialsiabconnector.js', { responseType: 'text' }).toPromise();

        // Get the active wallet address
        let subwallet = WalletService.instance.getActiveNetworkWallet().getMainEvmSubWallet();
        dappBrowser.userAddress = await subwallet.createAddress();

        // Get the active netwok chain ID
        let activeChainID = WalletService.instance.activeNetworkWallet.value.network.getMainChainID();

        // Get the active network RPC URL
        let rpcUrl = WalletService.instance.activeNetworkWallet.value.network.getMainEvmRpcApiUrl();

        Logger.log("dappbrowser", "title", title);

        var options: any = {
            location: 'yes',
            toolbar: 'yes',
            toolbartranslucent: 'no',
            toolbarposition: 'top',
            footercolor: '#000000',
            enableViewportScale: "no",
            hideurlbar: "no",
            fullscreen: "no",
            zoom: "no",
            darkMode: iabClient.theme.darkMode ? "yes" : "no",
            //clearcache: "yes",
            //cleardata: "yes",
            //clearsessioncache: "yes"
        }

        if (title) {
            options.title = title;
        }

        dappBrowser.browser = iabClient.iab.create(url, '_blank', options);

        // eslint-disable-next-line
        dappBrowser.browser.on('loadstart').subscribe(async event => {
            // Inject the web3 provider
            Logger.log("dappbrowser", "Executing Web3 provider injection script");
            void dappBrowser.browser.executeScript({
                code: web3ProviderCode + "\
                console.log('Elastos Essentials Web3 provider is being created'); \
                window.ethereum = new InAppBrowserWeb3Provider();\
                window.web3 = { \
                    currentProvider: window.ethereum\
                };\
                console.log('Elastos Essentials Web3 provider is injected', window.ethereum, window.web3); \
                \
                window.ethereum.setChainId("+ activeChainID + "); \
                window.ethereum.setAddress('"+ dappBrowser.userAddress + "');\
                window.ethereum.setRPCApiEndpoint("+ activeChainID + ", '" + rpcUrl + "');\
            "});

            // Inject the Elastos connectivity connector
            Logger.log("dappbrowser", "Executing Elastos connector injection script");
            void dappBrowser.browser.executeScript({
                code: elastosConnectorCode + "\
                console.log('Elastos Essentials in app browser connector is being created'); \
                window.elastos = new EssentialsIABConnector();\
                console.log('Elastos Essentials in app browser connector is injected', window.elastos); \
            "});

            Logger.log("dappbrowser", "Load start completed");

            // TODO: window.ethereum.setAddress() should maybe be called only when receiving a eth_requestAccounts request.
        });

        dappBrowser.browser.on('message').subscribe((dataFromIAB) => {
            Logger.log("dappbrowser", "Received message", dataFromIAB);

            void dappBrowser.handleIABMessage(dataFromIAB as IABMessage);
        });

        dappBrowser.browser.on('exit').subscribe((dataFromIAB) => {
            Logger.log("dappbrowser", "Received exit", dataFromIAB);
            iabClient.onExit(dataFromIAB as IABExitData);
        });

        return dappBrowser;
    }

    /**
     * Handles Web3 requests received from a dApp through the injected web3 provider.
     */
    private async handleIABMessage(message: IABMessage) {
        if (message.type != "message") {
            Logger.warn("dappbrowser", "Received unknown message type", message.type);
            return;
        }

        switch (message.data.name) {
            // WEB3 PROVIDER
            case "eth_signTransaction":
                this.browser.hide();
                await this.handleSignTransaction(message);
                this.browser.show();
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
                this.browser.hide();
                await this.handleElastosGetCredentials(message);
                this.browser.show();
                break;

            default:
                Logger.warn("dappbrowser", "Unhandled message command", message.data.name);
        }
    }

    /**
     * Executes a smart contract transaction then returns the result to the calling dApp.
     */
    private async handleSignTransaction(message: IABMessage): Promise<void> {
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
    private handleRequestAccounts(message: IABMessage): Promise<void> {
        this.sendWeb3IABResponse(
            message.data.id,
            [this.userAddress]
        );
        return;
    }

    private async handleSwitchEthereumChain(message: IABMessage): Promise<void> {
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

    private async handleAddEthereumChain(message: IABMessage): Promise<void> {
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

    private async handleElastosGetCredentials(message: IABMessage): Promise<void> {
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

        void this.browser.executeScript({
            code: code
        });
    }

    private sendWeb3IABError(id: number, error: { code: number; message: string; }) {
        let stringifiedError = JSON.stringify(error);
        let code = 'window.ethereum.sendError(' + id + ', ' + stringifiedError + ')';
        console.log("stringifiedError", stringifiedError, "code", code);

        void this.browser.executeScript({
            code: code
        });
    }

    private sendElastosConnectorIABResponse(id: number, result: any) {
        let stringifiedResult = JSON.stringify(result);
        let code = 'window.elastos.sendResponse(' + id + ', ' + stringifiedResult + ')';
        console.log("stringifiedResult", stringifiedResult, "code", code);

        void this.browser.executeScript({
            code: code
        });
    }

    private sendElastosConnectorIABError(id: number, error: Error | string) {
        Logger.log("dappbrowser", "Sending elastos error", error);

        let stringifiedError = typeof error == "string" ? error : new String(error);
        let code = 'window.elastos.sendError(' + id + ', "' + stringifiedError + '")';
        console.log("stringifiedError", stringifiedError, "code", code);

        void this.browser.executeScript({
            code: code
        });
    }
}