import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { Subscription } from 'rxjs';
import { GlobalService, GlobalServiceManager } from './global.service.manager';

type JSONRPCResponse = {
    error: string;
    id: string;
    jsonrpc: string;
    result: string;
};

export enum ApiUrlType {
  CR_RPC,
  ELA_RPC,
  ETHSC_RPC,
  ETHSC_MISC,
  ETHSC_ORACLE,
  ETH_BROWSER,
  EID_RPC, // New ID chain
  EID_MISC,
  DID_RPC, // Old ID Chain
}

@Injectable({
    providedIn: 'root'
})
export class GlobalJsonRPCService extends GlobalService {
    private mainchainRPCApiUrl = 'https://api.elastos.io/ela';
    private IDChainRPCApiUrl = 'https://api.elastos.io/did';
    private ethscRPCApiUrl = 'https://api.elastos.io/eth';
    private ethscOracleRPCApiUrl = 'https://api.elastos.io/oracle';
    private ethscMiscApiUrl = 'https://api.elastos.io/misc';
    // TODO use mainnet url, and add to settings.
    private EIDChainRPCApiUrl = 'https://api-testnet.elastos.io/newid';
    private EIDMiscApiUrl = 'https://api-testnet.elastos.io/newid-misc';

    private hecoChainRPCApiUrl = 'https://http-mainnet.hecochain.com';
    // Get ERC20 Token transactions from browser api.
    private ethbrowserapiUrl = 'https://eth.elastos.io';

    // CR
    private crRpcApiUrl = 'https://api.cyberrepublic.org';

    static RETRY_TIMES = 3;

    // public activeNetwork: NetworkType;
    private subscription: Subscription = null;

    constructor(private http: HttpClient,
        private prefs: GlobalPreferencesService
    ) {
        super();
    }

    public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        await this.initData();
        this.subscription = this.prefs.preferenceListener.subscribe(async (preference) => {
          if (preference.key === "chain.network.type") {
              await this.initData();
          }
        });
    }

    public async onUserSignOut(): Promise<void> {
        this.stop();
    }

    public async init(): Promise<void> {
      GlobalServiceManager.getInstance().registerService(this);
    }

    async initData() {
        let preferences = await this.prefs.getPreferences(GlobalDIDSessionsService.signedInDIDString);
        this.mainchainRPCApiUrl = preferences['mainchain.rpcapi'];
        this.IDChainRPCApiUrl = preferences['sidechain.id.rpcapi'];
        this.EIDChainRPCApiUrl = preferences['sidechain.eid.rpcapi'];
        this.ethscRPCApiUrl = preferences['sidechain.eth.rpcapi'];
        this.ethscOracleRPCApiUrl = preferences['sidechain.eth.oracle'];
        this.ethscMiscApiUrl = preferences['sidechain.eth.apimisc'];
        this.ethbrowserapiUrl = preferences['sidechain.eth.browserapi'];
        this.crRpcApiUrl = preferences['cr.rpcapi'];
    }

    public stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    public getApiUrl(type: ApiUrlType) {
      let apiUrl = null;
      switch (type) {
        case ApiUrlType.CR_RPC:
          apiUrl = this.crRpcApiUrl;
          break;
        case ApiUrlType.DID_RPC:
          apiUrl = this.IDChainRPCApiUrl;
          break;
        case ApiUrlType.EID_MISC:
          apiUrl = this.EIDMiscApiUrl;
          break;
        case ApiUrlType.EID_RPC:
          apiUrl = this.EIDChainRPCApiUrl;
          break;
        case ApiUrlType.ELA_RPC:
          apiUrl = this.mainchainRPCApiUrl;
          break;
        case ApiUrlType.ETHSC_MISC:
          apiUrl = this.ethscMiscApiUrl;
          break;
        case ApiUrlType.ETHSC_ORACLE:
          apiUrl = this.ethscOracleRPCApiUrl;
          break;
        case ApiUrlType.ETHSC_RPC:
          apiUrl = this.ethscRPCApiUrl;
          break;
        case ApiUrlType.ETH_BROWSER:
          apiUrl = this.ethbrowserapiUrl;
          break;
        default:
          break;
      }

      return apiUrl;
    }

    async httpPost(rpcApiUrl: string, param: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const httpOptions = {
                headers: new HttpHeaders({
                    'Content-Type': 'application/json',
                })
            };
            // Logger.warn("JSONRPC", 'httpPost rpcApiUrl:', rpcApiUrl);
            this.http.post(rpcApiUrl, JSON.stringify(param), httpOptions)
                .subscribe((res: any) => {
                    if (res) {
                        // Logger.warn("JSONRPC", 'httpPost response:', res);
                        if (res instanceof Array) {
                            resolve(res);
                        } else {
                            if (res.error) {
                                reject(res.error);
                            } else {
                                resolve(res.result || '');
                            }
                        }
                    } else {
                        Logger.error("JSONRPC", 'httpPost get nothing!');
                    }
                }, (err) => {
                    Logger.error("JSONRPC", 'JsonRPCService httpPost error:', JSON.stringify(err));
                    reject(err);
                });
        });
    }

    httpGet(url): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.get<any>(url).subscribe((res) => {
                // Logger.log('JSONRPC', res);
                resolve(res);
            }, (err) => {
                Logger.error('JSONRPC', 'http get error:', err);
                reject(err);
            });
        });
    }
}
