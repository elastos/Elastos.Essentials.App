import { Component, OnInit } from '@angular/core';
import { NavParams, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Config } from '../../config/Config';
import { AnyMainCoinEVMSubWallet } from '../../model/networks/evms/subwallets/evm.subwallet';
import { WalletUtil } from '../../model/wallet.util';
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

  public gasPrice: string = null;
  public gasLimit: string = null;
  private mainTokenSubWallet: AnyMainCoinEVMSubWallet = null;

  public gasPriceGwei = '';
  public feeDisplay = ''; // ELA

  public showEditGasPrice = false;

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

    if (this.txInfo.type === 1) {
      this.txHeader = this.translate.instant('wallet.transfer-transaction-type');
      this.txIcon = '/assets/wallet/tx/transfer.svg';
    } else {
      this.txHeader = this.translate.instant('wallet.send-transaction-type');
      this.txIcon = '/assets/wallet/tx/send.svg';
    }

    if (this.txInfo.fee) {
        this.fee = this.txInfo.fee;
    } else if (this.txInfo.gasLimit) {
        this.gasLimit = this.txInfo.gasLimit;
        // getMainEvmSubWallet return null on Identity Chain.
        this.mainTokenSubWallet = WalletService.instance.activeNetworkWallet.value.getMainTokenSubWallet() as AnyMainCoinEVMSubWallet;
        this.gasPrice = await this.mainTokenSubWallet.getGasPrice();
        let decimalPlaces = this.gasPrice.length < 10 ? 11 - this.gasPrice.length : 1;
        this.gasPriceGwei = new BigNumber(this.gasPrice).dividedBy(Config.GWEI).toFixed(decimalPlaces);
        await this.getEVMTransactionfee();
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
    this.native.popup.dismiss({
      confirm: true,
      gasPrice: this.gasPrice,
      gasLimit: this.gasLimit,
    });
  }

  private async getEVMTransactionfee() {
    let fee = new BigNumber(this.gasLimit).multipliedBy(new BigNumber(this.gasPrice)).dividedBy(this.mainTokenSubWallet.tokenAmountMulipleTimes);
    let nativeFee = WalletUtil.getAmountWithoutScientificNotation(fee, 8) + ' ' + WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
    let currencyFee = this.mainTokenSubWallet.getAmountInExternalCurrency(new BigNumber(fee)).toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
    this.fee = `${nativeFee} (~ ${currencyFee})`;
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
}
