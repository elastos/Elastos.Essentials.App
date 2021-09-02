import { TranslateService } from '@ngx-translate/core';
import { ElastosTransaction, RawTransactionType, TransactionDirection, TransactionInfo, TransactionType } from '../../providers/transaction.types';
import { StandardCoinName } from '../../Coin';
import { MainAndIDChainSubWallet } from './mainandidchain.subwallet';
import { NetworkWallet } from '../networkwallet';

/**
 * Specialized standard sub wallet for the ID sidechain.
 * Most methods are common with the ELA main chain.
 */
export class IDChainSubWallet extends MainAndIDChainSubWallet {
    constructor(networkWallet: NetworkWallet) {
        super(networkWallet, StandardCoinName.IDChain);
    }

    protected initialize() {
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

    public getMainIcon(): string {
        return "assets/wallet/coins/ela-turquoise.svg";
    }

    public getSecondaryIcon(): string {
        return null;
    }

    public getFriendlyName(): string {
        return "Older Identity";
    }

    public getDisplayTokenName(): string {
        return "ELA";
    }

    // Override
    // Don't show the old IDChain subwallet if balance is 0.
    public shouldShowOnHomeScreen(): boolean {
        return this.balance && !this.balance.isNaN() && !this.balance.eq(0);
    }

    checkIDChainToBeDestroy() {
        // Do not use the id chain any more.
        // Cross chain transaction need 20000 SELA.
        if (this.balance.lte(20000)) {
            // TODO await this.masterWallet.destroyStandardSubWallet(this.id);
        }
    }

    public async getTransactionInfo(transaction: ElastosTransaction, translate: TranslateService): Promise<TransactionInfo> {
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

    protected async getTransactionName(transaction: ElastosTransaction, translate: TranslateService): Promise<string> {
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

    protected async getTransactionIconPath(transaction: ElastosTransaction): Promise<string> {
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