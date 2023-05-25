export class WalletPendingTransactionException implements Error {
    name = "WalletPendingTransactionException";
    message = "There is already an on going transaction";
}