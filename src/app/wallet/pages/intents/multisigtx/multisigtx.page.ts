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
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardMultiSigMasterWallet } from 'src/app/wallet/model/masterwallets/standard.multisig.masterwallet';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { OfflineTransaction, OfflineTransactionType } from 'src/app/wallet/model/tx-providers/transaction.types';
import { MultiSigService, PendingMultiSigTransaction } from 'src/app/wallet/services/multisig.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { OfflineTransactionsService } from 'src/app/wallet/services/offlinetransactions.service';
import { WalletUIService } from 'src/app/wallet/services/wallet.ui.service';
import { CoinTransferService, IntentTransfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';
import { CoinTxInfoParams } from '../../wallet/coin/coin-tx-info/coin-tx-info.page';

type MultiSigTxIntent = IntentTransfer & {
  params: {
    t: string;
  }
}

@Component({
  selector: 'app-multisigtx',
  templateUrl: './multisigtx.page.html',
  styleUrls: ['./multisigtx.page.scss'],
})
export class MultiSigTxPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private networkWallet: AnyNetworkWallet = null;
  private receivedIntent: MultiSigTxIntent;
  private multiSigWallet: StandardMultiSigMasterWallet = null;

  public initializationComplete = false;
  public txInfo: PendingMultiSigTransaction = null;
  public transactionKey = "";
  public unknownNetworkError = false;

  constructor(
    public walletManager: WalletService,
    public popupProvider: PopupProvider,
    private coinTransferService: CoinTransferService,
    private globalIntentService: GlobalIntentService,
    private globalNativeService: GlobalNativeService,
    public native: Native,
    public zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    public uiService: UiService,
    private walletUIService: WalletUIService,
    private networksService: WalletNetworkService,
    private offlineTransactionsService: OfflineTransactionsService,
    private multiSigService: MultiSigService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Multisig transaction");
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "close",
      iconPath: BuiltInIcon.CLOSE
    });
    this.titleBar.addOnItemClickedListener((icon) => {
      if (icon.key === 'close') {
        void this.cancelOperation();
      }
    });

    void this.init();
  }

  ionViewWillLeave() {
  }

  ngOnDestroy() {
    void this.cancelOperation(false);
  }

  init() {
    this.receivedIntent = <MultiSigTxIntent>this.coinTransferService.intentTransfer;
    //this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);

    Logger.log("wallet", "Multisig Transaction intent params", this.receivedIntent.params);

    this.initializationComplete = true;
    this.transactionKey = this.receivedIntent.params.t;
    void this.multiSigService.fetchPendingTransaction(this.receivedIntent.params.t).then(async txInfo => {
      Logger.log("wallet", "Pending transaction info retrieved:", txInfo);
      this.txInfo = txInfo;

      if (txInfo) {
        // Auto switch (+ notif) to the right network, if not currently the same network
        let targetNetworkKey = this.txInfo.network;
        let network = this.networksService.getNetworkByKey(targetNetworkKey);
        if (!network) {
          this.unknownNetworkError = true;
        }
        else {
          if (this.networksService.activeNetwork.value.key !== network.key) {
            // Not the right network, auto switch + informa user
            await this.networksService.setActiveNetwork(network);

            this.globalNativeService.genericToast(`Switched to ${network.name}`);
          }
        }
      }

      this.initializationComplete = false;
    });
  }

  public async pickMultiSigWallet() {
    let pickedWallet = await this.walletUIService.pickWallet(networkWallet => {
      // Choose only among multisig wallets
      if (!(networkWallet.masterWallet instanceof StandardMultiSigMasterWallet))
        return false;

      return true;
    });
    if (pickedWallet) {
      this.multiSigWallet = <StandardMultiSigMasterWallet>pickedWallet.masterWallet;
      this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.multiSigWallet.id);
    }
  }

  /**
   * Cancel the vote operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse({}, this.receivedIntent.intentId, navigateBack);
  }

  private async sendIntentResponse(result, intentId, navigateBack = true) {
    await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
  }

  public hasErrors(): boolean {
    return this.unknownNetworkError;
  }

  public canContinue(): boolean {
    return !this.hasErrors() && !this.initializationComplete && !!this.multiSigWallet && !!this.networkWallet;
  }

  public async continue() {
    await this.sendIntentResponse({}, this.receivedIntent.intentId);

    let subWallet = this.networkWallet.getMultiSigSubWallet();

    let offlineTransaction: OfflineTransaction<any> = {
      transactionKey: this.transactionKey,
      type: OfflineTransactionType.MULTI_SIG_STANDARD,
      updated: moment().unix(),
      rawTx: this.txInfo.rawTransaction
    };

    await this.offlineTransactionsService.storeTransaction(subWallet, offlineTransaction);

    Logger.log("wallet", "Multisig intent screen created an initial offline transaction from an api info:", offlineTransaction, this.txInfo);

    let params: CoinTxInfoParams = {
      masterWalletId: this.networkWallet.id,
      subWalletId: subWallet.id,
      offlineTransaction
    };
    Native.instance.go("/wallet/coin-tx-info", params);
  }
}
