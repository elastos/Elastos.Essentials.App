import {  Transaction, TransactionDirection } from '../Transaction';
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

    protected async getTransactionName(transaction: Transaction, translate: TranslateService): Promise<string> {
        if (transaction.Direction === TransactionDirection.MOVED) {
            const isVote = await this.isVoteTransaction(transaction.TxHash);
            if (isVote) {
                return translate.instant("coin-op-vote");
            }
        }

        return super.getTransactionName(transaction, translate);
    }

    /**
     * Returns the first payment address for this ELA wallet. This should be a constant address
     * for a given mnemonic.
     */
    public async getRootPaymentAddress(): Promise<string> {
        let allAddresses = await this.masterWallet.walletManager.spvBridge.getAllAddresses(this.masterWallet.id, this.id, 0, false);
        if (!allAddresses || !allAddresses.Addresses || allAddresses.Addresses.length == 0)
            return null;

        return allAddresses.Addresses[0];
    }
}