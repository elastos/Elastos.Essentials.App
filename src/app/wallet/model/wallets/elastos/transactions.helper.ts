import { TranslateService } from "@ngx-translate/core";
import BigNumber from "bignumber.js";
import moment from "moment";
import { Config } from "src/app/wallet/config/Config";
import { ElastosTransaction, RawTransactionType, TransactionDirection, TransactionInfo } from "../../providers/transaction.types";
import { TransactionsHelper } from "../../transactions.helper";

export class ElastosTransactionsHelper {
  public static getMemoString(memo: string) {
    if (memo.startsWith('type:text,msg:')) {
      return memo.substring(14);
    } else {
      return memo;
    }
  }

  public static getTransactionIconPath(transaction: ElastosTransaction): string {
    if (transaction.type === TransactionDirection.RECEIVED) {
      switch (transaction.txtype) {
        case RawTransactionType.RechargeToSideChain:
        case RawTransactionType.WithdrawFromSideChain:
        case RawTransactionType.TransferCrossChainAsset:
          return './assets/wallet/buttons/transfer.png';
        default:
          return './assets/wallet/buttons/receive.png';
      }
    } else if (transaction.type === TransactionDirection.SENT) {
      switch (transaction.txtype) {
        case RawTransactionType.RechargeToSideChain:
        case RawTransactionType.WithdrawFromSideChain:
        case RawTransactionType.TransferCrossChainAsset:
          return './assets/wallet/buttons/transfer.png';
        default:
          return './assets/wallet/buttons/send.png';
      }
    } else if (transaction.type === TransactionDirection.MOVED) {
      return './assets/wallet/buttons/transfer.png';
    }

    // In case the transaction type is a cross chain transfer, we don't mind the direction, we show
    // a transfer icon
    /*if (transaction.Type == RawTransactionType.TransferCrossChainAsset) {
        payStatusIcon = './assets/wallet/buttons/transfer.png';
    }*/

    return null;
  }

  public static getTransactionInfo(transaction: ElastosTransaction, translate: TranslateService): TransactionInfo {
    const timestamp = transaction.time * 1000; // Convert seconds to use milliseconds
    const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(timestamp).format("YYYY-MM-DD HH:mm");

    const transactionInfo: TransactionInfo = {
      amount: new BigNumber(-1), // Defined by inherited classes
      confirmStatus: -1, // Defined by inherited classes
      datetime,
      direction: transaction.type,
      fee: transaction.fee,
      height: transaction.height,
      memo: ElastosTransactionsHelper.getMemoString(transaction.memo),
      name: ElastosTransactionsHelper.getTransactionName(transaction, translate),
      payStatusIcon: ElastosTransactionsHelper.getTransactionIconPath(transaction),
      status: transaction.Status,
      statusName: TransactionsHelper.getTransactionStatusName(transaction.Status, translate),
      symbol: '', // Defined by inherited classes
      from: null,
      to: transaction.address,
      timestamp,
      txid: null, // Defined by inherited classes
      type: null, // Defined by inherited classes
      isCrossChain: false, // Defined by inherited classes
    };
    return transactionInfo;
  }

  public static getTransactionName(transaction: ElastosTransaction, translate: TranslateService): string {
    let transactionName = '';
    // Logger.log("wallet", "getTransactionName std subwallet", transaction);

    switch (transaction.type) {
      case TransactionDirection.RECEIVED:
        transactionName = 'wallet.coin-op-received-token';
        // TODO: Show right info for others txtype.
        switch (transaction.txtype) {
          case RawTransactionType.RechargeToSideChain:
            transactionName = "wallet.coin-dir-from-mainchain";
            break;
          case RawTransactionType.WithdrawFromSideChain:
            switch (transaction.inputs[0]) {
              case Config.IDCHAIN_DEPOSIT_ADDRESS:
              case Config.ETHDID_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-from-idchain";
                break;
              case Config.ETHSC_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-from-ethsc";
                break;
              default:
                transactionName = 'wallet.coin-op-received-token';
            }
            break;
          case RawTransactionType.ReturnDepositCoin:
            transactionName = "wallet.coin-op-producer-return";
            break;
          case RawTransactionType.ReturnCRDepositCoin:
            transactionName = "wallet.coin-op-cr-return";
            break;
          case RawTransactionType.CrcProposalWithdraw:
            transactionName = "wallet.coin-op-proposal-withdraw";
            break;
        }
        break;
      case TransactionDirection.SENT:
        transactionName = "wallet.coin-op-sent-token";
        switch (transaction.txtype) {
          case RawTransactionType.TransferCrossChainAsset:
            switch (transaction.outputs[0]) {
              case Config.IDCHAIN_DEPOSIT_ADDRESS:
              case Config.ETHDID_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-to-idchain";
                break;
              case Config.ETHSC_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-to-ethsc";
                break;
              default:
                transactionName = "wallet.coin-dir-to-mainchain";
                break;
            }
            break;
          case RawTransactionType.RegisterProducer:
            transactionName = "wallet.coin-op-producer-register";
            break;
          case RawTransactionType.RegisterCR:
            transactionName = "wallet.coin-op-cr-register";
            break;
        }
        break;
      case TransactionDirection.MOVED:
        if (transaction.votecategory !== 0) {
          // TODO: show different icon for different vote?
          transactionName = "wallet.coin-op-vote";
        } else {
          transactionName = "wallet.coin-op-transfered-token";
        }
        break;
    }
    return transactionName;
  }
}