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
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { ElastosMainChainNetworkBase } from 'src/app/wallet/model/networks/elastos/mainchain/network/elastos.networks';
import { SHA256 } from 'src/app/helpers/crypto/sha256';
import { Util } from 'src/app/model/util';

/**
 * This operation is dangerous and is deprecated, but we handle it for backward compatibility
 * with some dApps.
 */
@Component({
  selector: 'app-elamainsignmessage',
  templateUrl: './elamainsignmessage.page.html',
  styleUrls: ['./elamainsignmessage.page.scss'],
})
export class ElamainSignMessagePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public targetNetwork: AnyNetwork = null;
  public networkWallet: AnyNetworkWallet = null;
  public elamainSubWallet: MainChainSubWallet = null;

  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  private payloadToBeSigned: { digest: string, addresses?: string[] };
  private digest = null;
  public message = null;
  private specialAddresses: string[] = [];

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
    public uiService: UiService,
    private router: Router,
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

  async init() {
    const navigation = this.router.getCurrentNavigation();

    this.receivedIntent = navigation.extras.state as EssentialsIntentPlugin.ReceivedIntent;
    if (this.receivedIntent.params)
      this.payloadToBeSigned = this.receivedIntent.params.payload;

    // No message ? Just exit immediatelly
    if (!this.payloadToBeSigned) {
      Logger.warn('wallet', 'ElamainSignMessagePage invalid payload, received Intent:', this.receivedIntent)
      return await this.cancelOperation();
    }

    if (Util.isSHA256(this.payloadToBeSigned.digest)) {
      this.digest = this.payloadToBeSigned.digest;
    } else {
      this.message = this.payloadToBeSigned.digest;
      this.digest = SHA256.sha256Hash(Buffer.from(this.payloadToBeSigned.digest)).toString('hex');
    }

    this.targetNetwork = WalletNetworkService.instance.getNetworkByKey(ElastosMainChainNetworkBase.networkKey);

    this.currentNetworkName = this.targetNetwork.name;

    let masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
    this.networkWallet = await this.targetNetwork.createNetworkWallet(masterWallet, false);
    if (!this.networkWallet)
      return;

    this.elamainSubWallet = <MainChainSubWallet>this.networkWallet.getMainTokenSubWallet();
    if (!this.elamainSubWallet)
      return;

    this.getAllSpecialAddresses();
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
    const payPassword = await this.authService.getWalletPassword(this.networkWallet.masterWallet.id, true, true);
    if (payPassword === null) { // cancelled by user
      await this.cancelOperation();
      return;
    }

    try {
      let addresses = this.payloadToBeSigned.addresses;
      if (!addresses) {
        let address = this.elamainSubWallet.getRootPaymentAddress()
        addresses = [address]
      }

      let signatures = [];
      let rawMsgSig = null;
      for (let index = 0; index < addresses.length; index++) {
        if (this.specialAddresses.indexOf(addresses[index]) != -1) {
          // special address
          rawMsgSig =  await this.elamainSubWallet.signDigestWithOwnerKey(this.digest, payPassword);
        } else {
          rawMsgSig =  await this.elamainSubWallet.signDigest(addresses[index], this.digest, payPassword);
        }
        signatures.push(rawMsgSig)
      }
      void this.sendIntentResponse({
        signedDatas: signatures
      }, this.receivedIntent.intentId);
    }
    catch (e) {
      // Sign method can throw exception in case some provided content has an invalid format
      // i.e.: array value, with "address" type. In such case, we fail silently.
      Logger.warn('wallet', 'ethmain_signmessage intent error:', e)
      await this.sendIntentResponse(
        { data: null },
        this.receivedIntent.intentId
      );
    }
  }

  private getAllSpecialAddresses() {
    this.specialAddresses = [];

    let address = this.elamainSubWallet.getCRDepositAddress()
    if (address) this.specialAddresses.push(address)
    address = this.elamainSubWallet.getOwnerAddress()
    if (address) this.specialAddresses.push(address)
    address = this.elamainSubWallet.getOwnerDepositAddress()
    if (address) this.specialAddresses.push(address)
    address = this.elamainSubWallet.getOwnerStakeAddress()
    if (address) this.specialAddresses.push(address)
  }
}
