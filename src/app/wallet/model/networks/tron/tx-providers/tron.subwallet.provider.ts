import { lazyTronWebImport } from "src/app/helpers/import.helper";
import { Logger } from "src/app/logger";
import { GlobalTronGridService } from "src/app/services/global.tron.service";
import { TronTransaction } from "../../../tron.types";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { TronSubWallet } from "../subwallets/tron.subwallet";

const MAX_RESULTS_PER_FETCH = 100;

export class TronSubWalletProvider<SubWalletType extends TronSubWallet> extends SubWalletTransactionProvider<SubWalletType, TronTransaction> {
    protected canFetchMore = true;
    private accountAddress = null;
    private tronWeb = null;

    constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
        super(provider, subWallet);

        this.accountAddress = this.subWallet.getCurrentReceiverAddress();

        void this.initTronWebObj();
    }

    async initTronWebObj() {
        // Only used for address format conversion, so don't need apikey and private key.
        const TronWeb = await lazyTronWebImport();
        this.tronWeb = new TronWeb({
            fullHost: 'https://api.trongrid.io/',
            privateKey: '01'
        })
    }

    protected getProviderTransactionInfo(transaction: TronTransaction): ProviderTransactionInfo {
        return {
            cacheKey: this.subWallet.getTransactionsCacheKey(),
            cacheEntryKey: transaction.txID,
            cacheTimeValue: transaction.block_timestamp,
            subjectKey: this.subWallet.id
        };
    }

    public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
        return this.canFetchMore;
    }

    /**
     * Call this when import a new wallet or get the latest transactions.
     * @param timestamp get the transactions after the timestamp
     * @returns
     */
    public async fetchTransactions(subWallet: TronSubWallet, afterTransaction?: TronTransaction): Promise<void> {
        let max_timestamp = 0; // maximum block_timestamp is now if max_timestamp = 0
        if (afterTransaction) {
            max_timestamp = afterTransaction.block_timestamp;
        }

        try {
            let transactions = await GlobalTronGridService.instance.getTransactions(this.rpcApiUrl, this.accountAddress, MAX_RESULTS_PER_FETCH, max_timestamp);
            if (!(transactions instanceof Array)) {
                Logger.warn('wallet', 'TronSubWalletProvider fetchTransactions invalid transactions:', transactions)
                return null;
            }
            if (transactions.length < MAX_RESULTS_PER_FETCH) {
                // Got less results than expected: we are at the end of what we can fetch. remember this
                // (in memory only)
                this.canFetchMore = false;
            }

            this.updateTransactionsInfo(transactions);
            await this.saveTransactions(transactions);
        } catch (e) {
            Logger.error('wallet', 'TronSubWalletProvider fetchTransactions error:', e)
        }
        return null;
    }

    private updateTransactionsInfo(transactions: TronTransaction[]) {
        transactions.forEach(tx => {
            if (tx.raw_data.contract[0].parameter.value) {
                // Hex -> base58 (Txxx)
                tx.from = this.tronWeb.address.fromHex(tx.raw_data.contract[0].parameter.value.owner_address);

                switch (tx.raw_data.contract[0].type) {
                    case "TransferContract":
                        tx.value = tx.raw_data.contract[0].parameter.value.amount.toString();
                        tx.to = this.tronWeb.address.fromHex(tx.raw_data.contract[0].parameter.value.to_address);
                    break;
                    case "TriggerSmartContract":
                        tx.value = '0';
                        tx.to = this.tronWeb.address.fromHex(tx.raw_data.contract[0].parameter.value.contract_address);
                        // TODO: token name, amount
                    break;
                    case "TransferAssetContract":
                        tx.value = '0';
                        tx.to = this.tronWeb.address.fromHex(tx.raw_data.contract[0].parameter.value.contract_address);
                        // TODO: asset name, amount
                    break;
                    default:
                        Logger.warn('wallet', 'TronSubWalletProvider new transaction type', tx);
                    break;
                }

                if (tx.to == this.accountAddress) {
                    tx.direction = TransactionDirection.RECEIVED;
                } else {
                    tx.direction = TransactionDirection.SENT;
                }
            }
        })
    }
}
