import {  TransactionDetail, TransactionDirection, TransactionHistory } from '../Transaction';
import { TranslateService } from '@ngx-translate/core';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { MainAndIDChainSubWallet } from './MainAndIDChainSubWallet';

/**
 * Specialized standard sub wallet for ELA mainchain.
 */
export class MainchainSubWallet extends MainAndIDChainSubWallet {
    constructor(masterWallet: MasterWallet) {
        super(masterWallet, StandardCoinName.ELA);
    }

    protected async getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string> {
        if (transaction.type === TransactionDirection.MOVED) {
            const transactionDetails: TransactionDetail = await this.getTransactionDetails(transaction.txid);
            // Check if it's a voting transaction.
            if (transactionDetails.vout && transactionDetails.vout[0].payload
                    && transactionDetails.vout[0].payload.contents) {
                return "wallet.coin-op-vote";
            }
        }

        return super.getTransactionName(transaction, translate);
    }

    /**
     * Returns the first payment address for this ELA wallet. This should be a constant address
     * for a given mnemonic.
     */
    public async getRootPaymentAddress(): Promise<string> {
        let allAddresses = await this.masterWallet.walletManager.spvBridge.getAllAddresses(this.masterWallet.id, this.id, 0, 1, false);
        if (!allAddresses || !allAddresses.Addresses || allAddresses.Addresses.length == 0)
            return null;

        return allAddresses.Addresses[0];
    }
}