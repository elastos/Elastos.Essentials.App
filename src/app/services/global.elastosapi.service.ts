import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Logger } from '../logger';
import { TranslateService } from '@ngx-translate/core';
import { GlobalDIDSessionsService, IdentityEntry } from './global.didsessions.service';
import { GlobalJsonRPCService } from './global.jsonrpc.service';
import { GlobalNetworksService } from './global.networks.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalLanguageService } from './global.language.service';
import { StandardCoinName } from '../wallet/model/Coin';
import { UtxoType } from '../wallet/model/transaction.types';
import { ProducersSearchResponse } from '../dposvoting/model/nodes.model';
import { CRCouncilSearchResponse } from '../model/voting/cyber-republic/CRCouncilSearchResult';
import { CRProposalsSearchResponse } from '../model/voting/cyber-republic/CRProposalsSearchResponse';
import { CRProposalStatus } from '../model/voting/cyber-republic/CRProposalStatus';
import { EthTokenTransaction, ERC20TokenInfo } from '../wallet/model/evm.types';

declare let didManager: DIDPlugin.DIDManager;
declare let hiveManager: HivePlugin.HiveManager;

export enum ElastosApiUrlType {
    // Main chain
    ELA_RPC = "mainChainRPC",
    // DID 1.0 deprecated chain
    DID_RPC = "idChainRPC",
    // ESC chain
    ETHSC_RPC = "escRPC",
    ETHSC_MISC = "escMiscRPC",
    ETHSC_ORACLE = "escOracleRPC",
    ETHSC_BROWSER = "escBrowserRPC",
    // DID 2.0 EID chain
    EID_RPC = "eidChainRPC",
    EID_MISC = "eidMiscRPC",
    // Cyber republic
    CR_RPC = "crRPC",
    HECO_RPC = "hecoRPC",
    HECO_BROWSER = "hecoBrowserRPC",
    HECO_ACCOUNT = "hecoAccountRPC",
}

export type ElastosAPIProvider = {
    key: string; // Unique identifier
    name: string; // User friendly name
    description: string; // User friendly description

    // Each supported network template has its own list of endpoints
    endpoints: {
        [networkTemplate: string]: {
            // ELA mainchain
            mainChainRPC: string;
            // DID 1.0 deprecated ID chain
            idChainRPC: string;
            // DID 2.0 ID chain (EVM)
            eidChainRPC: string;
            eidMiscRPC: string;
            eidOracleRPC: string;
            // Elastos Smart Contract (ESC) chain
            escRPC: string;
            escOracleRPC: string;
            escMiscRPC: string;
            escBrowserRPC: string;
            // Cyber Republic
            crRPC: string;
        }
    }
};

