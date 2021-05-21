import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StandardCoinName } from '../model/Coin';
import { Config } from '../config/Config';
import BigNumber from 'bignumber.js';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { TransactionDetail, UtxoType } from '../model/Transaction';


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

    async getTransactionsByAddress(chainID: StandardCoinName, addressArray: string[], limit: number, timestamp: number = 0): Promise<any> {
        const paramArray = [];
        let index = 0;

        for (const address of addressArray) {
            const param = {
                method: 'gethistory',
                params: {
                    address,
                    limit,
                    timestamp
                },
                id: index.toString()
            };
            index++;
            paramArray.push(param);
        }

        const rpcApiUrl = this.getRPCApiUrl(chainID);
        if (rpcApiUrl.length === 0) {
            return [];
        }

        let transactionsArray = null;
        // httpRequest fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                transactionsArray = await this.httpRequest(rpcApiUrl, paramArray);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < 5);
        // Logger.warn('wallet', 'transactionsArray:',transactionsArray)
        return transactionsArray.filter(c => {
          return c.result.totalcount > 0;
        });
    }

    async getrawtransaction(chainID: StandardCoinName, txid: string): Promise<TransactionDetail> {
        const param = {
            method: 'getrawtransaction',
            params: {
              txid,
              verbose : true
            },
        };

        const rpcApiUrl = this.getRPCApiUrl(chainID);
        if (rpcApiUrl.length === 0) {
            return null;
        }

        let result: TransactionDetail = null;
        // httpRequest fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                result = await this.httpRequest(rpcApiUrl, param);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < 5);

        // Logger.log('wallet', 'getrawtransaction:', result)
        return result;
    }

    // return all utxo by address
    async getAllUtxoByAddress(chainID: StandardCoinName, addresses: string[], utxotype: UtxoType = UtxoType.Mixed): Promise<any> {
        const param = {
            method: 'listunspent',
            params: {
                addresses,
                utxotype
            },
        };

        const rpcApiUrl = this.getRPCApiUrl(chainID);
        if (rpcApiUrl.length === 0) {
            return [];
        }

        let utxoArray = null;
        // httpRequest fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                utxoArray = await this.httpRequest(rpcApiUrl, param);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < 5);

        // Logger.log('wallet', 'getAllUtxoByAddress:', utxoArray)
        return utxoArray;
    }

    async sendrawtransaction(chainID: StandardCoinName, payload: string): Promise<string> {
        const param = {
            method: 'sendrawtransaction',
            params: [
              payload
            ],
        };

        const rpcApiUrl = this.getRPCApiUrl(chainID);
        if (rpcApiUrl.length === 0) {
            return '';
        }

        let txid = '';
        // httpRequest fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                txid = await this.httpRequest(rpcApiUrl, param);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < 5);

        Logger.log('wallet', 'sendrawtransaction:', txid)
        return txid;
    }

    async getBlockCount(chainID: StandardCoinName) {
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
}
