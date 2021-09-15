import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { GlobalJsonRPCService } from './global.jsonrpc.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalEthereumRPCService {
    public static instance: GlobalEthereumRPCService = null;

    constructor(private http: HttpClient, private globalJsonRPCService: GlobalJsonRPCService) {
        GlobalEthereumRPCService.instance = this;
    }

    // TODO: duplicate of eth_getTransactionByHash ?
    public getETHSCTransactionByHash(rpcApiUrl: string, txHash: string) {
        if (!txHash.startsWith('0x')) {
            txHash = '0x' + txHash;
        }
        const param = {
            method: 'eth_getTransactionByHash',
            params: [
                txHash
            ],
            id: '1'
        };

        return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
    }

    /* public async eth_blockNumber(elastosChainCode: StandardCoinName): Promise<number> {
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
    } */

    public async eth_getBalance(rpcApiUrl: string, address: string): Promise<BigNumber> {
        const param = {
            method: 'eth_getBalance',
            params: [
                address,
                'latest'
            ],
            id: '1'
        };

        let balanceString = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        return new BigNumber(balanceString).dividedBy(10000000000); // WEI to SELA;
    }

    public async getETHSCNonce(rpcApiUrl: string, address: string): Promise<number> {
        const param = {
            method: 'eth_getTransactionCount',
            params: [
                address,
                'latest'
            ],
            id: '1'
        };

        let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        return parseInt(result);
    }

    public eth_getTransactionByHash(rpcApiUrl: string, txHash: string) {
        const param = {
            method: 'eth_getTransactionByHash',
            params: [
                txHash
            ],
            id: '1'
        };

        return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
    }

    public eth_sendRawTransaction(rpcApiUrl: string, txHash: string) {
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

        return this.globalJsonRPCService.httpPost(rpcApiUrl, param);
    }

    public eth_getTransactionReceipt(rpcApiUrl: string, txidArray: string[]): Promise<any> {
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

        return this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
    }

    public async eth_estimateGas(rpcApiUrl: string, from: string, to: string, value: string): Promise<number> {
      const param = {
          method: 'eth_estimateGas',
          params: [{
            from,
            to,
            value
          }],
          id: '1'
      };
      let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
      return parseInt(result);
    }
}
