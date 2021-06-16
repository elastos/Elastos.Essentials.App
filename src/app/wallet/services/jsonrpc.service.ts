import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { StandardCoinName } from '../model/Coin';
import { Config } from '../config/Config';
import BigNumber from 'bignumber.js';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { Logger } from 'src/app/logger';
import { EthTokenTransaction, EthTransaction, TransactionDetail, UtxoType } from '../model/Transaction';


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

    async init() {
        this.mainchainRPCApiUrl = await this.prefs.getMainchainRPCApiEndpoint(GlobalDIDSessionsService.signedInDIDString);
        this.IDChainRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.id.rpcapi');
        this.ethscRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.rpcapi');
        this.ethscOracleRPCApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.oracle');
        this.ethscMiscApiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.apimisc');
        this.ethbrowserapiUrl = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, 'sidechain.eth.browserapi');
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
        } while (++retryTimes < JsonRPCService.RETRY_TIMES);
        return balanceOfSELA;
    }

    async getTransactionsByAddress(chainID: StandardCoinName, addressArray: string[], limit: number, skip: number = 0, timestamp: number = 0): Promise<any> {
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
        } while (++retryTimes < JsonRPCService.RETRY_TIMES);

        if (transactionsArray === null) {
          return [];
        } else {
          // Logger.warn('wallet', 'transactionsArray:',transactionsArray)
          return transactionsArray.filter(c => {
            return c.result && (c.result.totalcount > 0);
          });
        }
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
        } while (++retryTimes < JsonRPCService.RETRY_TIMES);

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
        } while (++retryTimes < JsonRPCService.RETRY_TIMES);

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
        } while (++retryTimes < JsonRPCService.RETRY_TIMES);

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

    //crc
    async getCRrelatedStage() {
      const param = {
          method: 'getcrrelatedstage',
      };

      const rpcApiUrl = this.getRPCApiUrl(StandardCoinName.ELA);
      if (rpcApiUrl.length === 0) {
          return 0;
      }

      let result = null;
      try {
          result = await this.httpRequest(rpcApiUrl, param);
      } catch (e) {
      }
      return result;
    }

    // ETHSC:Get the real target address for the send transaction from ethsc to mainchain.
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

    // ****************************************
    // ETHSC
    // ****************************************

    // ELA main chain: Get the real send address for the send transaction from ethsc to mainchain.
    async getETHSCTransactionByHash(chainID: StandardCoinName, txHash: string) {
      if (!txHash.startsWith('0x')) {
        txHash = '0x' + txHash;
      }
      const param = {
          method: 'eth_getTransactionByHash',
          params: [
            txHash
          ],
          id:'1'
      };

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return '';
      }

      try {
          return this.httpRequest(rpcApiUrl, param);
      } catch (e) {
      }
      return '';
    }

    async eth_blockNumber(chainID: StandardCoinName): Promise<number> {
      const param = {
          method: 'eth_blockNumber',
          id:'1'
      };

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return -1;
      }

      try {
          let result = await this.httpRequest(rpcApiUrl, param);
          return parseInt(result);
      } catch (e) {
      }
      return -1;
    }

    async eth_getBalance(chainID: StandardCoinName, address: string): Promise<BigNumber> {
      const param = {
          method: 'eth_getBalance',
          params: [
            address,
            'latest'
          ],
          id:'1'
      };

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return new BigNumber(NaN);;
      }

      try {
          let balanceString = await this.httpRequest(rpcApiUrl, param);
          return new BigNumber(balanceString).dividedBy(10000000000); // WEI to SELA;
      } catch (e) {
      }
      return new BigNumber(NaN);;
    }

    async getETHSCNonce(chainID: StandardCoinName, address: string): Promise<number> {
      const param = {
          method: 'eth_getTransactionCount',
          params: [
            address,
            'latest'
          ],
          id:'1'
      };

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return -1;
      }

      try {
          let result = await this.httpRequest(rpcApiUrl, param);
          return parseInt(result);
      } catch (e) {
      }
      return -1;
    }

    async getETHSCTransactions(chainID: StandardCoinName, address: string, begBlockNumber: number = 0, endBlockNumber: number = 0): Promise<EthTransaction[]> {
      const miscApiUrl = this.getMiscApiUrl(chainID);
      if (miscApiUrl.length === 0) {
          null;
      }

      // TODO: Don't support 'endBlockNumber', 'begBlockNumber', 'sort'
      // const ethscgethistoryurl = miscApiUrl + '/api/1/eth/history?address=' + address + '&begBlockNumber=' + begBlockNumber
      // + '&endBlockNumber=' + endBlockNumber + '&sort=desc';
      const ethscgethistoryurl = miscApiUrl + '/api/1/eth/history?address=' + address;
      Logger.warn('wallet', 'getETHSCTransactions:', ethscgethistoryurl)
      try {
          let result = await this.httpget(ethscgethistoryurl);
          return result.result as EthTransaction[];
      } catch (e) {
        Logger.error('wallet', 'getETHSCTransactions error:', e)
      }
      return null;
    }

    async eth_getTransactionByHash(chainID: StandardCoinName, txHash: string) {
      const param = {
        method: 'eth_getTransactionByHash',
        params: [
          txHash
        ],
        id: '1'
      };

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return '';
      }

      try {
          return this.httpRequest(rpcApiUrl, param);
      } catch (e) {
        Logger.error('wallet', 'eth_getTransactionByHash error:', e)
      }
      return '';
    }

    async getERC20TokenTransactions(chainID: StandardCoinName, address: string): Promise<EthTokenTransaction[]> {
      const ethscgetTokenTxsUrl = this.ethbrowserapiUrl + '/api/?module=account&action=tokentx&address=' + address;
      try {
          let result = await this.httpget(ethscgetTokenTxsUrl);
          return result.result as EthTokenTransaction[];
      } catch (e) {
        Logger.error('wallet', 'getERC20TokenTransactions error:', e)
      }
      return null;
    }

    async eth_sendRawTransaction(chainID: StandardCoinName, txHash: string) {
      if (!txHash.startsWith('0x')) {
        txHash = '0x' + txHash;
      }
      const param = {
          method: 'eth_sendRawTransaction',
          params: [
            txHash
          ],
          id: '1'
      };

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return '';
      }

      try {
          return this.httpRequest(rpcApiUrl, param);
      } catch (e) {
        Logger.error('wallet', 'eth_sendRawTransaction error:', e)
      }
      return '';
    }


    // ERC20 Token
    async eth_getTransactionReceipt(chainID: StandardCoinName, txidArray: string[]): Promise<any> {
      const paramArray = [];
      for (let i = 0, len = txidArray.length; i < len; i++) {
        const txid = txidArray[i];
        const param = {
            method: 'eth_getTransactionReceipt',
            params: [
              txid
            ],
            id: i.toString()
        };
        paramArray.push(param);
      }

      const rpcApiUrl = this.getRPCApiUrl(chainID);
      if (rpcApiUrl.length === 0) {
          return null;
      }

      try {
          return this.httpRequest(rpcApiUrl, paramArray);
      } catch (e) {
        Logger.error('wallet', 'eth_getTransactionReceipt error:', e)
      }
      return null;
    }

    getRPCApiUrl(chainID: string) {
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

    getMiscApiUrl(chainID: string) {
        let rpcApiUrl = this.mainchainRPCApiUrl;
        switch (chainID) {
            case StandardCoinName.ETHSC:
                rpcApiUrl = this.ethscMiscApiUrl;
                break;
            case StandardCoinName.ETHDID:
                rpcApiUrl = this.EIDMiscApiUrl;
                break;
            // case StandardCoinName.ETHHECO:
            //     rpcApiUrl = this.hecoChainRPCApiUrl;
            //     break;
            default:
                rpcApiUrl = '';
                Logger.log("wallet", 'JsonRPCService: Misc can not support ' + chainID);
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

    httpget(url): Promise<any> {
      return new Promise((resolve, reject)=>{
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
