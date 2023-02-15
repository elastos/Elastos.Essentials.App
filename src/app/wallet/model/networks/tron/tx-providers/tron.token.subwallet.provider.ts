import { Logger } from "src/app/logger";
import { GlobalTronGridService } from "src/app/services/global.tron.service";
import { TronTRC20Transaction } from "../../../tron.types";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { TRC20SubWallet } from "../subwallets/trc20.subwallet";
import { TronSubWallet } from "../subwallets/tron.subwallet";

const MAX_RESULTS_PER_FETCH = 100

export class TronSubWalletTokenProvider<SubWalletType extends TronSubWallet> extends SubWalletTransactionProvider<SubWalletType, TronTRC20Transaction> {
    protected canFetchMore = true;
    private accountAddress = null;

    constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
        super(provider, subWallet);

        this.accountAddress = this.subWallet.getCurrentReceiverAddress();
    }

    protected getProviderTransactionInfo(transaction: TronTRC20Transaction): ProviderTransactionInfo {
        return {
        cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.token_info.address + "-transactions",
        cacheEntryKey: transaction.transaction_id,
        cacheTimeValue: transaction.block_timestamp,
        subjectKey: transaction.token_info.address
        };
    }

    public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
        return this.canFetchMore;
    }

    public async fetchTransactions(trc20SubWallet: TRC20SubWallet, afterTransaction?: TronTRC20Transaction): Promise<void> {
        let max_timestamp = 0; // maximum block_timestamp is now if max_timestamp = 0
        if (afterTransaction) {
            max_timestamp = afterTransaction.block_timestamp;
        }

        let contractAddress = trc20SubWallet.coin.getContractAddress();

        try {
            let transactions = await GlobalTronGridService.instance.getTrc20Transactions(this.rpcApiUrl, this.accountAddress, contractAddress, MAX_RESULTS_PER_FETCH, max_timestamp);
            Logger.warn('wallet', 'TronSubWalletTokenProvider transactions:', transactions)
            if (!(transactions instanceof Array)) {
                Logger.warn('wallet', 'TronSubWalletTokenProvider fetchTransactions invalid transactions:', transactions)
                return null;
            }
            if (transactions.length < MAX_RESULTS_PER_FETCH) {
                // Got less results than expected: we are at the end of what we can fetch. remember this
                // (in memory only)
                this.canFetchMore = false;
            }

            // this.updateTransactionsInfo(transactions);
            await this.saveTransactions(transactions);
        } catch (e) {
            Logger.error('wallet', 'TronSubWalletTokenProvider fetchTransactions error:', e)
        }
        return null;
    }
}