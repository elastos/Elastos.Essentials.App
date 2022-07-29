/*
 * Copyright (c) 2021 Elastos Foundation
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
import { personalSign } from 'eth-sig-util';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { jsToSpvWalletId } from 'src/app/wallet/services/spv.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-personalsign',
  templateUrl: './personalsign.page.html',
  styleUrls: ['./personalsign.page.scss'],
})
export class PersonalSignPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private networkWallet: AnyNetworkWallet = null;
  private evmSubWallet: AnyMainCoinEVMSubWallet = null;
  public showEditGasPrice = false;
  public hasOpenETHSCChain = false;

  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  private payloadToBeSigned: string;

  private alreadySentIntentResponce = false;

  // Titlebar
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;


  constructor(
    public walletManager: WalletService,
    public popupProvider: PopupProvider,
    private coinTransferService: CoinTransferService,
    private globalIntentService: GlobalIntentService,
    public native: Native,
    public zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private authService: AuthService,
    private erc20service: ERC20CoinService, // Keep it to initialize the service for the ETHTransactionInfoParser
    public uiService: UiService,
    private router: Router,
    private ethTransactionService: EVMService
  ) {
  }

  ngOnInit() {
    void this.init();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.signtypeddata-title'));
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
    switch (this.networkWallet.masterWallet.type) {
      case WalletType.MULTI_SIG_EVM_GNOSIS:
      case WalletType.MULTI_SIG_STANDARD:
        // TODO: reject esctransaction if multi sign (show error popup)
        void this.cancelOperation();
      break;
      default:
      break;
    }
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponce) {
      void this.cancelOperation(false);
    }
  }

  async init() {
    this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);
    this.evmSubWallet = this.networkWallet.getMainEvmSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.

    const navigation = this.router.getCurrentNavigation();

    this.receivedIntent = navigation.extras.state as EssentialsIntentPlugin.ReceivedIntent;

    if (this.receivedIntent.params)
      this.payloadToBeSigned = this.receivedIntent.params.data;

    // No message ? Just exit immediatelly
    if (!this.payloadToBeSigned) {
      await this.cancelOperation();
    }
  }

  /**
   * Cancel the operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse(
      { data: null },
      this.receivedIntent.intentId, navigateBack
    );
  }

  private async sendIntentResponse(result, intentId, navigateBack = true) {
    this.alreadySentIntentResponce = true;
    await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
  }

  async confirmSign(): Promise<void> {
    const payPassword = await this.authService.getWalletPassword(this.networkWallet.masterWallet.id);
    if (payPassword === null) { // cancelled by user
      return;
    }

    let privateKeyHexNoprefix = await this.walletManager.spvBridge.exportETHSCPrivateKey(jsToSpvWalletId(this.networkWallet.masterWallet.id), this.evmSubWallet.id, payPassword);

    let privateKey = Buffer.from(privateKeyHexNoprefix, "hex");
    let signedData: string = null;

    try {
      signedData = personalSign(privateKey, {
        data: this.payloadToBeSigned
      });

      void this.sendIntentResponse({
        signedData
      }, this.receivedIntent.intentId);
    }
    catch (e) {
      // Sign method can throw exception in case some provided content has an invalid format
      // i.e.: array value, with "address" type. In such case, we fail silently.
      Logger.warn('wallet', ' personalSign error:', e)
      await this.sendIntentResponse(
        { data: null },
        this.receivedIntent.intentId
      );
    }
  }
}
