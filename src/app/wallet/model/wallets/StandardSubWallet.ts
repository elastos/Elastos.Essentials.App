import { MasterWallet } from './MasterWallet';
import { SubWallet, RawTransactionPublishResult } from './SubWallet';
import { CoinType, StandardCoinName } from '../Coin';
import { RawTransactionType, TransactionDirection, TransactionHistory } from '../Transaction';
import { Transfer } from '../../services/cointransfer.service';
import { Config } from '../../config/Config';
import BigNumber from 'bignumber.js';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../services/currency.service';
import { Logger } from 'src/app/logger';

export abstract class StandardSubWallet extends SubWallet {
    constructor(masterWallet: MasterWallet, id: StandardCoinName) {
        super(masterWallet, id, CoinType.STANDARD);
    }

    public async destroy() {
        try {
          await this.masterWallet.walletManager.spvBridge.destroySubWallet(this.masterWallet.id, this.id);
        }
        catch (e) {
          Logger.error('wallet', 'destroySubWallet error:', this.id, e)
        }
        super.destroy();
    }

    public async createAddress(): Promise<string> {
        return await this.masterWallet.walletManager.spvBridge.createAddress(this.masterWallet.id, this.id);
    }

    public getFriendlyName(): string {
        const coin = this.masterWallet.coinService.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }

        return coin.getDescription();
    }

    public getDisplayTokenName(): string {
        const coin = this.masterWallet.coinService.getCoinByID(this.id);
        if (!coin) {
            return ''; // Just in case
        }

        return coin.getName();
    }

    public getDisplayBalance(): BigNumber {
        return this.getDisplayAmount(this.balance);
    }

    // TODO remove it?
    public getDisplayAmount(amount: BigNumber): BigNumber {
        return amount.dividedBy(Config.SELAAsBigNumber);
    }

    public getAmountInExternalCurrency(value: BigNumber): BigNumber {
        return CurrencyService.instance.getCurrencyBalance(value);
    }

    /**
     * Check whether the balance is enough.
     * @param amount unit is ELA
     */
    public isBalanceEnough(amount: BigNumber) {
        return this.balance.gt(amount.multipliedBy(Config.SELAAsBigNumber));
    }

    protected async getTransactionName(transaction: TransactionHistory, translate: TranslateService): Promise<string> {
        let transactionName: string = '';
        // Logger.log("wallet", "getTransactionName std subwallet", transaction);

        switch (transaction.type) {
            case TransactionDirection.RECEIVED:
                transactionName = 'wallet.coin-op-received-token';
                // TODO: Show right info for others txtype.
                switch (transaction.txtype) {
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
                }
                break;
            case TransactionDirection.MOVED:
                transactionName = "wallet.coin-op-transfered-token";
                break;
        }
        return transactionName;
    }

    protected async getTransactionIconPath(transaction: TransactionHistory): Promise<string> {
        if (transaction.type === TransactionDirection.RECEIVED) {
            switch (transaction.txtype) {
                case RawTransactionType.RechargeToSideChain:
                case RawTransactionType.WithdrawFromSideChain:
                case RawTransactionType.TransferCrossChainAsset:
                    return './assets/wallet/buttons/transfer.png';
                default:
                    return './assets/wallet/buttons/receive.png';
            }
        } else if (transaction.type === TransactionDirection.SENT) {
            switch (transaction.txtype) {
                case RawTransactionType.RechargeToSideChain:
                case RawTransactionType.WithdrawFromSideChain:
                case RawTransactionType.TransferCrossChainAsset:
                    return './assets/wallet/buttons/transfer.png';
                default:
                    return './assets/wallet/buttons/send.png';
            }
        } else if (transaction.type === TransactionDirection.MOVED) {
            return './assets/wallet/buttons/transfer.png';
        }

        // In case the transaction type is a cross chain transfer, we don't mind the direction, we show
        // a transfer icon
        /*if (transaction.Type == RawTransactionType.TransferCrossChainAsset) {
            payStatusIcon = './assets/wallet/buttons/transfer.png';
        }*/

        return null;
    }

    /**
     * Signs raw transaction and sends the signed transaction to the SPV SDK for publication.
     */
    public async signAndSendRawTransaction(transaction: string, transfer: Transfer, navigateHomeAfterCompletion = true): Promise<RawTransactionPublishResult> {
        return new Promise(async (resolve) => {
            // Logger.log("wallet", 'Received raw transaction', transaction);
            try {
              const password = await this.masterWallet.walletManager.openPayModal(transfer);
              if (!password) {
                  Logger.log("wallet", "No password received. Cancelling");
                  resolve({
                    published: false,
                    txid: null,
                    status: 'cancelled'
                  });
                  return;
              }

              Logger.log("wallet", "Password retrieved. Now signing the transaction.");

              await this.masterWallet.walletManager.native.showLoading(this.masterWallet.walletManager.translate.instant('common.please-wait'));

              const signedTx = await this.masterWallet.walletManager.spvBridge.signTransaction(
                  this.masterWallet.id,
                  this.id,
                  transaction,
                  password
              );

              Logger.log("wallet", "Transaction signed. Now publishing.");
              let txid = await this.publishTransaction(signedTx);

              Logger.log("wallet", "pubishTransaction txid:", txid);

              await this.masterWallet.walletManager.native.hideLoading();

              if (navigateHomeAfterCompletion)
                  await this.masterWallet.walletManager.native.setRootRouter('/wallet/wallet-home');

              let published = true;
              let status = 'published';
              if (!txid || txid.length == 0) {
                published = false;
                status = 'error';
              }
              resolve({
                  published,
                  status,
                  txid
              });
            }
            catch (err) {
              await this.masterWallet.walletManager.native.hideLoading();
              Logger.error("wallet", "Publish error:", err);
              await this.masterWallet.walletManager.popupProvider.ionicAlert('wallet.transaction-fail', err.message ? err.message : '');
              resolve({
                published: false,
                txid: null,
                status: 'error',
                code: err.code,
                message: err.message,
              });
            }
        });
    }
}