/**
 * Service reponsible for switching between different API providers for elastos features,
 * such as Elastos ESCRPC, CyberRepublic listings, etc.
 *
 * Ex: elastos.io VS trinity-tech.cn
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalElastosAPIService extends GlobalService {
    public static API_RETRY_TIMES = 3;
    public static instance: GlobalElastosAPIService = null;

    private availableProviders: ElastosAPIProvider[] = [];

    /** RxJS subject that holds the currently active api provider */
    public activeProvider: BehaviorSubject<ElastosAPIProvider> = new BehaviorSubject(null);

    private languageSubscription: Subscription = null;

    constructor(
        public translate: TranslateService,
        private language: GlobalLanguageService,
        private prefs: GlobalPreferencesService,
        private globalNetworksService: GlobalNetworksService,
        private globalJsonRPCService: GlobalJsonRPCService) {
        super();
        GlobalElastosAPIService.instance = this;
    }

    /**
     * Initializes the service, including reloading the saved provider.
     */
    public init(): Promise<void> {
        GlobalServiceManager.getInstance().registerService(this);
        // DIDSession also need providers list.
        this.initProvidersList();
        this.setupDIDResolver();
        return;
    }

    private initProvidersList() {
        // TODO: Move to root config/ folder
        this.availableProviders = [
            {
                key: "elastosio",
                name: "elastos.io",
                description: this.translate.instant('settings.elastos-io-des'),
                endpoints: {
                    "MainNet": {
                        mainChainRPC: 'https://api.elastos.io/ela',
                        idChainRPC: 'https://api.elastos.io/did',
                        eidChainRPC: 'https://api.elastos.io/eid',
                        eidMiscRPC: 'https://api.elastos.io/eid-misc',
                        eidOracleRPC: 'https://api.elastos.io/eid-oracle',
                        escRPC: 'https://api.elastos.io/eth',
                        escMiscRPC: 'https://api.elastos.io/misc',
                        escOracleRPC: 'https://api.elastos.io/oracle',
                        escBrowserRPC: 'https://eth.elastos.io',
                        crRPC: 'https://api.cyberrepublic.org'
                    },
                    "TestNet": {
                        mainChainRPC: 'https://api-testnet.elastos.io/ela',
                        idChainRPC: 'https://api-testnet.elastos.io/did',
                        eidChainRPC: 'https://api-testnet.elastos.io/eid',
                        eidMiscRPC: 'https://api-testnet.elastos.io/eid-misc',
                        eidOracleRPC: 'https://api-testnet.elastos.io/eid-oracle',
                        escRPC: 'https://api-testnet.elastos.io/eth',
                        escOracleRPC: 'https://api-testnet.elastos.io/oracle',
                        escMiscRPC: 'https://api-testnet.elastos.io/misc',
                        escBrowserRPC: 'https://eth-testnet.elastos.io',
                        crRPC: 'https://api.cyberrepublic.org'
                    },
                    "LRW": {
                        mainChainRPC: 'http://crc1rpc.longrunweather.com:18080',
                        idChainRPC: 'http://did1rpc.longrunweather.com:18080',
                        eidChainRPC: 'http://eid02.longrunweather.com:18080',
                        eidMiscRPC: '',
                        eidOracleRPC: '',
                        escRPC: '',
                        escOracleRPC: '',
                        escMiscRPC: '',
                        escBrowserRPC: '',
                        crRPC: 'http://crapi.longrunweather.com:18080'
                    },
                }
            },
            {
                key: "ttechcn",
                name: "trinity-tech.cn",
                description: this.translate.instant('settings.trinity-tech-cn-des'),
                endpoints: {
                    "MainNet": {
                        mainChainRPC: 'https://api.trinity-tech.cn/ela',
                        idChainRPC: 'https://api.trinity-tech.cn/did',
                        eidChainRPC: 'https://api.trinity-tech.cn/eid',
                        eidMiscRPC: 'https://api.trinity-tech.cn/eid-misc',
                        eidOracleRPC: 'https://api.trinity-tech.cn/eid-oracle',
                        escRPC: 'https://api.trinity-tech.cn/eth',
                        escOracleRPC: 'https://api.trinity-tech.cn/eth-oracle',
                        escMiscRPC: 'https://api.trinity-tech.cn/eth-misc',
                        escBrowserRPC: 'https://eth.elastos.io', // TODO
                        crRPC: 'https://api.cyberrepublic.org'
                    },
                    "TestNet": {
                        mainChainRPC: 'https://api-testnet.trinity-tech.cn/ela',
                        idChainRPC: 'https://api-testnet.trinity-tech.cn/did',
                        eidChainRPC: 'https://api-testnet.trinity-tech.cn/eid',
                        eidMiscRPC: 'https://api-testnet.trinity-tech.cn/eid-misc',
                        eidOracleRPC: 'https://api-testnet.trinity-tech.cn/eid-oracle',
                        escRPC: 'https://api-testnet.trinity-tech.cn/eth',
                        escOracleRPC: 'https://api-testnet.trinity-tech.cn/eth-oracle',
                        escMiscRPC: 'https://api-testnet.trinity-tech.cn/eth-misc',
                        escBrowserRPC: 'https://eth-testnet.elastos.io',
                        crRPC: 'https://api.cyberrepublic.org'
                    },
                    "LRW": {
                        mainChainRPC: 'http://crc1rpc.longrunweather.com:18080',
                        idChainRPC: 'http://did1rpc.longrunweather.com:18080',
                        eidChainRPC: 'http://eid02.longrunweather.com:18080',
                        eidMiscRPC: '',
                        eidOracleRPC: '',
                        escRPC: '',
                        escOracleRPC: '',
                        escMiscRPC: '',
                        escBrowserRPC: '',
                        crRPC: 'http://crapi.longrunweather.com:18080'
                    },
                }
                /*
                {
                    type: 'settings.lrw-net',
                    code: 'LrwNet',
                    mainChainRPCApi: 'http://crc1rpc.longrunweather.com:18080',
                    idChainRPCApi: 'http://did1rpc.longrunweather.com:18080',
                    eidRPCApi: 'http://eid02.longrunweather.com:18080',
                    ethscRPCApi: '',
                    ethscApiMisc: '',
                    ethscOracle: '',
                    ethscBrowserApiUrl: '',
                    crRPCApi: 'http://crapi.longrunweather.com:18080',
                    icon: '/assets/icon/priv.svg'
                },
                {
                    type: 'settings.priv-net',
                    code: 'PrvNet',
                    mainChainRPCApi: 'http://api.elastos.io:22336',
                    idChainRPCApi: 'http://api.elastos.io:22606',
                    eidRPCApi: 'https://api.elastos.io/eid',
                    ethscRPCApi: 'http://api.elastos.io:22636',
                    ethscApiMisc: 'http://api.elastos.io:22634',
                    ethscOracle: 'http://api.elastos.io:22632',
                    ethscBrowserApiUrl: 'https://eth.elastos.io',
                    crRPCApi: 'https://api.cyberrepublic.org',
                    icon: '/assets/icon/priv.svg'
                }
                */
            }
        ];
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        this.languageSubscription = this.language.activeLanguage.subscribe((lang) => {
            // For translation.
            this.initProvidersList();
        });

        // Retrieve user's preferred provider from preferences
        let providerName = await this.prefs.getPreference(signedInIdentity.didString, "elastosapi.provider") as string;
        let provider = this.getProviderByName(providerName);
        if (!provider) {
            // This saved provider doesn't exist any more maybe. Use the default provider.
            Logger.log("elastosapi", "Current provider name could not be found, looking for the default one");
            provider = await this.getDefaultProvider();
            this.activeProvider = new BehaviorSubject(provider);
            await this.useProvider(provider); // Save this preference for later.
        }
        else {
            this.activeProvider = new BehaviorSubject(provider);
        }

        await this.setResolverUrl();

        Logger.log("elastosapi", "User's Elastos API provider is:", this.activeProvider.value);
    }

    onUserSignOut(): Promise<void> {
        if (this.languageSubscription) {
            this.languageSubscription.unsubscribe();
            this.languageSubscription = null;
        }
        return;
    }

    private getProviderByName(providerName: string): ElastosAPIProvider {
        return this.availableProviders.find(p => p.name === providerName);
    }

    /**
     * The default provider to use for a user is the "best" provider, that we tried to auto detect.
     */
    private getDefaultProvider(): Promise<ElastosAPIProvider> {
        return this.findTheBestProvider();
    }

    public getAvailableProviders(): ElastosAPIProvider[] {
        return this.availableProviders;
    }

    /**
     * Starts using the given api provider for all elastos operations.
     * This provider is persisted in preferences and reused upon Essentials restart.
     */
    public async useProvider(provider: ElastosAPIProvider): Promise<void> {
        Logger.log("elastosapi", "Setting provider to " + provider.key);
        await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "elastosapi.provider", provider.name);
        this.activeProvider.next(provider);
    }

    public getActiveProvider(): ElastosAPIProvider {
        return this.activeProvider.value;
    }

    /**
     * Returns the right API endpoint for the given URL service type (esc rpc, eid misc, etc) and based
     * on the currenly active network template and elastos API provider.
     *
     * Ex: "MainNet" network template + "elastos.io" provider + "ETHSC_RPC" api type ==> https://api.elastos.io/eth
     */
    public getApiUrl(type: ElastosApiUrlType): string {
        let activeProvider = this.activeProvider.value;
        let activeNetworkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

        // Make sure the currently active network template is supported by our elastos api providers
        if (!(activeNetworkTemplate in activeProvider.endpoints)) {
            Logger.warn("elastosapi", "Unknown network template " + activeNetworkTemplate + "!");
            return null;
        }

        // Make sure the currently activ eprovider supports the requested API url type
        let endpoints = activeProvider.endpoints[activeNetworkTemplate];
        if (!(type in endpoints)) {
            Logger.warn("elastosapi", "Elastos API provider " + activeProvider.name + " does not support url type " + type + "!");
            return null;
        }

        return endpoints[type];
    }

    /**
     * Tries to find the best elastos API provider for the current user / device. When found, this provider
     * is selected and used as currently active provider for essentials.
     *
     * Calling this method fires the rxjs subject event so that all listeners can adapt to this detected provider.
     *
     * This method does NOT change the active provider for the current user if a user is signed in.
     */
    public async autoDetectTheBestProvider(): Promise<void> {
        Logger.log("elastosapi", "Trying to auto detect the best elastos api provider");
        let bestProvider = await this.findTheBestProvider();
        Logger.log("elastosapi", "Best provider found:", bestProvider);

        // Use this provider
        this.activeProvider.next(bestProvider);

        // Immediatelly let plugins know about this selected provider, because DID sessions
        // need to set the right resolver urls even if no user is signed in.
        await this.setResolverUrl();
    }

    /**
     * Tries to find the best provider and returns it.
     */
    private _bestProvider: ElastosAPIProvider;
    private async findTheBestProvider(): Promise<ElastosAPIProvider> {
        Logger.log("elastosapi", "Starting to look for the best API provider");

        // To know the best provider, we try to call an api on all of them and then select the fastest
        // one to answer.
        this._bestProvider = null;
        let testPromises: Promise<void>[] = this.availableProviders.map(p => this.callTestAPIOnProvider(p));
        await Promise.race(testPromises);
        Logger.log("elastosapi", "Got the best API provider", this._bestProvider);

        return this._bestProvider;
    }

    /**
     * Call a test API on a provider to check its speed in findTheBestProvider().
     * - All errors are catched and not forwarded because we don't want Promise.race() to throw, we
     * want it to resolve the first successful call to answer.
     * - API calls that return errors are resolved with a timeout, to make sure they are considered as
     * "slow" but on the other hand that they resolve one day (we can't stack unresolved promises forever).
     */
    private callTestAPIOnProvider(provider: ElastosAPIProvider): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve) => {
            let testApiUrl = provider.endpoints["MainNet"].mainChainRPC;

            const param = {
                method: 'getblockcount',
            };

            try {
                let data = await this.globalJsonRPCService.httpPost(testApiUrl, param);
                Logger.log("elastosapi", "Provider " + provider.name + " just answered the test api call with value (block height) ", data);
                // Set the provider as best provider if no one did that yet. We are the fastest api call to answer.
                if (!this._bestProvider)
                    this._bestProvider = provider;
                resolve();
            } catch (e) {
                Logger.warn("elastosapi", "Auto detect api call to " + testApiUrl + " failed with error:", e);
                // Resolve later, to let othe rproviders answer faster
                setTimeout(() => {
                    resolve();
                }, 30000); // 30s
            }
        });
    }

    /**
     * Globally, updates plugins to use a different DID resolver depending on which Elastos API provider is used.
     * This can happen when a different user signs in (has a different elastos api provider in preferences) or when
     * the same user manually changes his elastos api provider from settings.
     */
    private setupDIDResolver() {
        this.activeProvider.subscribe((provider) => {
            if (provider) {
                void this.setResolverUrl();
            }
        });
    }

    private async setResolverUrl(): Promise<void> {
        let didResolverUrl = this.getApiUrl(ElastosApiUrlType.EID_RPC);

        Logger.log('elastosapi', 'Changing DID plugin resolver in DID and Hive plugins to :', didResolverUrl);
        // DID Plugin
        await new Promise<void>((resolve, reject) => {
            didManager.setResolverUrl(didResolverUrl, () => {
                resolve();
            }, (err) => {
                Logger.error('DIDSessionsService', 'didplugin setResolverUrl error:', err);
                reject(err);
            });
        });

        // Hive plugin
        await hiveManager.setDIDResolverUrl(didResolverUrl);
    }

    ////////////////
    ///// APIS /////
    ////////////////

    public getApiUrlForChainCode(elastosChainCode: StandardCoinName): string {
        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        return this.getApiUrl(apiurltype);
    }

    public getApiUrlTypeForRpc(elastosChainCode: string): ElastosApiUrlType {
        switch (elastosChainCode) {
            case StandardCoinName.ELA:
                return ElastosApiUrlType.ELA_RPC;
            case StandardCoinName.IDChain:
                return ElastosApiUrlType.DID_RPC;
            case StandardCoinName.ETHSC:
                return ElastosApiUrlType.ETHSC_RPC;
            case StandardCoinName.ETHDID:
                return ElastosApiUrlType.EID_RPC;
            default:
                throw new Error('RPC can not support elastos chain code ' + elastosChainCode);
        }
    }

    // TODO: Remove it, Use browser api not misc.
    public getApiUrlTypeForMisc(elastosChainCode: string) {
        let apiUrlType = null;
        switch (elastosChainCode) {
            case StandardCoinName.ETHSC:
                apiUrlType = ElastosApiUrlType.ETHSC_MISC;
                break;
            case StandardCoinName.ETHDID:
                apiUrlType = ElastosApiUrlType.EID_MISC;
                break;
            case StandardCoinName.ETHHECO:
                apiUrlType = ElastosApiUrlType.HECO_ACCOUNT;
                break;
            default:
                Logger.log("wallet", 'Elastos API: Misc can not support ' + elastosChainCode);
                break;
        }
        return apiUrlType;
    }

    public getApiUrlTypeForBrowser(elastosChainCode: string) {
        let apiUrlType = null;
        switch (elastosChainCode) {
            case StandardCoinName.ETHSC:
                apiUrlType = ElastosApiUrlType.ETHSC_BROWSER;
                break;
            default:
                Logger.log("wallet", 'Elastos API: Browser api can not support ' + elastosChainCode);
                break;
        }
        return apiUrlType;
      }

    // ETHSC:Get the real target address for the send transaction from ethsc to mainchain.
    public async getETHSCWithdrawTargetAddress(blockHeight: number, txHash: string) {
        const param = {
            method: 'getwithdrawtransactionsbyheight',
            params: {
                height: blockHeight
            },
        };

        const rpcApiUrl = this.getApiUrl(ElastosApiUrlType.ETHSC_ORACLE);

        const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        for (var i = 0; i < result.length; i++) {
            if ('0x' + result[i].txid === txHash) {
                // TODO: crosschainassets has multiple value?
                // TODO: define the result type
                return result[i].crosschainassets[0].crosschainaddress;
            }
        }

        return '';
    }

    public async getTransactionsByAddress(elastosChainCode: StandardCoinName, addressArray: string[], limit: number, skip = 0, timestamp = 0): Promise<any> {
        const paramArray = [];
        let index = 0;

        for (const address of addressArray) {
            const param = {
                method: 'gethistory',
                params: {
                    address,
                    limit,
                    skip,
                    timestamp
                },
                id: index.toString()
            };
            index++;
            paramArray.push(param);
        }

        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return [];
        }

        let transactionsArray = null;
        let retryTimes = 0;
        do {
            try {
                transactionsArray = await this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < GlobalElastosAPIService.API_RETRY_TIMES);

        if (transactionsArray === null) {
            return [];
        } else {
            // Logger.warn('wallet', 'transactionsArray:',transactionsArray)
            return transactionsArray.filter(c => {
                return c.result && (c.result.totalcount > 0);
            });
        }
    }

    public async getERC20TokenTransactions(elastosChainCode: StandardCoinName, address: string): Promise<EthTokenTransaction[]> {
        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.getApiUrl(apiurltype);
        const ethscgetTokenTxsUrl = rpcApiUrl + '/api/?module=account&action=tokentx&address=' + address;

        let result = await this.globalJsonRPCService.httpGet(ethscgetTokenTxsUrl);
        return result.result as EthTokenTransaction[];
    }

    public async getERC20TokenList(elastosChainCode: StandardCoinName, address: string): Promise<ERC20TokenInfo[]> {
        let apiurltype = this.getApiUrlTypeForBrowser(elastosChainCode);
        const rpcApiUrl = this.getApiUrl(apiurltype);
        const ethscgetTokenListUrl = rpcApiUrl + '/api/?module=account&action=tokenlist&address=' + address;

        let result = await this.globalJsonRPCService.httpGet(ethscgetTokenListUrl);
        return result.result as ERC20TokenInfo[];
    }

    // return all utxo by address
    public async getAllUtxoByAddress(elastosChainCode: StandardCoinName, addresses: string[], utxotype: UtxoType = UtxoType.Mixed): Promise<any> {
        const param = {
            method: 'listunspent',
            params: {
                addresses,
                utxotype,
                spendable: true // Coinbase utxo must be confirmed more than 100 times.
            },
        };

        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return [];
        }

        let utxoArray = null;
        let retryTimes = 0;
        do {
            try {
                utxoArray = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < GlobalElastosAPIService.API_RETRY_TIMES);

        // Logger.log('wallet', 'getAllUtxoByAddress:', utxoArray)
        return utxoArray;
    }

    public async getBlockCount(elastosChainCode: StandardCoinName) {
        const param = {
            method: 'getblockcount',
        };

        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return 0;
        }

        let blockHeight = 0;
        try {
            const blockHeightStr = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            blockHeight = parseInt(blockHeightStr, 10);
        } catch (e) {
        }
        return blockHeight;
    }

    // dpos
    public async fetchDposNodes(state): Promise<ProducersSearchResponse> {
        Logger.log('wallet', 'Fetching Dpos Nodes..');
        const param = {
            method: 'listproducers',
            params: {
              state: state
            },
        };

        const rpcApiUrl = this.getApiUrl(ElastosApiUrlType.ELA_RPC);

        try {
            const dposNodes = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            return dposNodes;
        } catch (e) {
        }
        return null;
    }

    //crc
    public async getCRrelatedStage() {
      const param = {
          method: 'getcrrelatedstage',
      };

      const rpcApiUrl = this.getApiUrl(ElastosApiUrlType.ELA_RPC);

      let result = null;
      try {
          result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
      }
      return result;
    }

    public async fetchCRcouncil(index = 0): Promise<CRCouncilSearchResponse> {
      const rpcApiUrl = this.getApiUrl(ElastosApiUrlType.CR_RPC);

      let crfetchCRCurl = rpcApiUrl + '/api/council/list/';
      if (index > 0) {
        crfetchCRCurl += index
      }
      try {
          let result = await this.globalJsonRPCService.httpGet(crfetchCRCurl);
          return result;
      } catch (e) {
        Logger.error('wallet', 'fetchProposals error:', e)
      }
      return null;
    }

    public async fetchProposals(status: CRProposalStatus): Promise<CRProposalsSearchResponse> {
      const rpcApiUrl = this.getApiUrl(ElastosApiUrlType.CR_RPC);
      const crfetchproposalsurl = rpcApiUrl + '/api/cvote/all_search?status=' + status + '&page=1&results=-1';
      try {
          let result = await this.globalJsonRPCService.httpGet(crfetchproposalsurl);
          return result;
      } catch (e) {
        Logger.error('wallet', 'fetchProposals error:', e)
      }
      return null;
    }
}
