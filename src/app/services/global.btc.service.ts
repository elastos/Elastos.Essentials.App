import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { Logger } from '../logger';
import { AddressResult, BalanceHistory } from '../wallet/model/btc.types';
import { GlobalJsonRPCService } from './global.jsonrpc.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalBTCRPCService {
    public static instance: GlobalBTCRPCService = null;
    private apikey = 'JCBiDqxUbHK2yjVPndSwYg70aANmzkOF';

    constructor(private http: HttpClient, private globalJsonRPCService: GlobalJsonRPCService) {
        GlobalBTCRPCService.instance = this;
    }

    public async balancehistory(rpcApiUrl: string, address: string): Promise<BigNumber> {
        let requestUrl = rpcApiUrl + '/balancehistory/' + address;

        return new BigNumber("1346705"); // for test
        try {
            let balanceArray: BalanceHistory[] = await this.httpGet(requestUrl);
            Logger.warn('wallet', '---balanceString:', balanceArray)
            if (balanceArray instanceof Array) {
                //TODO: the address is not array.
                return new BigNumber(balanceArray[0].received);
            }
            return null;
        }
        catch (err) {
            Logger.error('RPCService', 'balancehistory: http get error:', err);
            return null;
        }
    }

    public async address(rpcApiUrl: string, address: string): Promise<any> {
        let requestUrl = rpcApiUrl + '/address/' + address;

        try {
            let balanceArray: AddressResult[] = await this.httpGet(requestUrl);
            Logger.warn('wallet', '---balanceString:', balanceArray)
            // if (balanceArray instanceof Array) {
            //     //TODO: the address is not array.
            //     return new BigNumber(balanceArray[0].received);
            // }
            return null;
        }
        catch (err) {
            Logger.error('RPCService', 'balancehistory: http get error:', err);
            return null;
        }
    }

    public async getrawtransaction(rpcApiUrl: string, txid: string) {
        let requestUrl = rpcApiUrl + '/tx-specific/' + txid;

        try {
            let balanceArray: AddressResult[] = await this.httpGet(requestUrl);
            Logger.warn('wallet', '---getrawtransaction:', balanceArray)
            // if (balanceArray instanceof Array) {
            //     //TODO: the address is not array.
            //     return new BigNumber(balanceArray[0].received);
            // }
            return null;
        }
        catch (err) {
            Logger.error('RPCService', 'getrawtransaction: http get error:', err);
            return null;
        }
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
            jsonrpc: "2.0",
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
                jsonrpc: "2.0",
                id: i.toString()
            };
            paramArray.push(param);
        }

        try {
            return this.globalJsonRPCService.httpPost(rpcApiUrl, paramArray);
        }
        catch (err) {
            Logger.error('RPCService', 'eth_getTransactionReceipt: http post error:', err);
            return null;
        }
    }

    public async eth_estimateGas(rpcApiUrl: string, from: string, to: string, value: string): Promise<number> {
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
            let result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            return parseInt(result);
        }
        catch (err) {
            Logger.error('RPCService', 'eth_estimateGas: http post error:', err);
            return -1;
        }
    }

    httpGet(url): Promise<any> {
        let options = {
            headers: {
                'api-key': this.apikey,
              }
        }
        return new Promise((resolve, reject) => {
            this.http.get<any>(url, options).subscribe((res) => {
                Logger.warn('wallet', res);
                resolve(res);
            }, (err) => {
                Logger.error('GlobalBTCRPCService', 'http get error:', err);
                reject(err);
            });
        });
    }
}
