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
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';

@Injectable({
    providedIn: 'root'
})
export class WalletJsonRPCService {
    static RETRY_TIMES = 3;

    constructor(
      private globalJsonRPCService: GlobalJsonRPCService,
      private globalElastosAPIService: GlobalElastosAPIService) {
    }

    // return balance in SELA
    public async getBalanceByAddress(elastosChainCode: StandardCoinName, addressArray: string[]): Promise<BigNumber> {
        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
          return null;
        }

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

        let retryTimes = 0;
        let alreadyGetBalance = false;
        do {
            try {
                const resultArray = await this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
                for (const result of resultArray) {
                    balanceOfSELA = balanceOfSELA.plus(new BigNumber(result.result).multipliedBy(Config.SELAAsBigNumber));
                }
                alreadyGetBalance = true;
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < WalletJsonRPCService.RETRY_TIMES);
        return alreadyGetBalance ? balanceOfSELA : null;
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
        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
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
        } while (++retryTimes < WalletJsonRPCService.RETRY_TIMES);

        if (transactionsArray === null) {
          return [];
        } else {
          // Logger.warn('wallet', 'transactionsArray:',transactionsArray)
          return transactionsArray.filter(c => {
            return c.result && (c.result.totalcount > 0);
          });
        }
    }

    public async getrawtransaction(elastosChainCode: StandardCoinName, txidArray: string[]): Promise<any[]> {
      const paramArray = [];
      for (let i = 0, len = txidArray.length; i < len; i++) {
        const txid = txidArray[i];
        const param = {
            method: 'getrawtransaction',
            params: {
              txid,
              verbose : true
            },
            id: i.toString()
        };
        paramArray.push(param);
      }

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return null;
      }

      let result: any[] = null;
      let retryTimes = 0;
      do {
          try {
              result = await this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
              break;
          } catch (e) {
              // wait 100ms?
          }
      } while (++retryTimes < WalletJsonRPCService.RETRY_TIMES);

      // Logger.log('wallet', 'getrawtransaction:', result)
      return result;
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
        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
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
        } while (++retryTimes < WalletJsonRPCService.RETRY_TIMES);

        // Logger.log('wallet', 'getAllUtxoByAddress:', utxoArray)
        return utxoArray;
    }

    public async sendrawtransaction(elastosChainCode: StandardCoinName, payload: string): Promise<string> {
        const param = {
            method: 'sendrawtransaction',
            params: [
              payload
            ],
        };

        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return '';
        }
        // The caller need catch the execption.
        return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
    }

    public async getBlockCount(elastosChainCode: StandardCoinName) {
        const param = {
            method: 'getblockcount',
        };

        let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
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

        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);

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

      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);

      let result = null;
      try {
          result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
      }
      return result;
    }

    public async fetchCRcouncil(index = 0): Promise<CRCouncilSearchResponse> {
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);

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
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.CR_RPC);
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
    public async getETHSCWithdrawTargetAddress(blockHeight: number, txHash: string) {
        const param = {
            method: 'getwithdrawtransactionsbyheight',
            params: {
                height: blockHeight
            },
        };

        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ETHSC_ORACLE);

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
    public getETHSCTransactionByHash(elastosChainCode: StandardCoinName, txHash: string) {
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

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return '';
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
      }
      return '';
    }

    public async eth_blockNumber(elastosChainCode: StandardCoinName): Promise<number> {
      const param = {
          method: 'eth_blockNumber',
          id:'1'
      };

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return -1;
      }

      try {
          let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
          return parseInt(result);
      } catch (e) {
      }
      return -1;
    }

    public async eth_getBalance(elastosChainCode: StandardCoinName, address: string): Promise<BigNumber> {
      const param = {
          method: 'eth_getBalance',
          params: [
            address,
            'latest'
          ],
          id:'1'
      };

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return null;
      }

      try {
          let balanceString = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
          return new BigNumber(balanceString).dividedBy(10000000000); // WEI to SELA;
      } catch (e) {
      }
      return null;
    }

    public async getETHSCNonce(elastosChainCode: StandardCoinName, address: string): Promise<number> {
      const param = {
          method: 'eth_getTransactionCount',
          params: [
            address,
            'latest'
          ],
          id:'1'
      };

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return -1;
      }

      try {
          let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
          return parseInt(result);
      } catch (e) {
      }
      return -1;
    }

    public async getETHSCTransactions(elastosChainCode: StandardCoinName, address: string, begBlockNumber = 0, endBlockNumber = 0): Promise<EthTransaction[]> {
      let apiurltype = this.getApiUrlTypeForMisc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return null;
      }
      let ethscgethistoryurl = null;
      // Misc api
      // const ethscgethistoryurl = miscApiUrl + '/api/1/eth/history?address=' + address '&begBlockNumber=' + begBlockNumber
      // + '&endBlockNumber=' + endBlockNumber + '&sort=desc';
      ethscgethistoryurl = rpcApiUrl + '/api/1/eth/history?address=' + address;
      try {
          let result = await this.globalJsonRPCService.httpGet(ethscgethistoryurl);
          return result.result as EthTransaction[];
      } catch (e) {
        Logger.error('wallet', 'getETHSCTransactions error:', e)
      }
      return null;
    }

    public eth_getTransactionByHash(elastosChainCode: StandardCoinName, txHash: string) {
      const param = {
        method: 'eth_getTransactionByHash',
        params: [
          txHash
        ],
        id: '1'
      };

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return '';
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      } catch (e) {
        Logger.error('wallet', 'eth_getTransactionByHash error:', e)
      }
      return '';
    }

    public async getERC20TokenTransactions(elastosChainCode: StandardCoinName, address: string): Promise<EthTokenTransaction[]> {
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ETHSC_BROWSER);
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

    public async getERC20TokenList(elastosChainCode: StandardCoinName, address: string): Promise<ERC20TokenInfo[]> {
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ETHSC_BROWSER);
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

    public eth_sendRawTransaction(elastosChainCode: StandardCoinName, txHash: string) {
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

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return '';
      }
      // The caller need catch the execption.
      return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
    }


    // ERC20 Token
    public eth_getTransactionReceipt(elastosChainCode: StandardCoinName, txidArray: string[]): Promise<any> {
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

      let apiurltype = this.getApiUrlTypeForRpc(elastosChainCode);
      const rpcApiUrl = this.globalElastosAPIService.getApiUrl(apiurltype);
      if (rpcApiUrl === null) {
          return null;
      }

      try {
          return this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
      } catch (e) {
        Logger.error('wallet', 'eth_getTransactionReceipt error:', e)
      }
      return null;
    }

    public getApiUrlTypeForRpc(elastosChainCode: string): ElastosApiUrlType {
      let apiUrlType = ElastosApiUrlType.ELA_RPC;
      switch (elastosChainCode) {
          case StandardCoinName.ELA:
              apiUrlType = ElastosApiUrlType.ELA_RPC;
              break;
          case StandardCoinName.IDChain:
              apiUrlType = ElastosApiUrlType.DID_RPC;
              break;
          case StandardCoinName.ETHSC:
              apiUrlType = ElastosApiUrlType.ETHSC_RPC;
              break;
          case StandardCoinName.ETHDID:
              apiUrlType = ElastosApiUrlType.EID_RPC;
              break;
          default:
              Logger.log("wallet", 'WalletJsonRPCService: RPC can not support ' + elastosChainCode);
              break;
      }
      return apiUrlType;
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
          default:
              Logger.log("wallet", 'WalletJsonRPCService: Misc can not support ' + elastosChainCode);
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
            Logger.log("wallet", 'WalletJsonRPCService: Browser api can not support ' + elastosChainCode);
            break;
    }
    return apiUrlType;
  }
}
