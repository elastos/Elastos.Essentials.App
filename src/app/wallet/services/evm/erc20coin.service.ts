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
import { Logger } from 'src/app/logger';
import { ERC20Coin } from '../../model/coin';
import type { EVMNetwork } from '../../model/networks/evms/evm.network';
import { AnyNetwork } from '../../model/networks/network';
import { TimeBasedPersistentCache } from '../../model/timebasedpersistentcache';
import { WalletNetworkService } from '../network.service';
import { WalletPrefsService } from '../pref.service';
import { EVMService } from './evm.service';

export type ERC20CoinInfo = {
    coinName: string;
    coinSymbol: string;
    coinDecimals: number;
}
@Injectable({
    providedIn: 'root'
})
export class ERC20CoinService {
    public static instance: ERC20CoinService = null;

    /** Web3 variables to call smart contracts */
    private erc20ABI: any;

    // Addresses to test
    // 0xe125585c7588503927c0b733a9ebd3b8af0a940d
    // 0xdeeddbe67ff585af58622c904b04fca615ffe8aa
    // 0xa438928dbad409fd927029156542aa7b466508d9

    private fetchERC20OpsQueue = new Queue(1);
    private coinTransactionInfoCache: TimeBasedPersistentCache<ERC20CoinInfo> = null;

    constructor(private prefs: WalletPrefsService,
        private evmService: EVMService,
        private networkService: WalletNetworkService) {
        ERC20CoinService.instance = this;
    }

    public async init(): Promise<void> {
        // Standard ERC20 contract ABI
        this.erc20ABI = require('../../../../assets/wallet/ethereum/StandardErc20ABI.json');

        this.coinTransactionInfoCache = await TimeBasedPersistentCache.loadOrCreate('erc20coinsinfo', false, 500);
    }

    public async getCoinDecimals(network: AnyNetwork, address: string): Promise<number> {
        let coinDecimals = 0;
        const erc20Contract = new ((await this.evmService.getWeb3(network)).eth.Contract)(this.erc20ABI, address);
        if (erc20Contract) {
            coinDecimals = await erc20Contract.methods.decimals().call();
            Logger.log('wallet', 'Coin decimals:', coinDecimals);
        }
        return coinDecimals;
    }

    public getCoinInfo(network: AnyNetwork, address: string): Promise<ERC20CoinInfo> {
        // Fetch only one token at a time
        return this.fetchERC20OpsQueue.add(async () => {
            // Try to find in cache
            let cacheKey = `${network.key}_${address}`;
            let cacheEntry = await this.coinTransactionInfoCache.get(cacheKey);
            if (cacheEntry)
                return cacheEntry.data;

            try {
                const erc20Contract = new ((await this.evmService.getWeb3(network)).eth.Contract)(this.erc20ABI, address, /* { from: ethAccountAddress } */);
                //Logger.log('wallet', 'erc20Contract', erc20Contract);

                const coinName = await erc20Contract.methods.name().call();
                Logger.log('wallet', 'Coin name:', coinName);

                const coinSymbol = await erc20Contract.methods.symbol().call();
                Logger.log('wallet', 'Coin symbol:', coinSymbol);

                const coinDecimals = parseInt(await erc20Contract.methods.decimals().call());
                Logger.log('wallet', 'Coin decimals:', coinDecimals);

                let coinInfo: ERC20CoinInfo = { coinName, coinSymbol, coinDecimals };

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

    public async getERC20Coin(network: AnyNetwork, address: string): Promise<ERC20Coin> {
        const coinInfo = await this.getCoinInfo(network, address);
        const newCoin = new ERC20Coin(coinInfo.coinSymbol, coinInfo.coinName, address, coinInfo.coinDecimals, this.prefs.getNetworkTemplate(), false);
        return newCoin;
    }

    /**
     * Estimated cost in native coin readable amount, of a ERC20 transfer cost.
     *
     * Important: this method works only if the wallet has at least some of this ERC20 token in the wallet,
     * as this simulates a real transfer. Without tokens in the wallet, the returned estimation is lower
     * than the reality (simulates no real transfer on chain).
     */
    public async estimateERC20TransferTransactionFees(tokenAddress: string, senderAddress: string, network: EVMNetwork): Promise<BigNumber> {
        if (!tokenAddress || tokenAddress === "") {
            throw new Error("Cannot compute ERC20 transfer cost with an undefined token contract address");
        }

        let gasPrice = await this.evmService.getGasPrice(network);
        //Logger.log("redpackets", "gasPrice", gasPrice);

        /**
         * IMPORTANT NOTES:
         * We use a fake amount of 1 token (minimal value after decimals conversion) just to estimate
         * the transfer cost.
         * 0 doesn't simulate a transaction creation so the gas estimation is wrong. Must be >0
         *
         * We use the real token owner address because cost estimation works only when "from" actually owns
         * tokens. Otherwise, it simulates a "failed transfer / not enough tokens" call.
         */
        let fromAddress = senderAddress;
        let toAddress = "0x298163B65453Dcd05418A9a5333E4605eDA6D998"; // Fake address, doesn't impact the transfer cost
        let web3 = await EVMService.instance.getWeb3(network);
        const erc20Contract = new web3.eth.Contract(this.erc20ABI, tokenAddress, { from: fromAddress });
        const method = erc20Contract.methods.transfer(toAddress, web3.utils.toBN(1));

        let gasLimit = '3000000'; // Fallback default gas limit value
        try {
            // Estimate gas cost
            let gasTemp = await method.estimateGas();
            // '* 1.5': Make sure the gaslimit is big enough - add a bit of margin for fluctuating gas price
            gasLimit = Math.ceil(gasTemp * 1.5).toString();
        } catch (error) {
            Logger.error("redpackets", 'estimateGas error:', error);
        }

        //Logger.log("redpackets","gasLimit", gasLimit);

        let transactionFees = EVMService.instance.getTransactionFees(gasLimit, gasPrice);
        //Logger.debug("redpackets","transactionFees", transactionFees.toNumber());

        return transactionFees;
    }

    /**
     * Fetches the ERC20 balance of a ERC20 contract for a given address
     */
    public async fetchERC20TokenBalance(network: EVMNetwork, tokenAddress: string, walletAddress: string): Promise<BigNumber> {
        try {
            const erc20Contract = new (await this.evmService.getWeb3(network)).eth.Contract(this.erc20ABI, tokenAddress, { from: walletAddress });

            const rawBalance = await erc20Contract.methods.balanceOf(walletAddress).call();
            if (rawBalance) {
                return new BigNumber(rawBalance);
            }
        } catch (error) {
            Logger.log('wallet', 'Failed to retrieve ERC20 token balance', network, tokenAddress, walletAddress, error);
            return new BigNumber(0);
        }
    }
}
