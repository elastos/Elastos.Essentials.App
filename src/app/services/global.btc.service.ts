import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import { Logger } from '../logger';
import { AddressResult, BalanceHistory, BTCTransaction, BTCUTXO } from '../wallet/model/btc.types';
import { GlobalJsonRPCService } from './global.jsonrpc.service';
import { GlobalNetworksService, MAINNET_TEMPLATE } from './global.networks.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalBTCRPCService {
    public static instance: GlobalBTCRPCService = null;
    // // Pay for it after evaluation
    // private apikeys = ['JCBiDqxUbHK2yjVPndSwYg70aANmzkOF',
    //     'raIkl0N79nXd6jZOF1zyLiBMVwbJqfc2',
    //     '4XZngRNFoTDc7l8GIKx3YmUWvtBSwydb',
    //     '49DAE10rcXPU7LRkKfyiuGtFgvBMIJjQ',
    //     'zvEsonX2uFPTLy7liqWApZhb9Uce8Omk']

    private apikey_testnet = 'raIkl0N79nXd6jZOF1zyLiBMVwbJqfc2';
    private apikey_mainnet = '';
    private apikey = '';

    constructor(private http: HttpClient, private globalJsonRPCService: GlobalJsonRPCService) {
        GlobalBTCRPCService.instance = this;
    }

    init() {
        this.http.get("assets/wallet/data/apikey-nownode.json").subscribe({
            next: (value) => {
                if ((value instanceof Array) && (value.length > 0)) {
                    this.apikey_mainnet = value[Math.floor(Math.random() * value.length)];

                    let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
                    if (network !== MAINNET_TEMPLATE) {
                        this.apikey = this.apikey_testnet;
                    } else {
                        this.apikey = this.apikey_mainnet;
                    }

                } else {
                    throw new Error("Can't find the api keys, the value is " + value)
                }
            },
            complete: () => {
            },
            error: (e) => {
                throw e;
            }
        })
    }

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
            result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param, "btc");
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
            return await this.globalJsonRPCService.httpPost(rpcApiUrl, param, "btc");
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
                resolve(res);
            }, (err) => {
                Logger.error('GlobalBTCRPCService', 'http get error:', err);
                reject(err);
            });
        });
    }
}
