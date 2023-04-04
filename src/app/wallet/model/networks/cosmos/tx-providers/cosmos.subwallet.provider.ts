import moment from "moment";
import { Logger } from "src/app/logger";
import { GlobalCosmosService } from "src/app/services/global.cosmos.service";
import { CosmosTransaction } from "../../../cosmos.types";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { CosmosSafe } from "../safes/cosmos.safe";

const MAX_RESULTS_PER_FETCH = 15;

export class CosmosSubWalletProvider<SubWalletType extends AnySubWallet> extends SubWalletTransactionProvider<SubWalletType, CosmosTransaction> {
    protected canFetchMore = true;
    private accountAddress = null;

    constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, private apiKey?: string) {
        super(provider, subWallet);

        this.accountAddress = this.subWallet.getCurrentReceiverAddress();
    }

    protected getProviderTransactionInfo(transaction: CosmosTransaction): ProviderTransactionInfo {
        return {
            cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + this.subWallet.id + "-transactions",
            cacheEntryKey: transaction.hash,
            cacheTimeValue: transaction.height,
            subjectKey: this.subWallet.id
        };
    }

    public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
        return this.canFetchMore;
    }

    public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: CosmosTransaction): Promise<void> {
        let page = 1;
        // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
        if (afterTransaction) {
        let afterTransactionIndex = (await this.getTransactions(subWallet)).findIndex(t => t.hash === afterTransaction.hash);
        if (afterTransactionIndex) { // Just in case, should always be true but...
            // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
            // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
            page = 1 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
        }
        }

        try {
            // Logger.warn('wallet', 'fetchTransactions txListUrl:', txListUrl)
            let transactions = await (this.subWallet.networkWallet.safe as unknown as CosmosSafe).searchTx() as CosmosTransaction[];
            Logger.warn('wallet', 'fetchTransactions:', transactions);
            if (!(transactions instanceof Array)) {
                Logger.warn('wallet', 'TronSubWalletProvider fetchTransactions invalid transactions:', transactions)
                return null;
            }
            if (transactions.length < MAX_RESULTS_PER_FETCH) {
                // Got less results than expected: we are at the end of what we can fetch. remember this
                // (in memory only)
                this.canFetchMore = false;
            }

            await this.updateTransactionsInfo(transactions);
            await this.saveTransactions(transactions);
        } catch (e) {
            Logger.error('wallet', 'CosmosSubWalletProvider fetchTransactions error:', e)
        }
        return null;
    }

    private async updateTransactionsInfo(transactions: CosmosTransaction[]) {
        for (let index = 0; index < transactions.length; index++) {
            let tx = transactions[index];
            let rawLogObj = JSON.parse(tx.rawLog);
            if (rawLogObj[0] && rawLogObj[0].events) {
                let transfer = rawLogObj[0].events.find( e => e.type == 'transfer')
                if (transfer) {
                    let to = transfer.attributes.find( a => a.key == 'recipient')
                    tx.to = to.value;

                    let from = transfer.attributes.find( a => a.key == 'sender')
                    tx.from = from.value;

                    let value = transfer.attributes.find( a => a.key == 'amount')
                    // convert '10000uatom' to '10000'
                    tx.value = parseInt(value.value).toString();
                } else {
                    tx.to = '';
                    tx.from = '';
                    tx.value = '';
                }

                if (tx.to == this.accountAddress) {
                    tx.direction = TransactionDirection.RECEIVED;
                } else {
                    tx.direction = TransactionDirection.SENT;

                    for (let i = 0; i < tx.events.length; i++) {
                        if (tx.events[i].type == 'tx') {
                            let fee = tx.events[i].attributes.find( a => a.key == 'fee');
                            if (fee) {
                                // convert '10000uatom' to '10000'
                                tx.fee = parseInt(fee.value).toString();
                                break;
                            }
                        }
                    }
                }
            }

            let block = await GlobalCosmosService.instance.getBlock(tx.height);
            tx.timestamp = moment(block.header.time).valueOf();
        }
    }
}