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
    static RETRY_TIMES = 3;

    // public activeNetwork: NetworkType;
    private subscription: Subscription = null;

    constructor(private http: HttpClient) {
        super();
    }

    public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        /* this.subscription = this.prefs.preferenceListener.subscribe(async (preference) => {
          if (preference.key === "chain.network.type") {
              await this.initData();
          }
        }); */
    }

    public onUserSignOut(): Promise<void> {
        this.stop();
        return;
    }

    public init(): Promise<void> {
      GlobalServiceManager.getInstance().registerService(this);
      return;
    }

    public stop() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    httpPost(rpcApiUrl: string, param: any): Promise<any> {
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
