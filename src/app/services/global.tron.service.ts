import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lazyTronWebImport } from '../helpers/import.helper';
import { Logger } from '../logger';
import { TronNetworkBase } from '../wallet/model/networks/tron/network/tron.base.network';
import { AccountResources, AccountResult, SendTransactionResult, TronTransaction, TronTransactionInfo, TronTRC20Transaction } from '../wallet/model/tron.types';
import { WalletNetworkService } from '../wallet/services/network.service';
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

    private tronWeb = null;

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

        WalletNetworkService.instance.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork instanceof TronNetworkBase) {
              void this.initTronWeb();
            }
        })
    }

    private async initTronWeb() {
        if (this.tronWeb) return;

        const TronWeb = await lazyTronWebImport();
        this.tronWeb = new TronWeb({
            fullHost: WalletNetworkService.instance.activeNetwork.value.getRPCUrl(),
            headers: this.apikey ? { "TRON-PRO-API-KEY": this.apikey } : null,
        })
    }

    public getApiKey() {
        return this.apikey;
    }

    /**
     * Get balance and trc20 tokens.
     */
    public async account(rpcApiUrl: string, address: string): Promise<AccountResult> {
        let requestUrl = rpcApiUrl + '/v1/accounts/' + address;

        try {
            let ret = await this.httpGet(requestUrl);
            if (ret && ret.data) {
                return ret.data[0] ? ret.data[0] : {};
            } else return null;
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'account: http get error:', err);
            return null;
        }
    }

    // return {} if the account is not activated.
    public async getAccountResource(address: string): Promise<AccountResources> {
        try {
            return await this.tronWeb.trx.getAccountResources(address);
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getAccountResource exception:', err);
            return null;
        }
    }

    // maximum block_timestamp is now if max_timestamp = 0
    public async getTransactions(rpcApiUrl: string, address: string, pageSize: number, max_timestamp = 0): Promise<TronTransaction[]> {
        let requestUrl = rpcApiUrl + '/v1/accounts/' + address + '/transactions?limit=' + pageSize + '&max_timestamp=' + max_timestamp;

        try {
            let ret = await this.httpGet(requestUrl);
            if (ret && ret.data) {
                return ret.data;
            } else return null;
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getTransactions: http get error:', err);
            return null;
        }
    }

    // maximum block_timestamp is now if max_timestamp = 0
    public async getTrc20Transactions(rpcApiUrl: string, address: string, contractAddress: string, pageSize: number, max_timestamp = 0): Promise<TronTRC20Transaction[]> {
        let requestUrl = rpcApiUrl + '/v1/accounts/' + address + '/transactions/trc20?contract_address=' + contractAddress + '&limit=' + pageSize + '&max_timestamp=' + max_timestamp;

        try {
            let ret = await this.httpGet(requestUrl);
            if (ret && ret.data) {
                return ret.data;
            } else return null;
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getTrc20Transactions: http get error:', err);
            return null;
        }
    }

    public async sendrawtransaction(rpcApiUrl: string, signedhex: string): Promise<string> {
        const receipt: SendTransactionResult = await this.tronWeb.trx.sendRawTransaction(signedhex);
        if (receipt.result) {
            return receipt.txid;
        } else {
            if (receipt.message) {
                let message = this.tronWeb.toUtf8(receipt.message);
                throw new Error(message);
            }
            return null;
        }
    }

    public async getTransactionById(rpcApiUrl: string, transactionID: string) {
        let requestUrl = rpcApiUrl + '/wallet/gettransactionbyid';

        let body = JSON.stringify({value: transactionID})
        try {
            return await this.httpPost(requestUrl, body);
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getTransactionById: http get error:', err);
            return null;
        }
    }

    public async getTransactionInfoById(rpcApiUrl: string, transactionID: string): Promise<TronTransactionInfo> {
        let requestUrl = rpcApiUrl + '/wallet/gettransactioninfobyid';

        let body = JSON.stringify({value: transactionID})
        try {
            return await this.httpPost(requestUrl, body);
        }
        catch (err) {
            Logger.error('GlobalTronGridService', 'getTransactionInfoById: http get error:', err);
            return null;
        }
    }

    httpGet(url): Promise<any> {
        let options = {
            headers: {
                'TRON_PRO_API_KEY': this.apikey,
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

    httpPost(url, body: any): Promise<any> {
        let options = {
            headers: this.apikey ? {
                'TRON_PRO_API_KEY': this.apikey,
                "Accept": "application/json",
                "Content-Type": "application/json"
            } :
            {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        }

        return new Promise((resolve, reject) => {
            this.http.post<any>(url, body, options).subscribe((res) => {
                resolve(res);
            }, (err) => {
                Logger.error('GlobalTronGridService', 'http post error:', err);
                reject(err);
            });
        });
    }
}
