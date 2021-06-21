import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
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
    private ethscOracleRPCApiUrl = 'https://api.elastos.io/oracle';

    constructor(private http: HttpClient, private prefs: GlobalPreferencesService) {
    }

    async init() {
        this.mainchainRPCApiUrl = await this.prefs.getMainchainRPCApiEndpoint(GlobalDIDSessionsService.signedInDIDString);
        this.IDChainRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.id.rpcapi');
        this.ethscOracleRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.oracle');
    }

    public getRPCApiUrl(chainID: string) {
        let rpcApiUrl = this.mainchainRPCApiUrl;
        switch (chainID) {
            case StandardCoinName.ELA:
                break;
            case StandardCoinName.IDChain:
                rpcApiUrl = this.IDChainRPCApiUrl;
                break;
            default:
                rpcApiUrl = '';
                Logger.log("wallet", 'JsonRPCService: Can not support ' + chainID);
                break;
        }
        return rpcApiUrl;
    }

    public async httpRequest(rpcApiUrl: string, param: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const httpOptions = {
                headers: new HttpHeaders({
                    'Content-Type': 'application/json',
                })
            };
            this.http.post(rpcApiUrl, JSON.stringify(param), httpOptions)
                .subscribe((res: any) => {
                  if (res) {
                      if (res instanceof Array) {
                          resolve(res);
                      } else {
                          resolve(res.result || '');
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
}
