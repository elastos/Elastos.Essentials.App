/*
 * Copyright (c) 2020 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import BigNumber from 'bignumber.js';
import Queue from 'promise-queue';
import { Subscription } from 'rxjs';
import { lazyTronWebImport } from 'src/app/helpers/import.helper';
import { Logger } from 'src/app/logger';
import { JsonSerializer } from 'typescript-json-serializer';
import { TokenType, TRC20Coin } from '../../model/coin';
import type { EVMNetwork } from '../../model/networks/evms/evm.network';
import { ERCTokenInfo } from '../../model/networks/evms/evm.types';
import { AnyNetwork } from '../../model/networks/network';
import { TronNetworkBase } from '../../model/networks/tron/network/tron.base.network';
import { TimeBasedPersistentCache } from '../../model/timebasedpersistentcache';
import { AccountTRC20Token } from '../../model/tron.types';
import { WalletNetworkService } from '../network.service';

export const trc20CoinsSerializer = new JsonSerializer();

export type TRC20CoinInfo = {
    coinName: string;
    coinSymbol: string;
    coinDecimals: number;
}
@Injectable({
    providedIn: 'root'
})
export class TRC20CoinService {
    public static instance: TRC20CoinService = null;

    private tronWeb = null;

    private fetchTRC20OpsQueue = new Queue(1);
    private coinTransactionInfoCache: TimeBasedPersistentCache<TRC20CoinInfo> = null;

    private activeNetworkSubscription: Subscription = null;

    constructor(private networkService: WalletNetworkService) {
        TRC20CoinService.instance = this;
    }

    public async init(): Promise<void> {
        this.activeNetworkSubscription = this.networkService.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork instanceof TronNetworkBase) {
              void this.initTronWeb();
            }
        })
    }

    public stop() {
        if (this.activeNetworkSubscription) {
            this.activeNetworkSubscription.unsubscribe();
        }
    }

    private async initTronWeb() {
        if (this.tronWeb) return;

        const TronWeb = await lazyTronWebImport();
        this.tronWeb = new TronWeb({
            fullHost: this.networkService.activeNetwork.value.getRPCUrl()
        })

        this.coinTransactionInfoCache = await TimeBasedPersistentCache.loadOrCreate('trc20coinsinfo', false, 500);
    }

    public async getCoinDecimals(network: AnyNetwork, address: string): Promise<number> {
        let contractHandler = await this.tronWeb.contract().at(address);
        this.tronWeb.setAddress(address);

        let coinDecimals = parseInt(await contractHandler.decimals().call());
        Logger.log('wallet', 'Coin decimals:', coinDecimals);
        return coinDecimals;
    }

    public async getCoinInfo(network: AnyNetwork, address: string): Promise<TRC20CoinInfo> {
        await this.initTronWeb()

        // Fetch only one token at a time
        return this.fetchTRC20OpsQueue.add(async () => {
            // Try to find in cache
            let cacheKey = `${network.key}_${address}`;
            let cacheEntry = await this.coinTransactionInfoCache.get(cacheKey);
            if (cacheEntry)
                return cacheEntry.data;

            try {
                let contractHandler = await this.tronWeb.contract().at(address);
                this.tronWeb.setAddress(address);

                const coinName = await contractHandler.name().call();
                Logger.log('wallet', 'Coin name:', coinName);

                const coinSymbol = await contractHandler.symbol().call();
                Logger.log('wallet', 'Coin symbol:', coinSymbol);

                const coinDecimals = parseInt(await contractHandler.decimals().call());
                Logger.log('wallet', 'Coin decimals:', coinDecimals);

                let coinInfo: TRC20CoinInfo = { coinName, coinSymbol, coinDecimals };

                // Save to cache
                this.coinTransactionInfoCache.set(cacheKey, coinInfo);
                void this.coinTransactionInfoCache.save();

                return coinInfo;
            } catch (err) {
                Logger.warn('wallet', 'getCoinInfo', err);
                return null;
            }
        });
    }

    public async getCoinInfos(network: AnyNetwork, tokens: AccountTRC20Token[]): Promise<ERCTokenInfo[]> {
        let coinInfos : ERCTokenInfo[] = [];
        if (!tokens) return coinInfos;
        for (let i = 0; i < tokens.length; i++) {
            let contractAddresses = Object.keys(tokens[i])[0];
            let coinInfo = await this.getCoinInfo(network, contractAddresses);
            if (coinInfo)  {
                let tokenInfo: ERCTokenInfo = {
                    type: TokenType.TRC_20,
                    symbol: coinInfo.coinSymbol,
                    name: coinInfo.coinName,
                    decimals: coinInfo.coinDecimals.toString(),
                    contractAddress: contractAddresses,
                    balance: '',
                    hasOutgoTx: false,
                }
                coinInfos.push(tokenInfo);
            }
        }
        return coinInfos;
    }

    public async getTRC20Coin(network: AnyNetwork, address: string): Promise<TRC20Coin> {
        const coinInfo = await this.getCoinInfo(network, address);
        if (!coinInfo)
            return null;

        const newCoin = new TRC20Coin(network, coinInfo.coinSymbol, coinInfo.coinName, address, coinInfo.coinDecimals, false);
        return newCoin;
    }

    /**
     * Estimated cost in native coin readable amount, of a TRC20 transfer cost.
     */
    public async estimateTRC20TransferTransactionFees(tokenAddress: string, senderAddress: string, network: EVMNetwork): Promise<BigNumber> {
        if (!tokenAddress || tokenAddress === "") {
            throw new Error("Cannot compute ERC20 transfer cost with an undefined token contract address");
        }
        throw new Error("Method not implemented.");
    }

    /**
     * Fetches the TRC20 balance of a TRC20 contract for a given address
     */
    public async fetchTRC20TokenBalance(network: EVMNetwork, tokenAddress: string, walletAddress: string): Promise<BigNumber> {
        try {
            let contractHandler = await this.tronWeb.contract().at(tokenAddress);
            this.tronWeb.setAddress(tokenAddress);

            const rawBalance = await contractHandler.balanceOf(walletAddress).call();
            if (rawBalance) {
                return new BigNumber(rawBalance);
            }
        } catch (error) {
            Logger.log('wallet', 'Failed to retrieve TRC20 token balance', network, tokenAddress, walletAddress, error);
            return new BigNumber(0);
        }
    }
}
