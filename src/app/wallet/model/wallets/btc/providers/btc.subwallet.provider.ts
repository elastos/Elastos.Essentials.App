import { btcoutobj, BTCTransaction } from "../../../btc.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { ElastosTransaction, TransactionDirection } from "../../../providers/transaction.types";
import { AnySubWallet, SubWallet } from "../../subwallet";
import { BTCSubWallet } from "../btc.subwallet";

export class BTCSubWalletProvider<SubWalletType extends SubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, ElastosTransaction> {
  private MAX_RESULTS_PER_FETCH = 10;

  protected canFetchMore = true;

  private transactions = null;
  private txidList: string[] = null;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, protected rpcApiUrl: string) {
    super(provider, subWallet);
  }

  protected getProviderTransactionInfo(transaction: ElastosTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.getTransactionsCacheKey(),
      cacheEntryKey: transaction.txid,
      cacheTimeValue: transaction.time,
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
    await this.getRawTransaction(subWallet);

    return null;
  }

  private async getRawTransaction(subWallet: BTCSubWallet) {
    this.txidList = subWallet.getTxidList();
    if (!this.txidList) return;

    this.transactions = await this.getTransactions(this.subWallet);

    // TODO: Do not need to get all transactions.
    for (let i = 0; i < this.txidList.length; i++) {
        let tx = this.transactions.find((tx) => {
            return tx.txid === this.txidList[i];
        })

        // if the transaction status is pending, we need update it.
        if ((!tx) || !tx.time) {
            let transaction = await subWallet.getTransactionDetails(this.txidList[i]);
            await this.parseTransaction(subWallet, transaction);
            this.transactions.push(transaction)
        }
    }

    await this.saveTransactions(this.transactions);
  }

  // Get value, send or receive, fee
  private async parseTransaction(subWallet: BTCSubWallet, transaction: BTCTransaction) {
    await this.getTransactionType(subWallet, transaction);
    await this.updateTransactionInfo(subWallet, transaction);
  }

  private async getTransactionType(subWallet: BTCSubWallet, transaction: BTCTransaction) {
    let transactionOfInput: BTCTransaction = null;
    for (let i = 0; i < transaction.vin.length; i++) {
        let index = this.txidList.indexOf(transaction.vin[i].txid);
        if (index != -1) {
            transactionOfInput = this.transactions.find((tx) => {
                return tx.txid === transaction.vin[i].txid;
            })
        }
    }

    if (!transactionOfInput) {
        // Get the transaction of utxo by api.
        transactionOfInput = await subWallet.getTransactionDetails(transaction.vin[0].txid);
    }
    let out: btcoutobj = transactionOfInput.vout.find( out => out.n === transaction.vin[0].vout);
    if (out) {
        let tokenAddress = await subWallet.createAddress();
        // Input is the utxo of this subwallet address.
        if (out.scriptPubKey.address === tokenAddress) {
            transaction.direction = TransactionDirection.SENT;
        } else {
            transaction.direction = TransactionDirection.RECEIVED;
        }
    }
  }

    private async updateTransactionInfo(subWallet: BTCSubWallet, transaction: BTCTransaction) {
        let tokenAddress = await subWallet.createAddress();
        let outs : btcoutobj[]= [];
        if (transaction.direction === TransactionDirection.RECEIVED) {
            outs = transaction.vout.filter( (vt) => {
                return vt.scriptPubKey.address === tokenAddress;
            })
            // TODO: Use the first sending address.
            transaction.from = outs[0].scriptPubKey.address;
        } else {
            outs = transaction.vout.filter( (vt) => {
                return vt.scriptPubKey.address !== tokenAddress;
            })
            // TODO: Use the first receiving address.
            transaction.to = outs[0].scriptPubKey.address;
        }

        let value = 0;
        for (let i = 0; i < outs.length; i++) {
            value += parseFloat(outs[i].value);
        }
        transaction.value = value.toString();

        // pending
        if (!transaction.time) {
            transaction.time = 0;
            transaction.confirmations = 0;
        }

        // Get fee for sending transaction.
        if (transaction.direction === TransactionDirection.SENT) {
            // Get the total amount of all outputs.
            let totalInputAmount = await this.getInputValueOfTransaction(subWallet, transaction)

            // Get the total amount of all outputs.
            let totalOutputAmount = 0;
            for (let i = 0; i < transaction.vout.length; i++) {
                totalOutputAmount += parseFloat(transaction.vout[i].value);
            }
            transaction.fee = (totalInputAmount - totalOutputAmount).toFixed(8).replace(/0*$/g, "");
        }
    }

    private async getInputValueOfTransaction(subWallet: BTCSubWallet, transaction: BTCTransaction) {
        let totalInputAmount = 0;
        for (let i = 0; i < transaction.vin.length; i++) {
            let tx = this.transactions.find((tx) => {
                return tx.txid === transaction.vin[i].txid;
            })
            if (!tx) {
                tx = await subWallet.getTransactionDetails(transaction.vin[i].txid);
            }

            let out: btcoutobj = tx.vout.find( out => out.n === transaction.vin[i].vout);
            totalInputAmount += parseFloat(out.value);
        }

        return totalInputAmount;
    }
}
