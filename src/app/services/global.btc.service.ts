import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { environment } from 'src/environments/environment';
import { Logger } from '../logger';
import { AddressResult, BalanceHistory, BTCNetworkInfoResult, BTCTransaction, BTCUTXO } from '../wallet/model/btc.types';
import { GlobalJsonRPCService } from './global.jsonrpc.service';

export enum BTCFeeRate {
  FAST = 1,     // 1 block
  AVERAGE = 3,  // 3 block
  SLOW = 6      // 6 block
}

@Injectable({
    providedIn: 'root'
})
export class GlobalBTCRPCService {
    public static instance: GlobalBTCRPCService = null;
    private apikey = `${environment.NownodesAPI.apikey}`;

    constructor(private http: HttpClient, private globalJsonRPCService: GlobalJsonRPCService) {
        GlobalBTCRPCService.instance = this;
    }

    // EXPLORER api
    public async balancehistory(rpcApiUrl: string, address: string): Promise<BigNumber> {
        let requestUrl = rpcApiUrl + '/api/v2/balancehistory/' + address;

        try {
            let balanceArray: BalanceHistory[] = await this.httpGet(requestUrl);
            if (balanceArray instanceof Array) {
                //TODO: the address is not array.
                return new BigNumber(balanceArray[0].received);
            }
            return null;
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'balancehistory: http get error:', err);
            return null;
        }
    }

    // EXPLORER api
    public async address(rpcApiUrl: string, address: string, pageSize: number, page = 1): Promise<AddressResult> {
        // address/<address>[?page=<page>&pageSize=<size>&from=<block height>&to=<block height>&details=<basic|tokens|tokenBalances|txids|txs>&contract=<contract address>]
        let requestUrl = rpcApiUrl + '/api/v2/address/' + address + '?pageSize=' + pageSize + '&page=' + page;

        try {
            let balanceArray: AddressResult = await this.httpGet(requestUrl);
            return balanceArray;
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'address: http get error:', err);
            return null;
        }
    }

    // public async getrawtransaction(rpcApiUrl: string, txid: string): Promise<BTCTransaction> {
    //     let requestUrl = rpcApiUrl + '/api/v2/tx-specific/' + txid;

    //     try {
    //         return await this.httpGet(requestUrl);
    //     }
    //     catch (err) {
    //         Logger.error('GlobalBTCRPCService', 'getrawtransaction: http get error:', err);
    //         return null;
    //     }
    // }

    // EXPLORER api
    public async getrawtransaction(rpcApiUrl: string, txid: string): Promise<BTCTransaction> {
        let requestUrl = rpcApiUrl + '/api/v2/tx/' + txid;

        try {
            return await this.httpGet(requestUrl);
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'getrawtransaction: http get error:', err);
            return null;
        }
    }

    // EXPLORER api
    public async getUTXO(rpcApiUrl: string, address: string): Promise<BTCUTXO[]> {
        let requestUrl = rpcApiUrl + '/api/v2/utxo/' + address + '?confirmed=true';

        try {
            return await this.httpGet(requestUrl);
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'getUTXO: http get error:', err);
            return null;
        }
    }

    // Node api
    // feeRate: [1, 1008]
    public async estimatesmartfee(rpcApiUrl: string, feeRate: BTCFeeRate = BTCFeeRate.AVERAGE): Promise<number> {
        const param = {
            'API_key': this.apikey,
            method: 'estimatesmartfee',
            params: [feeRate],
            "jsonrpc": "2.0",
            "id": "1",
        };

        let result = null;
        try {
            result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, "btc");
            if (result) {
                return result.feerate;
            }
        } catch (err) {
            Logger.error('GlobalBTCRPCService', 'estimatesmartfee error:', err);
        }
        return null;
    }

    // Node api
    public async sendrawtransaction(rpcApiUrl: string, signedhex: string): Promise<string> {
        const param = {
            'API_key': this.apikey,
            method: 'sendrawtransaction',
            params: [signedhex],
            "jsonrpc": "2.0",
            "id": "1",
        };

        try {
            return await this.globalJsonRPCService.httpPost(rpcApiUrl, param, "btc");
        } catch (err) {
            Logger.error('GlobalBTCRPCService', 'sendrawtransaction error:', err);
        }
        return null;
    }

    public async getnetworkinfo(rpcApiUrl: string): Promise<BTCNetworkInfoResult> {
        const param = {
            'API_key': this.apikey,
            method: 'getnetworkinfo',
            params: [],
            "jsonrpc": "2.0",
            "id": "1",
        };

        try {
            return await this.globalJsonRPCService.httpPost(rpcApiUrl, param, "btc");
        } catch (err) {
            Logger.error('GlobalBTCRPCService', 'getnetworkinfo error:', err);
        }
        return null;
    }

    httpGet(url): Promise<any> {
        let options = {
            headers: {
                'api-key': this.apikey,
            }
        }

        return new Promise((resolve, reject) => {
            this.http.get<any>(url, options).subscribe((res) => {
                resolve(res);
            }, (err) => {
                Logger.error('GlobalBTCRPCService', 'http get error:', err);
                reject(err);
            });
        });
    }
}
