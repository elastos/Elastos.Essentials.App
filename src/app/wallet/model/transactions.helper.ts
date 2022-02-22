import { TranslateService } from "@ngx-translate/core";
import { TransactionStatus } from "./tx-providers/transaction.types";

export class TransactionsHelper {
  /**
 * From a raw status, returns a UI readable string status.
 */
  public static getTransactionStatusName(status: TransactionStatus, translate: TranslateService): string {
    let statusName = null;
    switch (status) {
      case TransactionStatus.CONFIRMED:
        statusName = translate.instant("wallet.coin-transaction-status-confirmed");
        break;
      case TransactionStatus.PENDING:
        statusName = translate.instant("wallet.coin-transaction-status-pending");
        break;
      case TransactionStatus.UNCONFIRMED:
        statusName = translate.instant("wallet.coin-transaction-status-unconfirmed");
        break;
    }
    return statusName;
  }
}