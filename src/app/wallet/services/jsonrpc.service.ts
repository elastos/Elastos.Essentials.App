import { Injectable } from '@angular/core';
import { StandardCoinName } from '../model/Coin';
import { Config } from '../config/Config';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { ERC20TokenInfo, EthTokenTransaction, EthTransaction, TransactionDetail, UtxoType } from '../model/Transaction';
import { CRProposalStatus } from '../model/cyber-republic/CRProposalStatus';
import { CRProposalsSearchResponse } from '../model/cyber-republic/CRProposalsSearchResponse';
import { ProducersSearchResponse } from 'src/app/dposvoting/model/nodes.model';
import { CRCouncilSearchResponse } from '../model/cyber-republic/CRCouncilSearchResult';
import { ApiUrlType, GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';


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
    static RETRY_TIMES = 3;

    constructor(private globalJsonRPCService: GlobalJsonRPCService) {
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

        let apiurltype = this.getApiUrlTypeForRpc(chainID);
        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
        if (rpcApiUrl.length === 0) {
            return balanceOfSELA;
        }

        // httpPost fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                const resultArray = await this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
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

        let apiurltype = this.getApiUrlTypeForRpc(chainID);
        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
        if (rpcApiUrl.length === 0) {
            return [];
        }

        let transactionsArray = null;
        // httpPost fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                transactionsArray = await this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
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

        let apiurltype = this.getApiUrlTypeForRpc(chainID);
        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
        if (rpcApiUrl.length === 0) {
            return null;
        }

        let result: TransactionDetail = null;
        // httpPost fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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
                utxotype,
                spendable: true // Coinbase utxo must be confirmed more than 100 times.
            },
        };

        let apiurltype = this.getApiUrlTypeForRpc(chainID);
        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
        if (rpcApiUrl.length === 0) {
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

        let apiurltype = this.getApiUrlTypeForRpc(chainID);
        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
        if (rpcApiUrl.length === 0) {
            return '';
        }

        let txid = '';
        // httpPost fail sometimes, retry 5 times.
        let retryTimes = 0;
        do {
            try {
                txid = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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

        let apiurltype = this.getApiUrlTypeForRpc(chainID);
        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
        if (rpcApiUrl.length === 0) {
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

        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.ELA_RPC);

        try {
            const dposNodes = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            return dposNodes;
        } catch (e) {
        }
        return null;
    }

    //crc
    async getCRrelatedStage() {
      const param = {
          method: 'getcrrelatedstage',
      };

      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.ELA_RPC);

      let result = null;
      try {
          result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
      }
      return result;
    }

    public async fetchCRcouncil(index: number = 0): Promise<CRCouncilSearchResponse> {
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.CR_RPC);

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
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.CR_RPC);
      const crfetchproposalsurl = rpcApiUrl + '/api/cvote/all_search?status=' + status + '&page=1&results=-1';
      try {
          let result = await this.globalJsonRPCService.httpGet(crfetchproposalsurl);
          return result;
      } catch (e) {
        Logger.error('wallet', 'fetchProposals error:', e)
      }
      return null;
    }

    // ETHSC:Get the real target address for the send transaction from ethsc to mainchain.
    async getETHSCWithdrawTargetAddress(blockHeight: number, txHash: string) {
        const param = {
            method: 'getwithdrawtransactionsbyheight',
            params: {
                height: blockHeight
            },
        };

        const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.ETHSC_ORACLE);

        try {
            const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return '';
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
      }
      return '';
    }

    async eth_blockNumber(chainID: StandardCoinName): Promise<number> {
      const param = {
          method: 'eth_blockNumber',
          id:'1'
      };

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return -1;
      }

      try {
          let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return new BigNumber(NaN);;
      }

      try {
          let balanceString = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return -1;
      }

      try {
          let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
          return parseInt(result);
      } catch (e) {
      }
      return -1;
    }

    async getETHSCTransactions(chainID: StandardCoinName, address: string, begBlockNumber: number = 0, endBlockNumber: number = 0): Promise<EthTransaction[]> {
      let apiurltype = this.getApiUrlTypeForBrowser(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return null;
      }

      const ethscgethistoryurl = rpcApiUrl + '/api/?module=account&action=txlist&address=' + address;
      Logger.warn('wallet', 'getETHSCTransactions:', ethscgethistoryurl)
      try {
          let result = await this.globalJsonRPCService.httpGet(ethscgethistoryurl);
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

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return '';
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
        Logger.error('wallet', 'eth_getTransactionByHash error:', e)
      }
      return '';
    }

    async getERC20TokenTransactions(chainID: StandardCoinName, address: string): Promise<EthTokenTransaction[]> {
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.ETH_BROWSER);
      if (rpcApiUrl.length == 0) {
        return null;
      }

      const ethscgetTokenTxsUrl = rpcApiUrl + '/api/?module=account&action=tokentx&address=' + address;
      try {
          let result = await this.globalJsonRPCService.httpGet(ethscgetTokenTxsUrl);
          return result.result as EthTokenTransaction[];
      } catch (e) {
        Logger.error('wallet', 'getERC20TokenTransactions error:', e)
      }
      return null;
    }

    async getERC20TokenList(chainID: StandardCoinName, address: string): Promise<ERC20TokenInfo[]> {
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(ApiUrlType.ETH_BROWSER);
      if (rpcApiUrl.length == 0) {
        return null;
      }

      const ethscgetTokenListUrl = rpcApiUrl + '/api/?module=account&action=tokenlist&address=' + address;
      try {
          let result = await this.globalJsonRPCService.httpGet(ethscgetTokenListUrl);
          return result.result as ERC20TokenInfo[];
      } catch (e) {
        Logger.error('wallet', 'getERC20TokenList error:', e)
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

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return '';
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
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

      let apiurltype = this.getApiUrlTypeForRpc(chainID);
      const rpcApiUrl = this.globalJsonRPCService.getApiUrl(apiurltype);
      if (rpcApiUrl.length === 0) {
          return null;
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
      } catch (e) {
        Logger.error('wallet', 'eth_getTransactionReceipt error:', e)
      }
      return null;
    }

    public getApiUrlTypeForRpc(chainID: string): ApiUrlType {
      let apiUrlType = ApiUrlType.ELA_RPC;
      switch (chainID) {
          case StandardCoinName.ELA:
              apiUrlType = ApiUrlType.ELA_RPC;
              break;
          case StandardCoinName.IDChain:
              apiUrlType = ApiUrlType.DID_RPC;
              break;
          case StandardCoinName.ETHSC:
              apiUrlType = ApiUrlType.ETHSC_RPC;
              break;
          case StandardCoinName.ETHDID:
              apiUrlType = ApiUrlType.EID_RPC;
              break;
          default:
              Logger.log("wallet", 'JsonRPCService: RPC can not support ' + chainID);
              break;
      }
      return apiUrlType;
  }

  // TODO: Remove it, Use browser api not misc.
  getApiUrlTypeForMisc(chainID: string) {
      let apiUrlType = ApiUrlType.ETHSC_MISC;
      switch (chainID) {
          case StandardCoinName.ETHSC:
              apiUrlType = ApiUrlType.ETHSC_MISC;
              break;
          case StandardCoinName.ETHDID:
              apiUrlType = ApiUrlType.EID_MISC;
              break;
          default:
              Logger.log("wallet", 'JsonRPCService: Misc can not support ' + chainID);
              break;
      }
      return apiUrlType;
  }

  getApiUrlTypeForBrowser(chainID: string) {
    let apiUrlType = ApiUrlType.ETH_BROWSER;
    switch (chainID) {
        case StandardCoinName.ETHSC:
            apiUrlType = ApiUrlType.ETH_BROWSER;
            break;
        default:
            Logger.log("wallet", 'JsonRPCService: Misc can not support ' + chainID);
            break;
    }
    return apiUrlType;
  }
}
