import { Injectable } from '@angular/core';
import { fromHex } from '@cosmjs/encoding';
import { Coin, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { Block, GasPrice, IndexedTx, SearchTxFilter, SigningStargateClient } from '@cosmjs/stargate';
import { Logger } from '../logger';
import { NetworkAPIURLType } from '../wallet/model/networks/base/networkapiurltype';
import { CosmosNetwork } from '../wallet/model/networks/cosmos/cosmos.network';
import { WalletNetworkService } from '../wallet/services/network.service';
import { GlobalJsonRPCService } from './global.jsonrpc.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalCosmosService {
    public static instance: GlobalCosmosService = null;

    private signingStargateClient = null;
    private cosmosHubUrl = 'https://chains.cosmos.directory/cosmoshub';

    constructor() {
        GlobalCosmosService.instance = this;
    }

    init() {
        WalletNetworkService.instance.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork instanceof CosmosNetwork) {
              void this.initCosmosClient();
            }
        })
    }

    private async initCosmosClient() {
        if (this.signingStargateClient) return;

        let rpcUrl = WalletNetworkService.instance.activeNetwork.value.getAPIUrlOfType(NetworkAPIURLType.RPC);

        const defaultPrivkey = fromHex("b8c462d2bb0c1a92edf44f735021f16c270f28ee2c3d1cb49943a5e70a3c763e");
        let wallet = await DirectSecp256k1Wallet.fromKey(defaultPrivkey);
        this.signingStargateClient = await SigningStargateClient.connectWithSigner(
                rpcUrl, wallet, { gasPrice: GasPrice.fromString('0.025uatom') });
    }

    /**
     * Get balances.
     */
    public async getAllBalances(address: string): Promise<readonly Coin[]> {
        try {
            return await this.signingStargateClient.getAllBalances(address);
        }
        catch (err) {
            Logger.error('GlobalCosmosService', 'getAllBalances exception:', err);
            return null;
        }
    }

    public async getBlock(height: number): Promise<Block> {
        try {
            return await this.signingStargateClient.getBlock(height);
        }
        catch (err) {
            Logger.error('GlobalCosmosService', 'getBlock exception:', err);
            return null;
        }
    }

    public async getTransaction(id: string): Promise<IndexedTx> {
        try {
            return await this.signingStargateClient.getTx(id);
        }
        catch (err) {
            Logger.error('GlobalCosmosService', 'getTransaction exception:', err);
            return null;
        }
    }

    public async getTransactions(address: string, filter?: SearchTxFilter): Promise<IndexedTx[]> {
        try {
            return await this.signingStargateClient.searchTx({ sentFromOrTo: address}, filter)
        }
        catch (err) {
            Logger.error('GlobalCosmosService', 'getTransactions exception:', err);
            return null;
        }
    }

    public async getAtomPrice() {
        try {
            let result = await GlobalJsonRPCService.instance.httpGet(this.cosmosHubUrl);
            if (result) {
                return result.chain.prices.coingecko.atom.usd;
            }
        } catch (err) {
            Logger.warn('GlobalCosmosService', 'getAtomPrice exception:', err);
        }
        Logger.warn('GlobalCosmosService', 'getAtomPrice can not get the atom price!');
        return null;
    }
}
