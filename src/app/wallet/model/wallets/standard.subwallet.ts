import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { Transfer } from '../../services/cointransfer.service';
import { CurrencyService } from '../../services/currency.service';
import { CoinType } from '../coin';
import { GenericTransaction, RawTransactionPublishResult } from '../providers/transaction.types';
import { StandardEVMSubWallet } from './evm.subwallet';
import { NetworkWallet } from './networkwallet';
import { SubWallet } from './subwallet';

export abstract class StandardSubWallet<TransactionType extends GenericTransaction> extends SubWallet<TransactionType> {
    constructor(networkWallet: NetworkWallet, id: string) {
        super(networkWallet, id, CoinType.STANDARD);
    }

    public getUniqueIdentifierOnNetwork(): string {
        return this.id;
    }

    public async destroy() {
        try {
            await this.masterWallet.walletManager.spvBridge.destroySubWallet(this.masterWallet.id, this.id);
        }
        catch (e) {
            Logger.error('wallet', 'destroySubWallet error:', this.id, e)
        }
        await super.destroy();
    }

    public async createAddress(): Promise<string> {
        return await this.masterWallet.walletManager.spvBridge.createAddress(this.masterWallet.id, this.id);
    }

    public abstract getFriendlyName(): string;

    public abstract getDisplayTokenName(): string;

    public getDisplayBalance(): BigNumber {
        return this.getDisplayAmount(this.getRawBalance());
    }

    public getDisplayAmount(amount: BigNumber): BigNumber {
        return amount.dividedBy(this.tokenAmountMulipleTimes);
    }

    public getUSDBalance(): BigNumber {
        return CurrencyService.instance.getMainTokenValue(this.getBalance(), this.networkWallet.network, 'USD') || new BigNumber(0);
    }

    public getOneCoinUSDValue(): BigNumber {
        return CurrencyService.instance.getMainTokenValue(new BigNumber(1), this.networkWallet.network, 'USD');
    }

    public getAmountInExternalCurrency(value: BigNumber): BigNumber {
        let amount = CurrencyService.instance.getMainTokenValue(value, this.networkWallet.network);
        if (amount) {
            let decimalplace = 3;
            if (CurrencyService.instance.selectedCurrency && CurrencyService.instance.selectedCurrency.decimalplace) {
                decimalplace = CurrencyService.instance.selectedCurrency.decimalplace;
            }
            return amount.decimalPlaces(decimalplace);
        } else {
            return amount;
        }
    }

    // Check whether the balance is enough. amount unit is ELA or WEI
    public isBalanceEnough(amount: BigNumber) {
        return this.getRawBalance().gt(amount.multipliedBy(this.tokenAmountMulipleTimes));
    }

    public isStandardSubWallet(): boolean {
        return true;
    }

    /* protected abstract getTransactionName(transaction: TransactionType, translate: TranslateService): Promise<string>;

    protected abstract getTransactionIconPath(transaction: TransactionType): Promise<string>; */

    // Signs raw transaction and sends the signed transaction to the SPV SDK for publication.
    public signAndSendRawTransaction(transaction: string, transfer: Transfer, navigateHomeAfterCompletion = true): Promise<RawTransactionPublishResult> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
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

                Logger.log("wallet", "publishTransaction txid:", txid);

                await this.masterWallet.walletManager.native.hideLoading();

                if (navigateHomeAfterCompletion) {
                    await this.masterWallet.walletManager.native.setRootRouter('/wallet/wallet-home');
                    this.masterWallet.walletManager.events.publish('wallet:transactionsent', { subwalletid: this.id, txid: txid });
                }

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
                // ETHTransactionManager handle this error if the subwallet is StandardEVMSubWallet.
                // Maybe need to speed up.
                if (!(this instanceof StandardEVMSubWallet)) {
                    await this.masterWallet.walletManager.popupProvider.ionicAlert('wallet.transaction-fail', err.message ? err.message : '');
                }
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
