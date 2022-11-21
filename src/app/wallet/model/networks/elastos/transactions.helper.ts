import BigNumber from "bignumber.js";
import { GlobalTranslationService } from "src/app/services/global.translation.service";
import { Config } from "src/app/wallet/config/Config";
import { ElastosTransaction, RawTransactionType, TransactionDirection, TransactionInfo, TransactionStatus } from "../../tx-providers/transaction.types";
import { WalletUtil } from "../../wallet.util";
import { MainChainSubWallet } from "./mainchain/subwallets/mainchain.subwallet";

export class ElastosTransactionsHelper {
  public static getMemoString(memo: string) {
    if (memo && memo.startsWith('type:text,msg:')) {
      return memo.substring(14);
    } else {
      return memo;
    }
  }

  public static getTransactionIconPath(transaction: ElastosTransaction): string {
    if (transaction.type === TransactionDirection.RECEIVED) {
      switch (transaction.txtype) {
        case RawTransactionType.RechargeToSideChain:
        case RawTransactionType.WithdrawFromSideChain:
        case RawTransactionType.TransferCrossChainAsset:
          return './assets/wallet/tx/transfer.svg';
        default:
          return './assets/wallet/tx/receive.svg';
      }
    } else if (transaction.type === TransactionDirection.SENT) {
      switch (transaction.txtype) {
        case RawTransactionType.RechargeToSideChain:
        case RawTransactionType.WithdrawFromSideChain:
        case RawTransactionType.TransferCrossChainAsset:
          return './assets/wallet/tx/transfer.svg';
        default:
          return './assets/wallet/tx/send.svg';
      }
    } else if (transaction.type === TransactionDirection.MOVED) {
      return './assets/wallet/tx/transfer.svg';
    }

    // In case the transaction type is a cross chain transfer, we don't mind the direction, we show
    // a transfer icon
    /*if (transaction.Type == RawTransactionType.TransferCrossChainAsset) {
        payStatusIcon = './assets/wallet/buttons/transfer.png';
    }*/

    return null;
  }

  public static getTransactionInfo(transaction: ElastosTransaction, subwallet: MainChainSubWallet): TransactionInfo {
    const timestamp = transaction.time * 1000; // Convert seconds to use milliseconds
    const datetime = timestamp === 0 ? GlobalTranslationService.instance.translateInstant('wallet.coin-transaction-status-pending') : WalletUtil.getDisplayDate(timestamp);
    const transactionInfo: TransactionInfo = {
      amount: new BigNumber(-1), // Defined by inherited classes
      confirmStatus: -1, // Defined by inherited classes
      datetime,
      direction: transaction.type,
      fee: transaction.fee,
      height: transaction.height,
      memo: ElastosTransactionsHelper.getMemoString(transaction.memo),
      name: ElastosTransactionsHelper.getTransactionName(transaction, subwallet),
      payStatusIcon: ElastosTransactionsHelper.getTransactionIconPath(transaction),
      status: transaction.Status,
      statusName: ElastosTransactionsHelper.getTransactionStatusName(transaction.Status),
      symbol: '', // Defined by inherited classes
      from: null,
      to: null,
      timestamp,
      txid: null, // Defined by inherited classes
      type: null, // Defined by inherited classes
      isCrossChain: false, // Defined by inherited classes
      isRedPacket: false,
      subOperations: []
    };
    return transactionInfo;
  }

  /**
* From a raw status, returns a UI readable string status.
*/
  public static getTransactionStatusName(status: TransactionStatus): string {
    let statusName = null;
    switch (status) {
      case TransactionStatus.CONFIRMED:
        statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-confirmed");
        break;
      case TransactionStatus.PENDING:
        statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-pending");
        break;
      case TransactionStatus.UNCONFIRMED:
        statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-unconfirmed");
        break;
      case TransactionStatus.NOT_PUBLISHED:
        statusName = GlobalTranslationService.instance.translateInstant("wallet.coin-transaction-status-not-published");
        break;
    }
    return statusName;
  }

