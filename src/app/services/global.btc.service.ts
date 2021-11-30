import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { Logger } from '../logger';
import { AddressResult, BalanceHistory, BTCTransaction, BTCUTXO } from '../wallet/model/btc.types';
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
        let requestUrl = rpcApiUrl + '/api/v2/balancehistory/' + address;

        return new BigNumber("1346705"); // for test
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

    public async address(rpcApiUrl: string, address: string): Promise<AddressResult> {
        let requestUrl = rpcApiUrl + '/api/v2/address/' + address;

        try {
            let balanceArray: AddressResult = await this.httpGet(requestUrl);
            return balanceArray;
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'balancehistory: http get error:', err);
            return null;
        }
    }

    public async getrawtransaction(rpcApiUrl: string, txid: string): Promise<BTCTransaction> {
        let requestUrl = rpcApiUrl + '/api/v2/tx-specific/' + txid;

        try {
            return await this.httpGet(requestUrl);
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'getrawtransaction: http get error:', err);
            return null;
        }
    }

    public async getUTXO(rpcApiUrl: string, address: string): Promise<BTCUTXO[]> {
        let requestUrl = rpcApiUrl + '/api/v2/utxo/' + address;// + '?confirmed=true';

        try {
            return await this.httpGet(requestUrl);
        }
        catch (err) {
            Logger.error('GlobalBTCRPCService', 'getUTXO: http get error:', err);
            return null;
        }
    }

    public async estimatesmartfee(rpcApiUrl: string): Promise<number> {
        const param = {
            'API_key': this.apikey,
            method: 'estimatesmartfee',
            params: [1],
            "jsonrpc": "2.0",
            "id": "1",
        };

        let result = null;
        try {
            result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            if (result) {
                return result.feerate;
            }
        } catch (err) {
            Logger.error('GlobalBTCRPCService', 'estimatesmartfee error:', err);
        }
        return null;
    }

    // return txid
    public async sendrawtransaction(rpcApiUrl: string, signedhex: string): Promise<string> {
        const param = {
            'API_key': this.apikey,
            method: 'sendrawtransaction',
            params: [signedhex],
            "jsonrpc": "2.0",
            "id": "1",
        };

        try {
            return await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
        } catch (err) {
            Logger.error('GlobalBTCRPCService', 'sendrawtransaction error:', err);
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
                Logger.warn('GlobalBTCRPCService', 'http respones:', res);
                resolve(res);
            }, (err) => {
                Logger.error('GlobalBTCRPCService', 'http get error:', err);
                reject(err);
            });
        });
    }
}
