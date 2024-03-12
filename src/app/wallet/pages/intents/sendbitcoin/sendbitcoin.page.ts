/*
 * Copyright (c) 2024 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from "bignumber.js";
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { Web3Exception } from 'src/app/model/exceptions/web3.exception';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Config } from 'src/app/wallet/config/Config';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { BTCSubWallet } from 'src/app/wallet/model/networks/btc/subwallets/btc.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CoinTransferService, Transfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

type SendBitcoinParam = {
  payAddress: string,
  satAmount: number,
  satPerVB: number
}

@Component({
  selector: 'app-sendbitcoin',
  templateUrl: './sendbitcoin.page.html',
  styleUrls: ['./sendbitcoin.page.scss'],
})
export class SendBitcoinPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public targetNetwork: AnyNetwork = null;
  public networkWallet: AnyNetworkWallet = null;
  public btcSubWallet: BTCSubWallet = null;
  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  public sendBitcoinParam: SendBitcoinParam = null
  public balance: BigNumber; // ELA
  public feeRate: number;
  public fees: BigNumber;
  public showEditFeeRate = false;
  public loading = true;

  private alreadySentIntentResponse = false;

  public signingAndTransacting = false;

  public currentNetworkName = ''

  // Titlebar
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public walletManager: WalletService,
    private coinTransferService: CoinTransferService,
    private globalIntentService: GlobalIntentService,
    public native: Native,
    public zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    public uiService: UiService,
    private router: Router,
    public globalPopupService: GlobalPopupService,
  ) {
  }

  ngOnInit() {
    GlobalFirebaseService.instance.logEvent("wallet_sendbitcoin_enter");

    void this.init();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.sendbitcoin-title'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "close",
      iconPath: BuiltInIcon.CLOSE
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if (icon.key === 'close') {
        void this.cancelOperation();
      }
    });
  }

  ionViewDidEnter() {
    switch (this.networkWallet && this.networkWallet.masterWallet.type) {
      case WalletType.MULTI_SIG_EVM_GNOSIS:
      case WalletType.MULTI_SIG_STANDARD:
        // TODO: reject transaction if multi sign (show error popup)
        void this.cancelOperation();
        break;
      default:
        break;
    }
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponse) {
      void this.cancelOperation(false);
    }
  }

  async init() {
    const navigation = this.router.getCurrentNavigation();
    this.receivedIntent = navigation.extras.state as EssentialsIntentPlugin.ReceivedIntent;
    this.sendBitcoinParam = this.receivedIntent.params.payload.params[0]

    this.targetNetwork = WalletNetworkService.instance.getNetworkByKey('btc');

    this.currentNetworkName = this.targetNetwork.name;

    let masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
    this.networkWallet = await this.targetNetwork.createNetworkWallet(masterWallet, false);
    if (!this.networkWallet) return;

    this.btcSubWallet = <BTCSubWallet>this.networkWallet.getMainTokenSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.
    if (!this.btcSubWallet) return;

    await this.btcSubWallet.updateBalance()
    this.balance = await this.btcSubWallet.getDisplayBalance();


    // TODO: feeRate
    // if (this.coinTransferService.payloadParam.feeRate) {
    //   this.feeRate = Util.getDecimalString(this.coinTransferService.payloadParam.gas);
    // } else {
      try {
        this.feeRate = await this.btcSubWallet.estimateTransferTransactionGas();
        this.fees = (new BigNumber(this.feeRate)).dividedBy(Config.SATOSHI);
      }
      catch (err) {
        // TODO:
        Logger.warn("wallet", "Can not get the feeRate");
      }
    // }

    this.loading = false
  }

  /**
   * Cancel the vote operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse(
      { txid: null, status: 'cancelled' },
      this.receivedIntent.intentId, navigateBack
    );
  }

  private async sendIntentResponse(result, intentId, navigateBack = true) {
    this.alreadySentIntentResponse = true;
    await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
  }

  goTransaction() {
    void this.checkValue();
  }

  async checkValue(): Promise<void> {
    // Nothing to check

    await this.createTransaction();
  }

  public balanceIsEnough() {
    return this.getTotalTransactionCostInCurrency().totalAsBigNumber.lte(this.balance);
  }

  /**
   * Returns the total transaction cost, Currency value + fees, in currency.
   *
   * Input values in "payloadParam" are in SAT
   */
  public getTotalTransactionCostInCurrency(): { totalAsBigNumber: BigNumber; total: string; valueAsBigNumber: BigNumber; value: string; feesAsBigNumber: BigNumber; fees: string; currencyFee: string; } {
    let currencyValue = new BigNumber(this.sendBitcoinParam.satAmount).dividedBy(Config.SATOSHI);
    let total = currencyValue.plus(this.fees);
    let currencyFee = this.btcSubWallet.getAmountInExternalCurrency(this.fees);

    return {
      totalAsBigNumber: total,
      total: total.toFixed(),
      valueAsBigNumber: currencyValue,
      value: currencyValue.toFixed(),
      feesAsBigNumber: this.fees,
      fees: this.fees.toFixed(),
      currencyFee: currencyFee.toFixed()
    }
  }

  // ELA, HT, etc
  public getCurrencyInUse(): string {
    return this.btcSubWallet.getDisplayTokenName();
  }

  // CNY, USD, etc
  public getNativeCurrencyInUse(): string {
    return CurrencyService.instance.selectedCurrency.symbol;
  }

  async createTransaction() {
    Logger.log('wallet', "Calling createPaymentTransaction(): ", this.coinTransferService.payloadParam);

    await this.native.showLoading(this.translate.instant('common.please-wait'));

    this.signingAndTransacting = true;
    let rawTx = null;
    try {
      rawTx = await this.btcSubWallet.createPaymentTransaction(
        this.sendBitcoinParam.payAddress,
        this.getTotalTransactionCostInCurrency().valueAsBigNumber,
        ''
      );
    } catch (err) {
      await this.parseException(err);
    }

    await this.native.hideLoading();

    Logger.log('wallet', 'Created raw BTC transaction:', rawTx);

    if (rawTx) {
      const transfer = new Transfer();
      Object.assign(transfer, {
        masterWalletId: this.networkWallet.id,
        subWalletId: this.btcSubWallet.id,
        //rawTransaction: rawTx,
        payPassword: '',
        action: this.receivedIntent.action,
        intentId: this.receivedIntent.intentId,
      });

      try {
        const result = await this.btcSubWallet.signAndSendRawTransaction(rawTx, transfer, false);
        await this.sendIntentResponse(
          { txid: result.txid, status: result.status },
          this.receivedIntent.intentId
        );
      }
      catch (err) {
        Logger.error('wallet', 'SendBitcoinPage publishTransaction error:', err)
        await this.sendIntentResponse(
          { txid: null, status: 'error' },
          this.receivedIntent.intentId
        );
      }
    } else {
      await this.sendIntentResponse(
        { txid: null, status: 'error' },
        this.receivedIntent.intentId
      );
    }

    this.signingAndTransacting = false;
  }

  private async parseException(err) {
    Logger.error('wallet', "transaction error:", err);
    let reworkedEx = WalletExceptionHelper.reworkedWeb3Exception(err);
    if (reworkedEx instanceof Web3Exception) {
        await this.globalPopupService.ionicAlert("wallet.transaction-fail", "common.network-or-server-error");
    } else {
        let message: string = typeof (err) === "string" ? err : err.message;
        await this.globalPopupService.ionicAlert("wallet.transaction-fail", message);
    }
  }
}
