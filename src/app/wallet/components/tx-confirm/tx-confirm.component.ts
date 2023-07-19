import { Component, OnInit } from '@angular/core';
import { NavParams, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { Web3Exception } from 'src/app/model/exceptions/web3.exception';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Config } from '../../config/Config';
import { CoinType } from '../../model/coin';
import { AnyMainCoinEVMSubWallet } from '../../model/networks/evms/subwallets/evm.subwallet';
import { WalletUtil } from '../../model/wallet.util';
import { TransferType } from '../../services/cointransfer.service';
import { CurrencyService } from '../../services/currency.service';
import { Native } from '../../services/native.service';
import { WalletNetworkService } from '../../services/network.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-tx-confirm',
  templateUrl: './tx-confirm.component.html',
  styleUrls: ['./tx-confirm.component.scss'],
})
export class TxConfirmComponent implements OnInit {

  public txInfo;

  public txHeader: string;
  public txIcon: string;
  public displayAmount: string = null;

  public fee : string = null;

  // evm
  public gasPrice: string = null;
  public gasLimit: string = null;
  private evmNativeFee = null;
  private mainTokenSubWallet: AnyMainCoinEVMSubWallet = null;

  public gasPriceGwei = '';
  public showEditGasPrice = false;

  public feeDisplay = ''; // ELA

  // tron
  public unFreezeBalance = 0;

  public isIOS = false;
  private rootContent: any;
  private keyboardShowEventListener: () => void;
  private keyboardHideEventListener: () => void;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private native: Native,
    private platform: Platform,
  ) { }

  async ngOnInit() {
    this.txInfo = this.navParams.get('txInfo');
    Logger.log('wallet', 'Confirm tx', this.txInfo);
    if (this.txInfo.amount != undefined) { // Undefined for NFT transfers
      if (this.txInfo.amount != -1) {
        this.displayAmount = WalletUtil.getAmountWithoutScientificNotation(this.txInfo.amount, this.txInfo.precision);
      } else {
        this.displayAmount = this.translate.instant('wallet.transfer-all');
      }
    }

    switch (this.txInfo.type) {
        case TransferType.RECHARGE:
            this.txHeader = this.translate.instant('wallet.transfer-transaction-type');
            this.txIcon = '/assets/wallet/tx/transfer.svg';
        break;
        case TransferType.FREEZE: // Tron
            this.txHeader = this.translate.instant('wallet.resource-freeze');
            this.txIcon = '/assets/wallet/tx/send.svg';
        break;
        case TransferType.UNFREEZE: // Tron
            this.txHeader = this.translate.instant('wallet.resource-unfreeze');
            this.txIcon = '/assets/wallet/tx/receive.svg';

            this.unFreezeBalance = this.txInfo.unfreezeBalance;
        break;
        default:
            this.txHeader = this.translate.instant('wallet.send-transaction-type');
            this.txIcon = '/assets/wallet/tx/send.svg';
        break;
    }

    if (this.txInfo.fee) {
        this.fee = this.txInfo.fee;
    } else if (this.txInfo.gasLimit) {
        this.gasLimit = this.txInfo.gasLimit;
        try {
            // getMainEvmSubWallet return null on Identity Chain.
            this.mainTokenSubWallet = WalletService.instance.activeNetworkWallet.value.getMainTokenSubWallet() as AnyMainCoinEVMSubWallet;
            this.gasPrice = await this.mainTokenSubWallet.getGasPrice();
            let decimalPlaces = this.gasPrice.length < 10 ? 11 - this.gasPrice.length : 1;
            this.gasPriceGwei = new BigNumber(this.gasPrice).dividedBy(Config.GWEI).toFixed(decimalPlaces);
            await this.getEVMTransactionfee();
        }
        catch (e) {
            Logger.warn('wallet', 'TxConfirmComponent:', e)
            let reworkedEx = WalletExceptionHelper.reworkedWeb3Exception(e);
            if (reworkedEx instanceof Web3Exception) {
                this.native.toast_trans("common.network-or-server-error");
            } else {
                let message = typeof (e) === "string" ? e : e.message;
                this.native.toast_trans(message);
            }
        }
    }

    // TODO: To improve it, we set margin-bottom on ios, because scrollIntoView can't work on ios.
    this.isIOS = this.platform.platforms().indexOf('android') < 0;
    this.rootContent = document.getElementById('tx-confirm');
    if (this.rootContent) {
        window.addEventListener("keyboardDidShow", this.keyboardShowEventListener = () => {
            if (this.isIOS) {
                this.rootContent.style['margin-bottom'] = '150px';
            } else {
                this.rootContent.scrollIntoView(true);
            }
        });
        window.addEventListener("keyboardDidHide", this.keyboardHideEventListener = () => {
            if (this.isIOS) {
                this.rootContent.style['margin-bottom'] = '0px';
            }
        });
    }
  }

  ngOnDestroy() {
    if (this.keyboardShowEventListener) {
        window.removeEventListener("keyboardDidShow", this.keyboardShowEventListener);
    }
    if (this.keyboardHideEventListener) {
        window.removeEventListener("keyboardDidHide", this.keyboardHideEventListener);
    }
  }

  cancel() {
    this.native.popup.dismiss();
  }

  confirm() {
    if (this.isBalanceEnough()) {
        this.native.popup.dismiss({
          confirm: true,
          gasPrice: this.gasPrice,
          gasLimit: this.gasLimit,
        });
    }
  }

  private async getEVMTransactionfee() {
    this.evmNativeFee = new BigNumber(this.gasLimit).multipliedBy(new BigNumber(this.gasPrice)).dividedBy(this.mainTokenSubWallet.tokenAmountMulipleTimes);
    let nativeFee = WalletUtil.getAmountWithoutScientificNotation(this.evmNativeFee, 8) + ' ' + WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
    let currencyFee = this.mainTokenSubWallet.getAmountInExternalCurrency(this.evmNativeFee);
    if (currencyFee) {
        let currencyFeeStr = currencyFee.toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
        this.fee = `${nativeFee} (~ ${currencyFeeStr})`;
    } else {
        this.fee = `${nativeFee}`;
    }
  }

  public editGasPrice() {
    this.showEditGasPrice = !this.showEditGasPrice;
  }

  public async updateGasprice(event) {
    if (!this.gasPriceGwei) return;

    this.gasPrice = new BigNumber(this.gasPriceGwei).multipliedBy(Config.GWEI).toString();
    await this.getEVMTransactionfee()
  }

  public async updateGasLimit(event) {
    if (!this.gasLimit) return;

    await this.getEVMTransactionfee()
  }

  // Only for evm network.
  private isBalanceEnough() {
    if (!this.gasLimit || !this.evmNativeFee) return true;

    let totalCost = null;
    if ((this.txInfo.coinType == CoinType.ERC20) || (this.txInfo.coinType == CoinType.TRC20)
        || (this.txInfo.type == TransferType.SEND_NFT) || this.txInfo.sendAll || !this.txInfo.amount) {
      totalCost = this.evmNativeFee;
    } else {
      totalCost = this.evmNativeFee.plus(new BigNumber(this.txInfo.amount));
    }

    if (!this.mainTokenSubWallet.isBalanceEnough(totalCost)) {
      this.native.toast_trans('wallet.insufficient-balance', 4000);
      return false;
    }
    return true;
  }
}
