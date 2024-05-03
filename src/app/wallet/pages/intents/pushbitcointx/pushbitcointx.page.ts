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
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-pushbitcointx',
  templateUrl: './pushbitcointx.page.html',
  styleUrls: ['./pushbitcointx.page.scss'],
})
export class PushBitcoinTxPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public targetNetwork: AnyNetwork = null;
  public networkWallet: AnyNetworkWallet = null;
  public btcSubWallet: BTCSubWallet = null;
  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  public intentParams = null
  public rawtx = null;

  public loading = true;
  public actionIsGoing = false;

  private alreadySentIntentResponse = false;

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
    GlobalFirebaseService.instance.logEvent("wallet_pushbitcointx_enter");

    void this.init();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.pushbitcointx-title'));
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
    if (this.intentParams?.rawtx) {
      this.rawtx = this.intentParams.rawtx
    } else {
      this.rawtx = this.intentParams;
    }

    this.targetNetwork = WalletNetworkService.instance.getNetworkByKey('btc');

    this.currentNetworkName = this.targetNetwork.name;

    let masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
    this.networkWallet = await this.targetNetwork.createNetworkWallet(masterWallet, false);
    if (!this.networkWallet)
      return;

    this.btcSubWallet = <BTCSubWallet>this.networkWallet.getMainTokenSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.
    if (!this.btcSubWallet)
      return;

    // TODO: Show tx info
    // const txBuffer = Buffer.from(this.rawtx, 'hex');
    // let transaction = BTC.Transaction.fromBuffer(txBuffer);
    // Logger.log('wallet', 'PushBitcoinTxPage transaction:', transaction)

    this.loading = false;
  }

  async pushTx() {
    if (this.receivedIntent?.params?.payload?.params[0]) {
      try {
        const result = await this.btcSubWallet.sendSignedTransaction(this.rawtx, null, false);
        await this.sendIntentResponse({ txid: result.txid, status: result.status });
      }
      catch (err) {
        Logger.error('wallet', 'PushBitcoinTxPage sendSignedTransaction error:', err)
        await this.sendIntentResponse({ txid: null, status: 'error' });
      }
    } else {
      await this.sendIntentResponse({ txid: null, status: 'error' });
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
}
