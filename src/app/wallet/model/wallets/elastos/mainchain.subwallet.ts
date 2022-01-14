import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { StandardCoinName } from '../../coin';
import { ElastosTransaction, RawTransactionType, TransactionDirection } from '../../providers/transaction.types';
import { NetworkWallet } from '../networkwallet';
import { MainAndIDChainSubWallet } from './mainandidchain.subwallet';
import { ElastosTransactionsHelper } from './transactions.helper';

/**
 * Specialized standard sub wallet for ELA mainchain.
 */
export class MainchainSubWallet extends MainAndIDChainSubWallet {
    constructor(networkWallet: NetworkWallet) {
        super(networkWallet, StandardCoinName.ELA);
    }

    public getMainIcon(): string {
        return "assets/wallet/coins/ela-black.svg";
    }

    public getSecondaryIcon(): string {
        return null;
    }

    public getFriendlyName(): string {
        return "Main Chain";
    }

    public getDisplayTokenName(): string {
        return "ELA";
    }

    public getRawBalanceSpendable(): BigNumber {
        return this.balanceSpendable;
    }

    public async updateBalanceSpendable() {
        this.balanceSpendable = await this.getTotalBalanceByType(true);
    }

    protected async getTransactionName(transaction: ElastosTransaction, translate: TranslateService): Promise<string> {
        if (transaction.type === TransactionDirection.MOVED) {
            // TODO: show different icon for different vote?
            if (transaction.votecategory !== 0) {
                return await "wallet.coin-op-vote";
            }

            let transactionName = '';
            switch (transaction.txtype) {
                case RawTransactionType.RegisterProducer:
                    transactionName = "wallet.coin-op-producer-register";
                    break;
                case RawTransactionType.CancelProducer:
                    transactionName = "wallet.coin-op-producer-cancel";
                    break;
                case RawTransactionType.UpdateProducer:
                    transactionName = "wallet.coin-op-producer-update";
                    break;
                case RawTransactionType.ReturnDepositCoin:
                    transactionName = "wallet.coin-op-producer-return";
                    break;
                case RawTransactionType.ActivateProducer:
                    transactionName = "wallet.coin-op-producer-active";
                    break;
                case RawTransactionType.RegisterCR:
                    transactionName = "wallet.coin-op-cr-register";
                    break;
                case RawTransactionType.UnregisterCR:
                    transactionName = "wallet.coin-op-cr-cancel";
                    break;
                case RawTransactionType.UpdateCR:
                    transactionName = "wallet.coin-op-cr-update";
                    break;
                case RawTransactionType.ReturnCRDepositCoin:
                    transactionName = "wallet.coin-op-cr-return";
                    break;

                case RawTransactionType.CrcProposal:
                    transactionName = "wallet.coin-op-proposal";
                    break;
                case RawTransactionType.CrcProposalReview:
                    transactionName = "wallet.coin-op-proposal-review";
                    break;
                case RawTransactionType.CrcProposalTracking:
                    transactionName = "wallet.coin-op-proposal-tracking";
                    break;
                case RawTransactionType.CrcProposalWithdraw:
                    transactionName = "wallet.coin-op-proposal-withdraw";
                    break;
                case RawTransactionType.CrCouncilMemberClaimNode:
                    transactionName = "wallet.coin-op-crc-claim";
                    break;
            }
            if (transactionName.length > 0) {
                return transactionName;
            }
        }

        return ElastosTransactionsHelper.getTransactionName(transaction, translate);
    }

    /**
     * Returns the first payment address for this ELA wallet. This should be a constant address
     * for a given mnemonic.
     */
    public async getRootPaymentAddress(): Promise<string> {
        let allAddresses = await this.masterWallet.walletManager.spvBridge.getAddresses(this.masterWallet.id, this.id, 0, 1, false);
        if (!allAddresses || allAddresses.length == 0)
            return null;

        return allAddresses[0];
    }
}