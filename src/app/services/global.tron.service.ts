import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Logger } from '../logger';
import { BTCNetworkInfoResult, BTCTransaction } from '../wallet/model/btc.types';
import { AccountResult, TronTransaction } from '../wallet/model/tron.types';
import { GlobalJsonRPCService } from './global.jsonrpc.service';
import { GlobalNetworksService, MAINNET_TEMPLATE } from './global.networks.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalTronGridService {
    public static instance: GlobalTronGridService = null;
    // Currently using Trongrid to request, the Shasta/Nile testnet does not need to set an API Key.
    private apikey_testnet = '';
    private apikey_mainnet = 'e01b9d55-e787-4c0f-8074-8fbe40fddb91';
    private apikey = '';

    constructor(private http: HttpClient, private globalJsonRPCService: GlobalJsonRPCService) {
        GlobalTronGridService.instance = this;
    }

    init() {
        let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
        if (network !== MAINNET_TEMPLATE) {
            this.apikey = this.apikey_testnet;
        } else {
            this.apikey = this.apikey_mainnet;
        }
    }

    /**
     * Get balance and trc20 tokens.
     */
    public async account(rpcApiUrl: string, address: string): Promise<AccountResult> {
        let requestUrl = rpcApiUrl + '/v1/accounts/' + address;

        try {
            let ret = await this.httpGet(requestUrl);
            if (ret && ret.data) {
                return ret.data[0];
            } else return null;
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'account: http get error:', err);
            return null;
        }
    }

    // maximum block_timestamp is now if max_timestamp = 0
    public async getTransactions(rpcApiUrl: string, address: string, pageSize: number, max_timestamp = 0): Promise<TronTransaction[]> {
        let requestUrl = rpcApiUrl + '/v1/accounts/' + address + 'transactions?limit=' + pageSize + '&max_timestamp=' + max_timestamp;

        try {
            let ret = await this.httpGet(requestUrl);
            if (ret && ret.data) {
                return ret.data[0];
            } else return null;
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getTransactions: http get error:', err);
            return null;
        }
    }

    public async gettransactions(rpcApiUrl: string, txid: string): Promise<BTCTransaction> {
        let requestUrl = rpcApiUrl + '/api/v2/tx/' + txid;

        try {
            return await this.httpGet(requestUrl);
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getrawtransaction: http get error:', err);
            return null;
        }
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
            Logger.error('GlobalTronGridService', 'sendrawtransaction error:', err);
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
            Logger.error('GlobalTronGridService', 'getnetworkinfo error:', err);
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
                Logger.error('GlobalTronGridService', 'http get error:', err);
                reject(err);
            });
        });
    }
}
