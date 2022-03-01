import { Logger } from "src/app/logger";
import { GlobalBTCRPCService } from "src/app/services/global.btc.service";
import { BTCOutObj, BTCTransaction } from "../../../btc.types";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { BTCSubWallet } from "../subwallets/btc.subwallet";

const MAX_RESULTS_PER_FETCH = 50;

export class BTCSubWalletProvider<SubWalletType extends AnySubWallet> extends SubWalletTransactionProvider<SubWalletType, BTCTransaction> {

    protected canFetchMore = true;

    private transactions = null;

    constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
        super(provider, subWallet);
    }

    protected getProviderTransactionInfo(transaction: BTCTransaction): ProviderTransactionInfo {
        return {
            cacheKey: this.subWallet.getTransactionsCacheKey(),
            cacheEntryKey: transaction.txid,
            cacheTimeValue: transaction.blockTime,
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
    public async fetchTransactions(subWallet: BTCSubWallet, afterTransaction?: BTCTransaction): Promise<void> {
        let page = 1;
        // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
        if (afterTransaction) {
            let afterTransactionIndex = (await this.getTransactions(subWallet)).findIndex(t => t.blockHash === afterTransaction.blockHash);
            if (afterTransactionIndex) { // Just in case, should always be true but...
                // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
                // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
                page = 1 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
            }
            Logger.log('wallet', 'fetchTransactions page:', page);

            let tokenAddress = await subWallet.createAddress();
            let btcInfo = await GlobalBTCRPCService.instance.address(this.rpcApiUrl, tokenAddress, MAX_RESULTS_PER_FETCH, page);
            if (btcInfo) {
                if (btcInfo.txids.length < MAX_RESULTS_PER_FETCH) {
                    this.canFetchMore = false;
                } else {
                    this.canFetchMore = true;
                }
                if (btcInfo.txids.length > 0) {
                    await this.getRawTransactionByTxid(subWallet, btcInfo.txids);
                }
            }
        } else {
            let txidList = subWallet.getTxidList();
            if (!txidList) return;

            await this.getRawTransactionByTxid(subWallet, txidList);
        }
    }

    private async getRawTransactionByTxid(subWallet: BTCSubWallet, txidList: string[]) {
        if (!txidList) return;

        this.transactions = await this.getTransactions(this.subWallet);

        for (let i = 0; i < txidList.length; i++) {
            let tx: BTCTransaction = this.transactions.find((tx) => {
                return tx.txid === txidList[i];
            })
            // if the transaction status is pending, we need update it.
            if ((!tx) || tx.blockHeight == -1) {
                let transaction = await subWallet.getTransactionDetails(txidList[i]);
                if (transaction) {
                    await this.updateTransactionInfo(subWallet, transaction);
                    this.transactions.push(transaction);
                }
            }
        }

        await this.saveTransactions(this.transactions);
    }

    private async updateTransactionInfo(subWallet: BTCSubWallet, transaction: BTCTransaction) {
        let tokenAddress = await subWallet.createAddress();
        let index = transaction.vin.findIndex(btcinobj => btcinobj.addresses.indexOf(tokenAddress) !== -1);
        let btcoutobjArray: BTCOutObj[] = [];
        if (index !== -1) {
            transaction.direction = TransactionDirection.SENT;
            // TODO: Get all receiving address?
            btcoutobjArray = transaction.vout.filter(btcoutobj => btcoutobj.addresses.indexOf(tokenAddress) === -1);
            if (btcoutobjArray && btcoutobjArray.length > 0) {
                // Set first output address as receiving address.
                transaction.to = btcoutobjArray[0].addresses[0];
            } else {
                // Move: send to self.
                transaction.to = tokenAddress;
                transaction.direction = TransactionDirection.MOVED;
                transaction.realValue = 0;
                return;
            }
        } else {
            transaction.direction = TransactionDirection.RECEIVED;
            // TODO: Get all sending address?
            // Set first inout address as sending address.
            transaction.from = transaction.vin[0].addresses[0];

            btcoutobjArray = transaction.vout.filter(btcoutobj => btcoutobj.addresses.indexOf(tokenAddress) !== -1);
        }

        let totalValue = 0;
        for (let i = 0; i < btcoutobjArray.length; i++) {
            totalValue += parseInt(btcoutobjArray[i].value);
        }
        transaction.realValue = totalValue;
    }
}