  public static getTransactionName(transaction: ElastosTransaction, subwallet: MainChainSubWallet): string {
    let transactionName = '';
    // Logger.log("wallet", "getTransactionName std subwallet", transaction);

    switch (transaction.type) {
      case TransactionDirection.RECEIVED:
        transactionName = 'wallet.coin-op-received-token';
        // TODO: Show right info for others txtype.
        switch (transaction.txtype) {
          case RawTransactionType.CoinBase:
            transactionName = "wallet.coin-op-coin-base";
            break;
          case RawTransactionType.RechargeToSideChain:
            transactionName = "wallet.coin-dir-from-mainchain";
            break;
          case RawTransactionType.WithdrawFromSideChain:
            switch (transaction.inputs[0]) {
              case Config.IDCHAIN_DEPOSIT_ADDRESS:
              case Config.ETHDID_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-from-idchain";
                break;
              case Config.ETHSC_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-from-ethsc";
                break;
              default:
                transactionName = 'wallet.coin-op-received-token';
            }
            break;
          case RawTransactionType.ReturnDepositCoin:
            transactionName = "wallet.coin-op-producer-return";
            break;
          case RawTransactionType.ReturnCRDepositCoin:
            transactionName = "wallet.coin-op-cr-return";
            break;
          case RawTransactionType.CrcProposalWithdraw:
            transactionName = "wallet.coin-op-proposal-withdraw";
            break;
          case RawTransactionType.UnstakeRealWithdraw:
            transactionName = "wallet.coin-op-unstake-withdraw";
            break;
          case RawTransactionType.DposV2ClaimRewardRealWithdraw:
            if (transaction.address === subwallet.getOwnerAddress()) {
                transactionName = "wallet.coin-op-dpos2-node-reward-withdraw";
            } else {
                transactionName = "wallet.coin-op-dpos2-reward-withdraw";
            }
            break;
        }
        break;
      case TransactionDirection.SENT:
        transactionName = "wallet.coin-op-sent-token";
        switch (transaction.txtype) {
          case RawTransactionType.TransferCrossChainAsset:
            switch (transaction.outputs[0]) {
              case Config.IDCHAIN_DEPOSIT_ADDRESS:
              case Config.ETHDID_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-to-idchain";
                break;
              case Config.ETHSC_DEPOSIT_ADDRESS:
                transactionName = "wallet.coin-dir-to-ethsc";
                break;
              default:
                transactionName = "wallet.coin-dir-to-mainchain";
                break;
            }
            break;
          case RawTransactionType.RegisterProducer:
            transactionName = "wallet.coin-op-producer-register";
            break;
          case RawTransactionType.RegisterCR:
            transactionName = "wallet.coin-op-cr-register";
            break;
          case RawTransactionType.Stake:
            transactionName = "wallet.coin-op-stake";
            break;
        }
        break;
      case TransactionDirection.MOVED:
        if (transaction.votecategory !== 0) {
          transactionName = this.getVoteName(transaction.votecategory);
        } else {
          switch (transaction.txtype) {
            case RawTransactionType.UpdateProducer:
                transactionName = "wallet.coin-op-producer-update";
            break;
            case RawTransactionType.CancelProducer:
                transactionName = "wallet.coin-op-producer-cancel";
            break;
            case RawTransactionType.UnregisterCR:
                transactionName = "wallet.coin-op-cr-cancel";
            break;
            case RawTransactionType.UpdateCR:
                transactionName = "wallet.coin-op-cr-update";
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
            case RawTransactionType.CrCouncilMemberClaimNode:
                transactionName = "wallet.coin-op-cr-claim-node";
            break;
            case RawTransactionType.CrcProposalWithdraw:
                transactionName = "wallet.coin-op-proposal-withdraw";
            break;
            case RawTransactionType.Voting:
                // TODO: Get the vote type: DPoSV2, CRProposal, CRImpeachment, CRCouncil
                transactionName = "wallet.coin-op-vote";
            break;
            case RawTransactionType.Unstake:
                transactionName = "wallet.coin-op-unstake";
            break;
            case RawTransactionType.DposV2ClaimReward:
                transactionName = "wallet.coin-op-dpos2-claim-reward";
            break;
            default:
                transactionName = "wallet.coin-op-transfered-token";
            break;
          }
        }
        break;
    }
    return transactionName;
  }

  private static getVoteName(votecategory) {
    let voteName = '';
    let voteTypeCount = 0;

    if ((votecategory & 1) == 1) {
      voteTypeCount++;
      voteName = GlobalTranslationService.instance.translateInstant('wallet.coin-op-dpos-vote');
    }

    if ((votecategory & 2) == 2) {
      if (voteTypeCount) voteName += " + ";
      voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-crc-vote')
      voteTypeCount++;
    }

    if ((votecategory & 4) == 4) {
      if (voteTypeCount) voteName += " + ";
      voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-cr-proposal-against')
      voteTypeCount++;
    }

    if ((votecategory & 8) == 8) {
      if (voteTypeCount) voteName += " + ";
      voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-crc-impeachment')
      voteTypeCount++;
    }

    if ((votecategory & 16) == 16) {
        if (voteTypeCount) voteName += " + ";
        voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-dpos2-voting')
        voteTypeCount++;
    }

    if ((votecategory & 128) == 128) {
        if (voteTypeCount) voteName += " + ";
        voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-voting-cancel')
        voteTypeCount++;
    }

    if ((voteTypeCount > 2) || (voteTypeCount == 0)) {
      voteName = "wallet.coin-op-vote";
    }

    return voteName;
  }
}