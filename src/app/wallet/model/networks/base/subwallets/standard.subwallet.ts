import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { Transfer } from '../../../../services/cointransfer.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { PopupProvider } from '../../../../services/popup.service';
import { jsToSpvWalletId, SPVService } from '../../../../services/spv.service';
import { WalletService } from '../../../../services/wallet.service';
import { CoinType } from '../../../coin';
import { MasterWallet } from '../../../masterwallets/masterwallet';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { GenericTransaction, RawTransactionPublishResult } from '../../../tx-providers/transaction.types';
import { StandardEVMSubWallet } from '../../evms/subwallets/evm.subwallet';
import { NetworkWallet } from '../networkwallets/networkwallet';
import { SubWallet } from './subwallet';

export abstract class StandardSubWallet<TransactionType extends GenericTransaction, WalletNetworkOptionsType extends WalletNetworkOptions> extends SubWallet<TransactionType, WalletNetworkOptionsType> {
    constructor(networkWallet: NetworkWallet<MasterWallet, any>, id: string) {
        super(networkWallet, id, CoinType.STANDARD);
    }

    public getUniqueIdentifierOnNetwork(): string {
        return this.id;
    }

    public async destroy() {
        try {
            await SPVService.instance.destroySubWallet(jsToSpvWalletId(this.masterWallet.id), this.id);
        }
        catch (e) {
            Logger.error('wallet', 'destroySubWallet error:', this.id, e)
        }
        await super.destroy();
    }

    public async createAddress(): Promise<string> {
        return await SPVService.instance.createAddress(jsToSpvWalletId(this.masterWallet.id), this.id);
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

    // Signs raw transaction and sends the signed transaction to the SPV SDK for publication.
    public signAndSendRawTransaction(transaction: string, transfer: Transfer, navigateHomeAfterCompletion = true): Promise<RawTransactionPublishResult> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve) => {
            // Logger.log("wallet", 'Received raw transaction', transaction);
            try {
                const password = await WalletService.instance.openPayModal(transfer);
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

                await Native.instance.showLoading(WalletService.instance.translate.instant('common.please-wait'));

                const signedTx = await SPVService.instance.signTransaction(
                    jsToSpvWalletId(this.masterWallet.id),
                    this.id,
                    transaction,
                    password
                );

                Logger.log("wallet", "Transaction signed. Now publishing.");
                let txid = await this.publishTransaction(signedTx);

                Logger.log("wallet", "publishTransaction txid:", txid);

                await Native.instance.hideLoading();

                if (navigateHomeAfterCompletion) {
                    await Native.instance.setRootRouter('/wallet/wallet-home');
                    WalletService.instance.events.publish('wallet:transactionsent', { subwalletid: this.id, txid: txid });
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
                await Native.instance.hideLoading();
                Logger.error("wallet", "Publish error:", err);
                // ETHTransactionManager handle this error if the subwallet is StandardEVMSubWallet.
                // Maybe need to speed up.
                if (!(this instanceof StandardEVMSubWallet)) {
                    await PopupProvider.instance.ionicAlert('wallet.transaction-fail', err.message ? err.message : '');
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
