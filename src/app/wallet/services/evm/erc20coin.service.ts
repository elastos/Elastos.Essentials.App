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
import { sleep } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { Contract } from 'web3-eth-contract';
import { ERC20Coin } from '../../model/coin';
import type { EVMNetwork } from '../../model/networks/evms/evm.network';
import { EVMSafe } from '../../model/networks/evms/safes/evm.safe';
import { AnyMainCoinEVMSubWallet } from '../../model/networks/evms/subwallets/evm.subwallet';
import { AnyNetwork } from '../../model/networks/network';
import { AddressUsage } from '../../model/safes/addressusage';
import { TimeBasedPersistentCache } from '../../model/timebasedpersistentcache';
import { Transfer } from '../cointransfer.service';
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
        this.erc20ABI = (await import('../../../../assets/wallet/ethereum/StandardErc20ABI.json')).default;

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

    public async getErc20Contract(network: EVMNetwork, contractAddress: string, signerWalletAddress: string): Promise<Contract> {
        return new (await this.evmService.getWeb3(network)).eth.Contract(this.erc20ABI, contractAddress, { from: signerWalletAddress });
    }

    /**
     * Generic method to increase ERC20 token spending allowance for a given token for a given third party.
     *
     * @param amount Chain amount format
     *
     * @return true if the allowance could successfully be upgraded to a valid level, false otherwise.
     */
    public async approveSpendingIfNeeded(mainCoinSubWallet: AnyMainCoinEVMSubWallet, erc20ContractAddress: string, erc20TokenDecimals: number, allowedAddress: string, chainAmount: BigNumber): Promise<boolean> {
        let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);
        let network = mainCoinSubWallet.networkWallet.network;

        const tokenContract = await this.getErc20Contract(network, erc20ContractAddress, accountAddress);

        try {
            let allowance = <string>await tokenContract.methods.allowance(accountAddress, allowedAddress).call();
            const allowanceBN = new BigNumber(allowance);

            Logger.log("wallet", "Current allowance:", allowance, erc20ContractAddress, erc20TokenDecimals, "to:", allowedAddress);

            if (allowanceBN.lt(chainAmount)) {
                await this.setSpendingApproval(mainCoinSubWallet, erc20ContractAddress, erc20TokenDecimals, allowedAddress, chainAmount);

                // Wait for block validation
                await sleep(20000); // 10 seconds not enough

                // Check allowance
                allowance = await tokenContract.methods.allowance(accountAddress, allowedAddress).call();
                Logger.log("wallet", "New allowance after approval:", allowance, erc20ContractAddress, erc20TokenDecimals, "Allowed address:", allowedAddress);

                return allowanceBN.gte(chainAmount);
            }
            else {
                // Already ok
                return true;
            }
        } catch (error) {
            Logger.error("easybridge", "Increase ERC20 allowance error:", error);
            return false;
        }
    }

    public async setSpendingApproval(mainCoinSubWallet: AnyMainCoinEVMSubWallet, erc20ContractAddress: string, erc20TokenDecimals: number, allowedAddress: string, chainAmount: BigNumber) {
        let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);
        let network = mainCoinSubWallet.networkWallet.network;

        // Allowance is not enough (0 or too low), increase it
        const tokenContract = await this.getErc20Contract(network, erc20ContractAddress, accountAddress);

        Logger.log("wallet", "Increasing ERC20 token spending allowance", erc20ContractAddress, erc20TokenDecimals, chainAmount.toString(10));

        const approveMethod = await tokenContract.methods.approve(allowedAddress, chainAmount);

        const { gasLimit, nonce } = await this.evmService.methodGasAndNonce(approveMethod, network, accountAddress, "0");

        Logger.log("wallet", "Getting gas price");
        const gasPrice = await this.evmService.getGasPrice(network);

        let safe = <EVMSafe><unknown>mainCoinSubWallet.networkWallet.safe;
        let unsignedTx = await safe.createContractTransaction(erc20ContractAddress, "0", gasPrice, gasLimit, nonce, approveMethod.encodeABI());

        Logger.log("wallet", "Signing and sending transaction", unsignedTx);
        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: mainCoinSubWallet.networkWallet.masterWallet.id,
            subWalletId: mainCoinSubWallet.id,
        });
        let sendResult = await mainCoinSubWallet.signAndSendRawTransaction(unsignedTx, transfer, false, false, false);
        Logger.log("wallet", "Transaction result:", sendResult);
    }

    /**
     * From a human readable amount (short) to a chain amount (long)
     */
    public toChainHexAmount(readableAmount: BigNumber, decimals = 18): string {
        return '0x' + readableAmount.times(new BigNumber(10).pow(decimals)).toString(16);
    }

    public toChainAmount(readableAmount: BigNumber, decimals = 18): BigNumber {
        return readableAmount.times(new BigNumber(10).pow(decimals));
    }

    /**
     * From a chain amount (long) to a human readable amount (short)
     */
    public toHumanReadableAmount(chainAmount: string | BigNumber, decimals = 18): BigNumber {
        return new BigNumber(chainAmount).dividedBy(new BigNumber(10).pow(decimals));
    }
}
