export class WalletNotEnoughUtxoException implements Error {
    name = "WalletNotEnoughUtxoException";
    message = "The utxo is not enough";
}