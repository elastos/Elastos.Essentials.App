import { TranslateService } from '@ngx-translate/core';
import { RawTransactionType, Transaction, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType } from '../Transaction';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { MainAndIDChainSubWallet } from './MainAndIDChainSubWallet';

/**
 * Specialized standard sub wallet for the ID sidechain.
 * Most methods are common with the ELA main chain.
 */
export class IDChainSubWallet extends MainAndIDChainSubWallet {
    constructor(masterWallet: MasterWallet) {
        super(masterWallet, StandardCoinName.IDChain);
    }

    public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
        let transactionInfo = await super.getTransactionInfo(transaction, translate);
        // TODO
        // switch (transaction.Direction) {
        //     case TransactionDirection.MOVED:
        //         switch (transaction.Type) {
        //             case RawTransactionType.CancelProducer: // This transaction type value means "DID published" for ID chain...
        //                 transactionInfo.type = TransactionType.SENT;
        //         }
        // }

        return transactionInfo;
    }

    protected async getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string> {
        let transactionName = await super.getTransactionName(transaction, translate);

        // Use naming from super class, but override a few cases
        // TODO
        // switch (transaction.Direction) {
        //     case TransactionDirection.MOVED:
        //         switch (transaction.Type) {
        //             case RawTransactionType.CancelProducer: // This transaction type value means "DID published" for ID chain...
        //                 return 'wallet.coin-op-identity';
        //         }
        // }

        return transactionName;
    }

    protected async getTransactionIconPath(transaction: TransactionHistory): Promise<string> {
        let icon = await super.getTransactionIconPath(transaction);

        // Use icon from super class, but override a few cases
        // TODO
        // switch (transaction.Direction) {
        //     case TransactionDirection.MOVED:
        //         switch (transaction.Type) {
        //             case RawTransactionType.CancelProducer: // This transaction type value means "DID published" for ID chain...
        //                 return './assets/wallet/buttons/send.png'; // TODO: show a "publish" icon (ex: head/face)
        //         }
        // }

        return icon;
    }
}