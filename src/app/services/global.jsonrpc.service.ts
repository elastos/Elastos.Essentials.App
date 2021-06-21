import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { StandardCoinName } from '../wallet/model/Coin';


type JSONRPCResponse = {
    error: string;
    id: string;
    jsonrpc: string;
    result: string;
};

@Injectable({
    providedIn: 'root'
})
export class GlobalJsonRPCService {
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

    static RETRY_TIMES = 3;

    constructor(private http: HttpClient, private prefs: GlobalPreferencesService) {
    }

    async getRPCApiUrl(chainID: string): Promise<string> {
        this.mainchainRPCApiUrl = await this.prefs.getMainchainRPCApiEndpoint(GlobalDIDSessionsService.signedInDIDString);
        this.IDChainRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.id.rpcapi');
        this.ethscRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.rpcapi');
        this.ethscOracleRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.oracle');
        this.ethscMiscApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.apimisc');
        this.ethbrowserapiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.browserapi');

        let rpcApiUrl = this.mainchainRPCApiUrl;
        switch (chainID) {
            case StandardCoinName.ELA:
                break;
            case StandardCoinName.IDChain:
                rpcApiUrl = this.IDChainRPCApiUrl;
                break;
            case StandardCoinName.ETHSC:
                rpcApiUrl = this.ethscRPCApiUrl;
                break;
            case StandardCoinName.ETHDID:
                rpcApiUrl = this.EIDChainRPCApiUrl;
                break;
            // case StandardCoinName.ETHHECO:
            //     rpcApiUrl = this.hecoChainRPCApiUrl;
            //     break;
            default:
                rpcApiUrl = '';
                Logger.log("wallet", 'JsonRPCService: Can not support ' + chainID);
                break;
        }
        return rpcApiUrl;
    }

    async httpRequest(rpcApiUrl: string, param: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const httpOptions = {
                headers: new HttpHeaders({
                    'Content-Type': 'application/json',
                })
            };
            // Logger.warn("wallet", 'httpRequest rpcApiUrl:', rpcApiUrl);
            this.http.post(rpcApiUrl, JSON.stringify(param), httpOptions)
                .subscribe((res: any) => {
                    if (res) {
                        // Logger.warn("wallet", 'httpRequest response:', res);
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
                        Logger.error("wallet", 'httpRequest get nothing!');
                    }
                }, (err) => {
                    Logger.error("wallet", 'JsonRPCService httpRequest error:', JSON.stringify(err));
                    reject(err);
                });
        });
    }

    httpget(url): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.get<any>(url).subscribe((res) => {
                // Logger.log('wallet', res);
                resolve(res);
            }, (err) => {
                Logger.error('wallet', 'http get error:', err);
                reject(err);
            });
        });
    }
}
