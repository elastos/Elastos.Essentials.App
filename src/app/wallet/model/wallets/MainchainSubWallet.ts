import {  RawTransactionType, TransactionDirection, TransactionHistory } from '../Transaction';
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
            // TODO: show different icon for different vote?
            if (transaction.votecategory !== 0) {
                return "wallet.coin-op-vote";
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