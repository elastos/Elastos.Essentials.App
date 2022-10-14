import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { CurrencyService } from '../../../../services/currency.service';
import { CoinType, NativeCoin } from '../../../coin';
import { WalletNetworkOptions } from '../../../masterwallets/wallet.types';
import { AddressUsage } from '../../../safes/addressusage';
import { GenericTransaction } from '../../../tx-providers/transaction.types';
import { WalletJSSDKHelper } from '../../elastos/wallet.jssdk.helper';
import type { AnyNetworkWallet } from '../networkwallets/networkwallet';
import { SubWallet } from './subwallet';

export abstract class MainCoinSubWallet<TransactionType extends GenericTransaction, WalletNetworkOptionsType extends WalletNetworkOptions> extends SubWallet<TransactionType, WalletNetworkOptionsType> {
    private coin: NativeCoin;

    constructor(networkWallet: AnyNetworkWallet, id: string) {
        super(networkWallet, id, CoinType.STANDARD);

        this.coin = new NativeCoin(networkWallet.network, id, networkWallet.network.getMainTokenSymbol(), networkWallet.network.getMainTokenSymbol());
    }

    public getUniqueIdentifierOnNetwork(): string {
        return this.id;
    }

    public async destroy() {
        try {
            await WalletJSSDKHelper.destroySubWallet(this.masterWallet.id, this.id);
        }
        catch (e) {
            Logger.error('wallet', 'destroySubWallet error:', this.id, e)
        }
        await super.destroy();
    }

    public getCoin(): NativeCoin {
        return this.coin;
    }

    /**
     * @deprecated TODO: use getAddress(), and use createAddress() only for multi address wallets to really start using a NEW address
     */
    // TODO: move to network wallet then to the "safe"
    public createAddress(): string {
      let addresses = this.networkWallet.safe.getAddresses(0, 1, false, AddressUsage.DEFAULT);
      return (addresses && addresses[0]) ? addresses[0] : null;
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
            // If the amount is less than 1, more decimal parts are displayed.
            if (!amount.isGreaterThan(1)) {
                decimalplace += 2;
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

    public abstract createPaymentTransaction(toAddress: string, amount: BigNumber, memo: string): Promise<string>;
}
