import { MasterWallet } from './MasterWallet';
import { SubWallet, RawTransactionPublishResult } from './SubWallet';
import { CoinType, StandardCoinName } from '../Coin';
import { Util } from '../Util';
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

        this.initialize();
    }

    protected async initialize() {
        await this.initLastBlockInfo();
        this.updateBalance();
    }

    public async destroy() {
        await this.masterWallet.walletManager.stopSubWalletSync(this.masterWallet.id);
        await this.masterWallet.walletManager.spvBridge.destroySubWallet(this.masterWallet.id, this.id);

        super.destroy();
    }

    /**
     * Get the last block info from the local data.
     */
    public async initLastBlockInfo() {
        // Get the last block info from the wallet plugin.
        // TODO
        // const blockInfo = await this.masterWallet.walletManager.spvBridge.getLastBlockInfo(this.masterWallet.id, this.id);

        // if (blockInfo) this.updateSyncProgress(0, blockInfo.Timestamp);
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
                // TODO: upgrade spvsdk, check the ETHSC
                switch (transaction.txtype) {
                    case RawTransactionType.RechargeToSideChain:
                        transactionName = "wallet.coin-dir-from-mainchain";
                        break;
                    case RawTransactionType.WithdrawFromSideChain:
                        switch (transaction.inputs[0]) {
                            case Config.IDCHAIN_ADDRESS:
                                transactionName = "wallet.coin-dir-from-idchain";
                                break;
                            case Config.ETHSC_ADDRESS:
                                transactionName = "wallet.coin-dir-from-ethsc";
                                break;
                            default:
                                transactionName = 'wallet.coin-op-received-token';
                        }
                        break;
                }
                break;
            case TransactionDirection.SENT:
                transactionName = "wallet.coin-op-sent-token";

                if (transaction.txtype === RawTransactionType.TransferCrossChainAsset) {
                    switch (transaction.outputs[0]) {
                        case Config.IDCHAIN_ADDRESS:
                            transactionName = "wallet.coin-dir-to-idchain";
                            break;
                        case Config.ETHSC_ADDRESS:
                            transactionName = "wallet.coin-dir-to-ethsc";
                            break;
                        default:
                            transactionName = "wallet.coin-dir-to-mainchain";
                            break;
                    }
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

    protected isVoteTransaction(txid: string): Promise<any> {
        return new Promise(async (resolve) => {
          // TODO
            // const transactions = await this.masterWallet.walletManager.spvBridge.getAllTransactions(this.masterWallet.id, this.id, 0, txid);
            // const transaction = transactions.Transactions[0];
            // if (!Util.isNull(transaction.OutputPayload) && (transaction.OutputPayload.length > 0)) {
            //     resolve(true);
            // } else {
                resolve(false);
            // }
        });
    }

   /*
    * Updates current SPV synchonization progress information for this coin.
    */
   public updateSyncProgress(progress: number, lastBlockTime: number) {
        this.syncTimestamp = lastBlockTime * 1000;

        if (lastBlockTime) {
            const userReadableDateTime = Util.dateFormat(new Date(this.syncTimestamp), 'YYYY-MM-DD HH:mm:ss');
            this.lastBlockTime = userReadableDateTime;
        } else { // TODO  for ETHSC, no lastBlockTime
            this.lastBlockTime = '';
        }
        this.progress = progress;

        if (this.id != StandardCoinName.ETHSC ) {
            // Logger.log("wallet", "Standard subwallet "+this.id+" got update sync progress request. Progress = "+progress);
        }

        const curTimestampMs = (new Date()).getTime();
        const timeInverval = curTimestampMs - this.timestamp;
        if (timeInverval > 5000) { // 5s
            this.masterWallet.walletManager.events.publish(this.masterWallet.id + ':' + this.id + ':syncprogress', this.id);
            this.timestamp = curTimestampMs;
        }

        // Save wallet info every 30 minutes
        // TODO: if spvsdk can get progress by api, then we can delete it
        if (timeInverval > 1800000) { // 30 minutes
            this.masterWallet.walletManager.saveMasterWallet(this.masterWallet);
        }

        if (progress === 100) {
            const eventId = this.masterWallet.id + ':' + this.id + ':synccompleted';
            this.masterWallet.walletManager.events.publish(eventId, this.id);
        }
    }

    /**
     * Signs raw transaction and sends the signed transaction to the SPV SDK for publication.
     */
    public async signAndSendRawTransaction(transaction: string, transfer: Transfer, navigateHomeAfterCompletion = true): Promise<RawTransactionPublishResult> {
        return new Promise(async (resolve) => {
            Logger.log("wallet", 'Received raw transaction', transaction);
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

            await this.masterWallet.walletManager.native.showLoading();

            const signedTx = await this.masterWallet.walletManager.spvBridge.signTransaction(
                this.masterWallet.id,
                this.id,
                transaction,
                password
            );

            Logger.log("wallet", "Transaction signed. Now publishing.");

            let rawTx = await this.masterWallet.walletManager.spvBridge.convertToRawTransaction(
                this.masterWallet.id,
                this.id,
                signedTx,
            )

            let txid = await this.jsonRPCService.sendrawtransaction(this.id as StandardCoinName, rawTx);
            Logger.log("wallet", "sendrawtransaction txid:", txid);

            await this.masterWallet.walletManager.native.hideLoading();
            this.masterWallet.walletManager.setRecentWalletId(this.masterWallet.id);

            if (navigateHomeAfterCompletion)
                await this.masterWallet.walletManager.native.setRootRouter('/wallet/wallet-home');

            resolve({
                published: true,
                status: 'published',
                txid: txid
            });
        });
    }
}
