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
import { MenuSheetMenu } from 'src/app/components/menu-sheet/menu-sheet.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { Web3Exception } from 'src/app/model/exceptions/web3.exception';
import { BTCFeeSpeed, GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Config } from 'src/app/wallet/config/Config';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { btcToSats, satsToBtc } from 'src/app/wallet/model/networks/btc/conversions';
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
  public intentParams: SendBitcoinParam = null
  public balanceBTC: BigNumber;
  public sendAmountOfBTC: BigNumber;
  public satPerKB: number;
  public feesBTC: BigNumber;
  private forcedFeeSpeed = BTCFeeSpeed.AVERAGE; // default
  private feeSpeedsInSatPerVB: {
    [index: number]: number
  } = {};
  public showEditFeeRate = false;
  public loading = true;
  public actionIsGoing = false;

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
    this.intentParams = this.receivedIntent.params.payload.params[0]
    this.sendAmountOfBTC = new BigNumber(this.intentParams.satAmount).dividedBy(Config.SATOSHI);

    this.targetNetwork = WalletNetworkService.instance.getNetworkByKey('btc');

    this.currentNetworkName = this.targetNetwork.name;

    let masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
    this.networkWallet = await this.targetNetwork.createNetworkWallet(masterWallet, false);
    if (!this.networkWallet)
      return;

    this.btcSubWallet = <BTCSubWallet>this.networkWallet.getMainTokenSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.
    if (!this.btcSubWallet)
      return;

    await this.btcSubWallet.updateBalance()
    this.balanceBTC = await this.btcSubWallet.getDisplayBalance();

    if (this.intentParams.satPerVB) {
      // Fee rate is forced in the intent by the caller
      this.satPerKB = this.intentParams.satPerVB * 1000;
      this.showEditFeeRate = false;
    } else {
      this.showEditFeeRate = true;
      void this.computeBTCFeeRate();
    }

    let feesSAT: number = null;
    try {
      feesSAT = await this.btcSubWallet.estimateTransferTransactionGas(this.forcedFeeSpeed, this.satPerKB, this.sendAmountOfBTC);
    }
    catch (err) {
      // TODO:
      Logger.warn("wallet", "Can not get the feeRate", err);
    }

    this.feesBTC = satsToBtc(feesSAT);
    this.loading = false;
  }

  /**
   * Cancel the intent operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse({ txid: null, status: 'cancelled' }, navigateBack);
  }

  private async sendIntentResponse(result, navigateBack = true) {
    this.alreadySentIntentResponse = true;
    await this.globalIntentService.sendIntentResponse(result, this.receivedIntent.intentId, navigateBack);
  }

  goTransaction() {
    void this.checkValue();
  }

  async checkValue(): Promise<void> {
    // Nothing to check
    await this.createTransaction();
  }

  public balanceIsEnough() {
    return this.getTotalTransactionCostInCurrency().totalAsBigNumber.lte(this.balanceBTC);
  }

  /**
   * Returns the total transaction cost, Currency value + fees, in currency.
   *
   * Input values in "payloadParam" are in SAT
   */
  public getTotalTransactionCostInCurrency(): { totalAsBigNumber: BigNumber; total: string; valueAsBigNumber: BigNumber; value: string; feesAsBigNumber: BigNumber; fees: string; currencyFee: string; } {
    let total = this.sendAmountOfBTC.plus(this.feesBTC);
    let currencyFee = this.btcSubWallet.getAmountInExternalCurrency(this.feesBTC);

    return {
      totalAsBigNumber: total,
      total: total.toFixed(),
      valueAsBigNumber: this.sendAmountOfBTC,
      value: this.sendAmountOfBTC.toFixed(),
      feesAsBigNumber: this.feesBTC,
      fees: this.feesBTC.toFixed(),
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

  /**
   * Creates the payment transaction and publishes it.
   */
  async createTransaction() {
    Logger.log('wallet', "Calling createPaymentTransaction(): ", this.intentParams);

    await this.native.showLoading(this.translate.instant('common.please-wait'));

    this.signingAndTransacting = true;
    let rawTx = null;
    try {
      rawTx = await this.btcSubWallet.createPaymentTransaction(
        this.intentParams.payAddress,
        this.getTotalTransactionCostInCurrency().valueAsBigNumber,
        '',
        this.forcedFeeSpeed,
        this.satPerKB
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
        await this.sendIntentResponse({ txid: result.txid, status: result.status });
      }
      catch (err) {
        Logger.error('wallet', 'SendBitcoinPage publishTransaction error:', err)
        await this.sendIntentResponse({ txid: null, status: 'error' });
      }
    } else {
      await this.sendIntentResponse({ txid: null, status: 'error' });
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

  /**
   * Computes the fee user has to pay, in sat/vB, for all the possible fee speed the user can choose.
   */
  private async computeBTCFeeRate() {
    try {
      // BTC/kB to sat/vB
      let fast = await GlobalBTCRPCService.instance.estimatesmartfee(this.btcSubWallet.rpcApiUrl, BTCFeeSpeed.FAST)
      this.feeSpeedsInSatPerVB[BTCFeeSpeed.FAST] = btcToSats(fast).dividedBy(1000).toNumber();

      let avg = await GlobalBTCRPCService.instance.estimatesmartfee(this.btcSubWallet.rpcApiUrl, BTCFeeSpeed.AVERAGE)
      this.feeSpeedsInSatPerVB[BTCFeeSpeed.AVERAGE] = btcToSats(avg).dividedBy(1000).toNumber();

      let slow = await GlobalBTCRPCService.instance.estimatesmartfee(this.btcSubWallet.rpcApiUrl, BTCFeeSpeed.SLOW)
      this.feeSpeedsInSatPerVB[BTCFeeSpeed.SLOW] = btcToSats(slow).dividedBy(1000).toNumber();
    } catch (e) {
      Logger.warn('wallet', 'computeBTCFeeRate() error:', e)
    }
  }

  /**
   * Selects the fee speed manually from the UI and recomputes transaction cost based on this new fee rate.
   */
  private async setFeeSpeed(feeSpeed: BTCFeeSpeed) {
    this.forcedFeeSpeed = feeSpeed;

    // Recomputes fees
    this.actionIsGoing = true;
    try {
      const forcedSatsPerKB = this.feeSpeedsInSatPerVB[this.forcedFeeSpeed] * 1000;
      let feesSAT = await this.btcSubWallet.estimateTransferTransactionGas(this.forcedFeeSpeed, forcedSatsPerKB, this.sendAmountOfBTC);
      this.feesBTC = satsToBtc(feesSAT);
    } catch (e) {
        let stringifiedError = "" + e;
        let message = 'Failed to estimate fee';
        if (stringifiedError.indexOf("Utxo is not enough") >= 0) {
          message = 'wallet.insufficient-balance';
        }
        this.native.toast_trans(message, 4000);
    }
    this.actionIsGoing = false;
  }

  private buildBTCFeerateMenuItems(): MenuSheetMenu[] {
    return [
      {
        title: this.getFeeSpeedTitle(BTCFeeSpeed.FAST),
        subtitle: this.feeSpeedsInSatPerVB[BTCFeeSpeed.FAST] + ' sat/vB',
        routeOrAction: () => {
          void this.setFeeSpeed(BTCFeeSpeed.FAST);
        }
      },
      {
        title: this.getFeeSpeedTitle(BTCFeeSpeed.AVERAGE),
        subtitle: this.feeSpeedsInSatPerVB[BTCFeeSpeed.AVERAGE] + ' sat/vB',
        routeOrAction: () => {
          void this.setFeeSpeed(BTCFeeSpeed.AVERAGE);
        }
      },
      {
        title: this.getFeeSpeedTitle(BTCFeeSpeed.SLOW),
        subtitle: this.feeSpeedsInSatPerVB[BTCFeeSpeed.SLOW] + ' sat/vB',
        routeOrAction: () => {
          void this.setFeeSpeed(BTCFeeSpeed.SLOW);
        }
      }
    ]
  }

  /**
   * Choose a fee speed
   */
  public pickBTCFeeSpeed() {
    if (!this.feeSpeedsInSatPerVB[BTCFeeSpeed.SLOW]) {
      Logger.warn('wallet', 'Can not get the btc fee rate.')
      return
    }
    let menuItems: MenuSheetMenu[] = this.buildBTCFeerateMenuItems();

    let menu: MenuSheetMenu = {
      title: GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-select-title"),
      items: menuItems
    };

    void GlobalNativeService.instance.showGenericBottomSheetMenuChooser(menu);
  }

  public getFeeSpeedTitle(btcFeerate) {
    switch (btcFeerate) {
      case BTCFeeSpeed.AVERAGE:
        return GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-avg");
      case BTCFeeSpeed.SLOW:
        return GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-slow");
      default: // BTCFeeRate.Fast
        return GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-fast");
    }
  }

  public getCurrentFeeSpeedTitle() {
    return this.getFeeSpeedTitle(this.forcedFeeSpeed);
  }
}
