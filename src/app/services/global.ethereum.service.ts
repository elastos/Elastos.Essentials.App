import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { Logger } from '../logger';
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
    public getETHSCTransactionByHash(rpcApiUrl: string, txHash: string, limitatorName = "default") {
        if (!txHash.startsWith('0x')) {
            txHash = '0x' + txHash;
        }
        const param = {
            method: 'eth_getTransactionByHash',
            params: [
                txHash
            ],
            jsonrpc: "2.0",
            id: '1'
        };

        try {
            return this.globalJsonRPCService.httpPost(rpcApiUrl, param, limitatorName);
        }
        catch (err) {
            Logger.error('RPCService', 'getETHSCTransactionByHash: http post error:', err);
            return null;
        }
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

    public async eth_getBalance(rpcApiUrl: string, address: string, limitatorName = "default"): Promise<BigNumber> {
        const param = {
            method: 'eth_getBalance',
            params: [
                address,
                'latest'
            ],
            jsonrpc: "2.0",
            id: '1'
        };

        try {
            // Normal 10s is enough for get balance.
            let balanceString = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, limitatorName, 10000);
            return new BigNumber(balanceString);
        }
        catch (err) {
            Logger.error('RPCService', 'eth_getBalance: http post error:', err);
            return null;
        }
    }

    public async getETHSCNonce(rpcApiUrl: string, address: string, limitatorName = "default"): Promise<number> {
        const param = {
            method: 'eth_getTransactionCount',
            params: [
                address,
                'latest'
            ],
            jsonrpc: "2.0",
            id: '1'
        };

        try {
            let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, limitatorName);
            return parseInt(result);
        }
        catch (err) {
            Logger.error('RPCService', 'getETHSCNonce: http post error:', err);
            return -1;
        }
    }

    public eth_getTransactionByHash(rpcApiUrl: string, txHash: string, limitatorName = "default") {
        const param = {
            method: 'eth_getTransactionByHash',
            params: [
                txHash
            ],
            jsonrpc: "2.0",
            id: '1'
        };

        try {
            return this.globalJsonRPCService.httpPost(rpcApiUrl, param, limitatorName);
        }
        catch (err) {
            Logger.error('RPCService', 'eth_getTransactionByHash: http post error:', err);
            return null;
        }
    }

    public eth_sendRawTransaction(rpcApiUrl: string, txHash: string, limitatorName = "default") {
        if (!txHash)
            throw new Error("eth_sendRawTransaction(): transaction hash can't be empty!");

        if (!txHash.startsWith('0x')) {
            txHash = '0x' + txHash;
        }
        const param = {
            method: 'eth_sendRawTransaction',
            params: [
                txHash
            ],
            jsonrpc: "2.0",
            id: '1'
        };

        return this.globalJsonRPCService.httpPost(rpcApiUrl, param, limitatorName);
    }

    public eth_getTransactionReceipt(rpcApiUrl: string, txidArray: string[], limitatorName = "default"): Promise<any> {
        const paramArray = [];
        for (let i = 0, len = txidArray.length; i < len; i++) {
            const txid = txidArray[i];
            const param = {
                method: 'eth_getTransactionReceipt',
                params: [
                    txid
                ],
                jsonrpc: "2.0",
                id: i.toString()
            };
            paramArray.push(param);
        }

        try {
            return this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray, limitatorName);
        }
        catch (err) {
            Logger.error('RPCService', 'eth_getTransactionReceipt: http post error:', err);
            return null;
        }
    }

    public async eth_estimateGas(rpcApiUrl: string, from: string, to: string, value: string, limitatorName = "default"): Promise<number> {
        const param = {
            method: 'eth_estimateGas',
            params: [{
                from,
                to,
                value
            }],
            jsonrpc: "2.0",
            id: '1'
        };

        try {
            let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, limitatorName);
            return parseInt(result);
        }
        catch (err) {
            Logger.error('RPCService', 'eth_estimateGas: http post error:', err);
            return -1;
        }
    }
}
