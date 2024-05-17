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
import { Logger } from 'src/app/logger';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { BTCSubWallet } from 'src/app/wallet/model/networks/btc/subwallets/btc.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';
import * as BTC from 'bitcoinjs-lib';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { BTCSignDataType } from 'src/app/wallet/model/btc.types';
import { BTCSafe } from 'src/app/wallet/model/networks/btc/safes/btc.safe';

type SignBitcoinDataParam = {
  rawData: string, // including random data or a real BTC raw transaction (CAUTION).
  type: BTCSignDataType,
}

@Component({
  selector: 'app-signbitcoindata',
  templateUrl: './signbitcoindata.page.html',
  styleUrls: ['./signbitcoindata.page.scss'],
})
export class SignBitcoinDataPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public isSignDataEnable = false;
  public targetNetwork: AnyNetwork = null;
  public networkWallet: AnyNetworkWallet = null;
  public btcSubWallet: BTCSubWallet = null;
  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  public intentParams: SignBitcoinDataParam = null
  public balanceBTC: BigNumber = null;
  public feesAsBigNumber: BigNumber = null;
  public currencyFee = null;

  public loading = true;
  public actionIsGoing = false;

  private alreadySentIntentResponse = false;

  public currentNetworkName = ''

  public transaction: BTC.Transaction = null;

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
    private prefs: GlobalPreferencesService,
  ) {
  }

  ngOnInit() {
    GlobalFirebaseService.instance.logEvent("wallet_signbitcoindata_enter");

    void this.init();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.signbitcoindata-title'));
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

    // This intent is currently only enabled in development mode.
    this.isSignDataEnable = await this.prefs.getBitcoinSignData(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate);

    this.targetNetwork = WalletNetworkService.instance.getNetworkByKey('btc');

    this.currentNetworkName = this.targetNetwork.name;

    let masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
    this.networkWallet = await this.targetNetwork.createNetworkWallet(masterWallet, false);
    if (!this.networkWallet)
      return;

    this.btcSubWallet = <BTCSubWallet>this.networkWallet.getMainTokenSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.
    if (!this.btcSubWallet)
      return;

    // TODO: Show useful tx info
    // try {
    //   this.transaction = BTC.Transaction.fromHex(this.intentParams.rawData);
    //   Logger.log('wallet', 'SignBitcoinDataPage transaction:', this.transaction)

      // let totalOutputValues = 0;
      // this.transaction.outs.forEach( o => totalOutputValues += o.value)

      // if (this.intentParams.value > totalOutputValues) {
      //   this.feesAsBigNumber = satsToBtc(new BigNumber(this.intentParams.value - totalOutputValues));
      //   this.currencyFee = this.btcSubWallet.getAmountInExternalCurrency(this.feesAsBigNumber);
      // }
    // } catch (e) {
    //   Logger.warn('wallet', 'BTC.Transaction.fromBuffer error:', e)
    // }

    void this.updateBalance();

    this.loading = false;
  }

  private async updateBalance() {
    try {
      await this.btcSubWallet.updateBalance()
      this.balanceBTC = await this.btcSubWallet.getDisplayBalance();
    } catch (e) {
      setTimeout(() => {
        void this.updateBalance();
      }, 1000);
    }
  }

  async signData() {
    try {
      // let prevOutScripts = Buffer.from(this.intentParams.prevOutScript, 'hex')
      // // let scriptString = bitcoin.script.toASM(bitcoin.script.decompile(prevOutScripts))
      // // Logger.warn('wallet', 'SignBitcoinDataPage scriptString:', scriptString)
      // let digest = this.transaction.hashForWitnessV0(this.intentParams.inIndex, prevOutScripts, this.intentParams.value, BTC.Transaction.SIGHASH_ALL).toString('hex')

      let signature = await (this.networkWallet.safe as unknown as BTCSafe).signData(this.intentParams.rawData, this.intentParams.type);
      // Logger.log('wallet', 'signature:', signature)
      await this.sendIntentResponse({ signature: signature, status: 'ok' });
    } catch (e) {
      Logger.warn('wallet', 'SignBitcoinDataPage sign data error:', e)
      await this.sendIntentResponse({ signature: null, status: 'error' });
    }
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

  async goTransaction() {
    await this.signData()
  }


  public balanceIsEnough() {
    return true;
  }

  // ELA, HT, etc
  public getCurrencyInUse(): string {
    return this.btcSubWallet.getDisplayTokenName();
  }

  // CNY, USD, etc
  public getNativeCurrencyInUse(): string {
    return CurrencyService.instance.selectedCurrency.symbol;
  }
}
