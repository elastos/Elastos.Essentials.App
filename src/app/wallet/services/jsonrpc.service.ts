import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StandardCoinName } from '../model/Coin';
import { Config } from '../config/Config';
import BigNumber from 'bignumber.js';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';


type JSONRPCResponse = {
    error: string;
    id: string;
    jsonrpc: string;
    result: string;
};

@Injectable({
    providedIn: 'root'
})
export class JsonRPCService {
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

    // return balance in SELA
    async getBalanceByAddress(chainID: StandardCoinName, addressArray: string[]): Promise<BigNumber> {
        let balanceOfSELA = new BigNumber(0);
        const paramArray = [];
        let index = 0;

        for (const address of addressArray) {
            const param = {
                method: 'getreceivedbyaddress',
                params: {
                    address
                },
                id: index.toString()
            };
            index++;
            paramArray.push(param);
        }

        const rpcApiUrl = this.getRPCApiUrl(chainID);
        if (rpcApiUrl.length === 0) {
            return balanceOfSELA;
        }

        // httpRequest fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                const resultArray = await this.httpRequest(rpcApiUrl, paramArray);
                for (const result of resultArray) {
                    balanceOfSELA = balanceOfSELA.plus(new BigNumber(result.result).multipliedBy(Config.SELAAsBigNumber));
                }
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < 5);
        return balanceOfSELA;
    }

    async getBlockHeight(chainID: StandardCoinName) {
        const param = {
            method: 'getblockcount',
        };

        const rpcApiUrl = this.getRPCApiUrl(chainID);
        if (rpcApiUrl.length === 0) {
            return 0;
        }

        let blockHeight = 0;
        try {
            const blockHeightStr = await this.httpRequest(rpcApiUrl, param);
            blockHeight = parseInt(blockHeightStr, 10);
        } catch (e) {
        }
        return blockHeight;
    }

    // Get the real target address for the send transaction from ethsc to mainchain.
    async getETHSCWithdrawTargetAddress(blockHeight: number, txHash: string) {
        const param = {
            method: 'getwithdrawtransactionsbyheight',
            params: {
                height: blockHeight
            },
        };

        try {
            const result = await this.httpRequest(this.ethscOracleRPCApiUrl, param);
            for (var i = 0; i < result.length; i++) {
                if ('0x' + result[i].txid === txHash) {
                    // TODO: crosschainassets has multiple value?
                    // TODO: define the result type
                    return result[i].crosschainassets[0].crosschainaddress;
                }
            }
        } catch (e) {
        }
        return '';
    }

    getRPCApiUrl(chainID: string) {
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

    httpRequest(rpcApiUrl: string, param: any): Promise<any> {
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
