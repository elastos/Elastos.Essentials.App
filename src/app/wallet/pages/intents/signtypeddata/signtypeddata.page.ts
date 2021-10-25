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
import { signTypedData, signTypedData_v4 } from "eth-sig-util";
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardEVMSubWallet } from 'src/app/wallet/model/wallets/evm.subwallet';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { ERC20CoinService } from 'src/app/wallet/services/erc20coin.service';
import { ETHTransactionService } from 'src/app/wallet/services/ethtransaction.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

export type SignTypedDataIntentResult = {
  signedData: string;
}

@Component({
  selector: 'app-signtypeddata',
  templateUrl: './signtypeddata.page.html',
  styleUrls: ['./signtypeddata.page.scss'],
})
export class SignTypedDataPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private networkWallet: NetworkWallet = null;
  private evmSubWallet: StandardEVMSubWallet = null;
  private walletInfo = {};
  public showEditGasPrice = false;
  public hasOpenETHSCChain = false;

  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  private payloadToBeSigned: string;
  private useV4: boolean;

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
    private ethTransactionService: ETHTransactionService
  ) {
  }

  ngOnInit() {
    this.init();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.signtypeddata-title'));
    this.titleBar.setNavigationMode(null);
  }

  ionViewDidEnter() {
    if (this.walletInfo["Type"] === "Multi-Sign") {
      // TODO: reject esctransaction if multi sign (show error popup)
      void this.cancelOperation();
    }
  }

  ionViewWillLeave() {
  }

  init() {
    this.walletInfo = this.coinTransferService.walletInfo;
    this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);
    this.evmSubWallet = this.networkWallet.getMainEvmSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.

    const navigation = this.router.getCurrentNavigation();

    this.receivedIntent = navigation.extras.state as EssentialsIntentPlugin.ReceivedIntent;
    this.payloadToBeSigned = this.receivedIntent.params.payload;
    this.useV4 = this.receivedIntent.params.useV4;
  }

  /**
   * Cancel the operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation() {
    await this.globalIntentService.sendIntentResponse(
      { data: null },
      this.receivedIntent.intentId
    );
  }

  async confirmSign(): Promise<void> {
    const payPassword = await this.authService.getWalletPassword(this.networkWallet.masterWallet.id);
    if (payPassword === null) { // cancelled by user
      return;
    }

    let privateKeyHexNoprefix = await this.walletManager.spvBridge.exportETHSCPrivateKey(this.networkWallet.masterWallet.id, this.evmSubWallet.id, payPassword);

    let dataToSign = JSON.parse(this.payloadToBeSigned);
    let privateKey = Buffer.from(privateKeyHexNoprefix, "hex");
    let signedData: string = null;

    try {
      if (this.useV4) {
        signedData = signTypedData_v4(privateKey, {
          data: dataToSign
        });
      }
      else {
        signedData = signTypedData(privateKey, {
          data: dataToSign
        });
      }

      void this.globalIntentService.sendIntentResponse({
        signedData
      }, this.receivedIntent.intentId);
    }
    catch (e) {
      // Sign method can throw exception in case some provided content has an invalid format
      // i.e.: array value, with "address" type. In such case, we fail silently.

      await this.globalIntentService.sendIntentResponse(
        { data: null },
        this.receivedIntent.intentId
      );
    }
  }
}
