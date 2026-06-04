import { Logger } from "src/app/logger";
import { GlobalBTCRPCService } from "src/app/services/global.btc.service";
import { BTCOutObj, BTCTransaction } from "../../../btc.types";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { BTCSubWallet } from "../subwallets/btc.subwallet";

const MAX_RESULTS_PER_FETCH = 50;

/**
 * True if this output pays an address that is also spent by an input of the same tx
 * (intra-wallet shuffle / consolidation). Those outputs must not count as "sent to external".
 */
function isOutputToVinSourceAddress(transaction: BTCTransaction, btcoutobj: BTCOutObj): boolean {
    if (!btcoutobj.addresses || btcoutobj.addresses.length === 0) {
        return false;
    }
    return btcoutobj.addresses.some(outAddr =>
        transaction.vin.some(vin =>
            vin.addresses && vin.addresses.indexOf(outAddr) !== -1
        )
    );
}

/** Net satoshis leaving this address in the tx (inputs spent − outputs received back to same address). */
function getNetValueSatoshisForAddress(transaction: BTCTransaction, tokenAddress: string): number {
    let inputSum = 0;
    for (const vin of transaction.vin) {
        if (vin.addresses && vin.addresses.indexOf(tokenAddress) !== -1) {
            const v = parseInt(vin.value || "0", 10);
            if (!isNaN(v)) {
                inputSum += v;
            }
        }
    }
    let outputSum = 0;
    for (const vout of transaction.vout) {
        if (vout.addresses && vout.addresses.indexOf(tokenAddress) !== -1) {
            const v = parseInt(vout.value || "0", 10);
            if (!isNaN(v)) {
                outputSum += v;
            }
        }
    }
    const net = inputSum - outputSum;
    return net > 0 ? net : 0;
}

function allVoutsPayOnlyToAddress(transaction: BTCTransaction, tokenAddress: string): boolean {
    return transaction.vout.every(
        vo => vo.addresses && vo.addresses.indexOf(tokenAddress) !== -1
    );
}

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

    public getInitialFetchSize(): number {
        return MAX_RESULTS_PER_FETCH;
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

            let tokenAddress = subWallet.getCurrentReceiverAddress();
            let rpcApiUrl = this.subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.NOWNODE_EXPLORER);
            let btcInfo = await GlobalBTCRPCService.instance.address(rpcApiUrl, tokenAddress, MAX_RESULTS_PER_FETCH, page);
            if (btcInfo) {
                if (btcInfo.txids.length < MAX_RESULTS_PER_FETCH) {
                    this.canFetchMore = false;
                } else {
                    this.canFetchMore = true;
                }
                if (btcInfo.txids.length > 0) {
                    await this.getRawTransactionByTxid(subWallet, btcInfo.txids, false);
                }
            }
        } else {
            let txidList = subWallet.getTxidList();
            if (!txidList) return;

            await this.getRawTransactionByTxid(subWallet, txidList, true);
        }
    }

    private async getRawTransactionByTxid(subWallet: BTCSubWallet, txidList: string[], isNewestFetch: boolean) {
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
                    this.updateTransactionInfo(subWallet, transaction);
                    this.transactions.push(transaction);
                }
            }
        }

        await this.saveTransactions(this.transactions, isNewestFetch);
    }

    private updateTransactionInfo(subWallet: BTCSubWallet, transaction: BTCTransaction) {
        let tokenAddress = subWallet.getCurrentReceiverAddress();
        let index = transaction.vin.findIndex(btcinobj => btcinobj.addresses.indexOf(tokenAddress) !== -1);
        let btcoutobjArray: BTCOutObj[] = [];
        if (index !== -1) {
            transaction.direction = TransactionDirection.SENT;
            // TODO: Get all receiving address?
            btcoutobjArray = transaction.vout.filter(btcoutobj => btcoutobj.addresses.indexOf(tokenAddress) === -1);
            // Drop outputs that pay an address also spent in this tx (multi-address consolidation / self paths).
            btcoutobjArray = btcoutobjArray.filter(btcoutobj => !isOutputToVinSourceAddress(transaction, btcoutobj));
            if (btcoutobjArray && btcoutobjArray.length > 0) {
                // Set first output address as receiving address.
                transaction.to = btcoutobjArray[0].addresses[0];
            } else if (allVoutsPayOnlyToAddress(transaction, tokenAddress)) {
                // Every output pays only this address (e.g. change-only): moved / send to self.
                transaction.to = tokenAddress;
                transaction.direction = TransactionDirection.MOVED;
                transaction.realValue = 0;
                return;
            } else {
                // Multi-address consolidation: not "moved"; show as sent with net outflow for this address (usually fee).
                transaction.direction = TransactionDirection.SENT;
                transaction.realValue = getNetValueSatoshisForAddress(transaction, tokenAddress);
                const otherOut = transaction.vout.find(
                    vo => vo.addresses && vo.addresses.indexOf(tokenAddress) === -1
                );
                transaction.to =
                    otherOut && otherOut.addresses && otherOut.addresses.length > 0
                        ? otherOut.addresses[0]
                        : tokenAddress;
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
