import { Injectable } from '@angular/core';
import { Logger } from '../logger';
import { GlobalJsonRPCService } from './global.jsonrpc.service';
import { GlobalNetworksService, MAINNET_TEMPLATE } from './global.networks.service';
import { UnisatResponse, UnisatUtxo, UnisatUtxoData } from '../wallet/model/unisat.types';


@Injectable({
    providedIn: 'root'
})
export class GlobalUnisatApiService {
    public static instance: GlobalUnisatApiService = null;
    private rpcApiUrl = 'https://escription.io/unisat-api';

    constructor(private globalJsonRPCService: GlobalJsonRPCService) {
        GlobalUnisatApiService.instance = this;
    }

    init() {
        let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
        if (network !== MAINNET_TEMPLATE) {
            this.rpcApiUrl = 'https://testnet.escription.io/unisat-api/v1';
        } else {
            this.rpcApiUrl = 'https://escription.io/unisat-api/v1';
        }

        // Register a limitator to limit api requests speed. Mostly because of the free API key
        // rate limitation: 5 calls/second on the free tier.
        GlobalJsonRPCService.instance.registerLimitator('unisat', {
            minRequestsInterval: 300 // 5 req per sec max = 1 request / 200 ms + some margin
        });
    }

    // Get inscription UTXO list by address
    // Only supports taproot address
    public async getInscriptionUTXO(address: string, startIndex = 0, size = 100): Promise<UnisatUtxoData> {
        let requestUrl = this.rpcApiUrl + '/indexer/address/' + address +'/inscription-utxo-data?cursor=' + startIndex + '&size=' + size;

        try {
            let result: UnisatResponse = await this.globalJsonRPCService.httpGet(requestUrl);
            Logger.warn('wallet', 'getInscriptionUTXO:', result?.data);
            return result?.data;
        }
        catch (err) {
            Logger.error('GlobalUnisatApiService', 'getInscriptionUTXO: http get error:', err);
            return null;
        }
    }

    // Get non inscription UTXO list by address
    // Only supports taproot address
    public async getBTCUTXO(address: string, startIndex = 0, size = 100): Promise<UnisatUtxoData> {
        let requestUrl = this.rpcApiUrl + '/indexer/address/' + address +'/utxo-data?cursor=' + startIndex + '&size=' + size;

        try {
            let result: UnisatResponse = await this.globalJsonRPCService.httpGet(requestUrl);
            return result?.data;
        }
        catch (err) {
            Logger.error('GlobalUnisatApiService', 'getBTCUTXO: http get error:', err);
            return null;
        }
    }
}
