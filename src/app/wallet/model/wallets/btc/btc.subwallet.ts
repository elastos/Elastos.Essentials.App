import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { Config } from '../../../config/Config';
import { BTCTransaction } from '../../btc.types';
import { StandardCoinName } from '../../coin';
import { BridgeProvider } from '../../earn/bridgeprovider';
import { EarnProvider } from '../../earn/earnprovider';
import { SwapProvider } from '../../earn/swapprovider';
import { TransactionDetail } from '../../providers/transaction.types';
import { VoteType } from '../../SPVWalletPluginBridge';
import { NetworkWallet } from '../networkwallet';
import { StandardSubWallet } from '../standard.subwallet';


const voteTypeMap = [VoteType.Delegate, VoteType.CRC, VoteType.CRCProposal, VoteType.CRCImpeachment]

/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class BTCSubWallet extends StandardSubWallet<BTCTransaction> {
    private TRANSACTION_LIMIT = 50;
    private legacyAddress: string = null;

    constructor(
        networkWallet: NetworkWallet,
        public rpcApiUrl: string
    ) {
        super(networkWallet, StandardCoinName.BTC);

        this.tokenDecimals = 8;
        this.tokenAmountMulipleTimes = Config.SELAAsBigNumber;
    }

    public async startBackgroundUpdates(): Promise<void> {
        await super.startBackgroundUpdates();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            await this.updateBalance();
        }, 1000);
    }

    public getMainIcon(): string {
        return this.networkWallet.network.logo;
    }

    public getSecondaryIcon(): string {
        return null
    }

    public getFriendlyName(): string {
        return 'BTC';
      }

    public getDisplayTokenName(): string {
        return 'BTC';
    }

    public async createAddress(): Promise<string> {
        if (!this.legacyAddress) {
            let legacyAddresses = await this.masterWallet.walletManager.spvBridge.getLegacyAddresses(this.masterWallet.id, 0, 1, false);
            if (legacyAddresses) {
                this.legacyAddress = legacyAddresses[0];
            }
        }
        return this.legacyAddress;
    }

    public createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gssLimit: string): Promise<any> {
        return Promise.resolve([]);
    }

    protected async getTransactionName(transaction: BTCTransaction, translate: TranslateService): Promise<string> {
        return await '';
    }

    public getAddressCount(internal: boolean): number {
        if (internal) return 0;
        else return 1;
    }

    // public async getTransactionInfo(transaction: TransactionType, translate: TranslateService): Promise<TransactionInfo> {
    //     return await null;
    // }

    public async update() {
        await this.getBalanceByRPC();
    }

    public async updateBalance() {
        await this.getBalanceByRPC();
    }


    /**
     * Check whether the available balance is enough.
     * @param amount unit is SELA
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
        return await this.balance.gt(amount);
    }

    // Ignore gasPrice and gasLimit.
    public async createPaymentTransaction(toAddress: string, amount: number, memo = "", gasPrice: string = null, gasLimit: string = null): Promise<string> {
        return await ''
    }

    public async publishTransaction(transaction: string): Promise<string> {
        let rawTx = await this.masterWallet.walletManager.spvBridge.convertToRawTransaction(
            this.masterWallet.id,
            this.id,
            transaction,
        )

        let txid = await this.sendRawTransaction(this.id as StandardCoinName, rawTx);
        return txid;
    }

    protected async sendRawTransaction(subWalletId: StandardCoinName, payload: string): Promise<string> {
        const param = {
            method: 'sendrawtransaction',
            params: [
                payload
            ],
        };

        let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForRpc(subWalletId);
        const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return await '';
        }
        // The caller need catch the execption.
        return GlobalJsonRPCService.instance.httpPost(rpcApiUrl, param);
    }

    // ********************************
    // Private
    // ********************************

    public async getrawtransaction(subWalletId: StandardCoinName, txidArray: string[]): Promise<any[]> {
        const paramArray = [];
        for (let i = 0, len = txidArray.length; i < len; i++) {
            const txid = txidArray[i];
            const param = {
                method: 'getrawtransaction',
                params: {
                    txid,
                    verbose: true
                },
                id: i.toString()
            };
            paramArray.push(param);
        }

        let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForRpc(subWalletId);
        const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return null;
        }

        let result: any[] = null;
        let retryTimes = 0;
        do {
            try {
                result = await GlobalJsonRPCService.instance.httpPost(rpcApiUrl, paramArray);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < GlobalElastosAPIService.API_RETRY_TIMES);

        // Logger.log('wallet', 'getrawtransaction:', result)
        return result;
    }

    /**
     * Get balance by RPC
     */
    public async getBalanceByRPC() {
        this.balance = await this.getBalanceByAddress();
        Logger.warn('wallet', ' getBalanceByRPC:', this.balance.toString());
        await this.saveBalanceToCache();

        //Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    }

    private async getBalanceByAddress() {
        let legacyAddress = await this.masterWallet.walletManager.spvBridge.getLegacyAddresses(this.masterWallet.id, 0, 1, false);
        Logger.warn("wallet", 'getBalanceByAddress:legacyAddress:', legacyAddress);
        return await GlobalBTCRPCService.instance.balancehistory(this.rpcApiUrl, legacyAddress[0]);
    }

    async getTransactionDetails(txid: string): Promise<TransactionDetail> {
        let details = await this.getrawtransaction(this.id as StandardCoinName, [txid]);
        if (details && details[0].result) {
            return details[0].result;
        } else {
            // Remove error transaction.
            // TODO await this.removeInvalidTransaction(txid);
            return null;
        }
    }

    accMul(arg1, arg2) {
        let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try { m += s1.split(".")[1].length } catch (e) { }
        try { m += s2.split(".")[1].length } catch (e) { }

        return Math.floor(Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m))
    }

    // Main chain and ID chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableEarnProviders(): EarnProvider[] {
        return [];
    }

    // Main chain and ID chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableSwapProviders(): SwapProvider[] {
        return [];
    }

    // Main chain and ID chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableBridgeProviders(): BridgeProvider[] {
        return [];
    }
}
