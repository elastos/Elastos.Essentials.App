import { TranslateService } from '@ngx-translate/core';
import { RawTransactionType, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType } from '../../transaction.types';
import { StandardCoinName } from '../../coin';
import { MasterWallet } from '../masterwallet';
import { MainAndIDChainSubWallet } from './mainandidchain.subwallet';
import { NetworkWallet } from '../NetworkWallet';

/**
 * Specialized standard sub wallet for the ID sidechain.
 * Most methods are common with the ELA main chain.
 */
export class IDChainSubWallet extends MainAndIDChainSubWallet {
    constructor(masterWallet: MasterWallet) {
        super(masterWallet, StandardCoinName.IDChain);
    }

    protected async initialize() {
        await this.loadTransactionsFromCache();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            if (!this.masterWallet.account.SingleAddress) {
                await this.checkAddresses(true);
                await this.checkAddresses(false);
            }
            await this.updateBalance();

            //Do not use id chain any more.
            await this.checkIDChainToBeDestroy();
        }, 200);
    }

    checkIDChainToBeDestroy() {
        // Do not use the id chain any more.
        // Cross chain transaction need 20000 SELA.
        if (this.balance.lte(20000)) {
            // TODO await this.masterWallet.destroyStandardSubWallet(this.id);
        }
    }

    public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
        let transactionInfo = await super.getTransactionInfo(transaction, translate);
        switch (transaction.type) {
            case TransactionDirection.MOVED:
                switch (transaction.txtype) {
                    case 10: // This transaction type value means "DID published" for ID chain...
                        transactionInfo.type = TransactionType.SENT;
                }
        }

        return transactionInfo;
    }

    protected async getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string> {
        let transactionName = await super.getTransactionName(transaction, translate);

        // Use naming from super class, but override a few cases
        switch (transaction.type) {
            case TransactionDirection.SENT:
                switch (transaction.txtype) {
                    case RawTransactionType.CancelProducer: // This transaction type value means "DID published" for ID chain...
                        return 'wallet.coin-op-identity';
                }
        }

        return transactionName;
    }

    protected async getTransactionIconPath(transaction: TransactionHistory): Promise<string> {
        let icon = await super.getTransactionIconPath(transaction);

        // Use icon from super class, but override a few cases
        switch (transaction.type) {
            case TransactionDirection.MOVED:
                switch (transaction.txtype) {
                    case RawTransactionType.CancelProducer: // This transaction type value means "DID published" for ID chain...
                        return './assets/wallet/buttons/send.png'; // TODO: show a "publish" icon (ex: head/face)
                }
        }

        return icon;
    }
}