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
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { StandardMasterWallet } from 'src/app/wallet/model/masterwallets/masterwallet';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

type Message = {
  key: string;
  value: string
}

@Component({
  selector: 'app-signtypeddata',
  templateUrl: './signtypeddata.page.html',
  styleUrls: ['./signtypeddata.page.scss'],
})
export class SignTypedDataPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private networkWallet: AnyNetworkWallet = null;
  public evmSubWallet: AnyMainCoinEVMSubWallet = null;
  public showEditGasPrice = false;
  public hasOpenETHSCChain = false;

  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  private payloadToBeSigned: string;
  private dataToSign = null;
  private useV4: boolean;
  public messageList: Message[] = [];

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
    private authService: AuthService,
    private erc20service: ERC20CoinService, // Keep it to initialize the service for the ETHTransactionInfoParser
    public uiService: UiService,
    private router: Router,
    private ethTransactionService: EVMService
  ) {
  }

  ngOnInit() {
    this.init();
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
    switch (this.networkWallet && this.networkWallet.masterWallet.type) {
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
    if (!this.alreadySentIntentResponse) {
      void this.cancelOperation(false);
    }
  }

  init() {
    this.currentNetworkName = WalletNetworkService.instance.activeNetwork.value.name;

    this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);
    if (!this.networkWallet) return;

    this.evmSubWallet = this.networkWallet.getMainEvmSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.

    const navigation = this.router.getCurrentNavigation();

    this.receivedIntent = navigation.extras.state as EssentialsIntentPlugin.ReceivedIntent;
    this.payloadToBeSigned = this.receivedIntent.params.payload;
    this.useV4 = this.receivedIntent.params.useV4;
    this.dataToSign = JSON.parse(this.payloadToBeSigned);

    if (this.useV4 && this.dataToSign.message) {
      for (let p of Object.keys(this.dataToSign.message)) {
        let value;
        if (typeof this.dataToSign.message[p] == "string") {
          value = this.dataToSign.message[p]
        } else {
          value = JSON.stringify(this.dataToSign.message[p], null, 2)
        }
        this.messageList.push({key: p, value: value})
      }
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
    this.alreadySentIntentResponse = true;
    await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
  }

  async confirmSign(): Promise<void> {
    const payPassword = await this.authService.getWalletPassword(this.networkWallet.masterWallet.id);
    if (payPassword === null) { // cancelled by user
      return;
    }

    let privateKeyHexNoprefix = await (await (this.networkWallet.masterWallet as StandardMasterWallet).getPrivateKey(payPassword)).replace("0x", "");

    let privateKey = Buffer.from(privateKeyHexNoprefix, "hex");
    let signedData: string = null;

    try {
      if (this.useV4) {
        signedData = signTypedData_v4(privateKey, {
          data: this.dataToSign
        });
      }
      else {
        signedData = signTypedData(privateKey, {
          data: this.dataToSign
        });
      }

      void this.sendIntentResponse({
        signedData
      }, this.receivedIntent.intentId);
    }
    catch (e) {
      // Sign method can throw exception in case some provided content has an invalid format
      // i.e.: array value, with "address" type. In such case, we fail silently.
      Logger.error("wallet", "Sign typed data - unable to sign, sending empty response:", e);
      await this.sendIntentResponse(
        { data: null },
        this.receivedIntent.intentId
      );
    }
  }
}
