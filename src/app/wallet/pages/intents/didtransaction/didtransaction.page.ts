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

import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { StandardCoinName } from '../../../model/Coin';
import { TranslateService } from '@ngx-translate/core';
import { MainAndIDChainSubWallet } from '../../../model/wallets/MainAndIDChainSubWallet';
import BigNumber from 'bignumber.js';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';


@Component({
    selector: 'app-didtransaction',
    templateUrl: './didtransaction.page.html',
    styleUrls: ['./didtransaction.page.scss'],
})
export class DidTransactionPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    private masterWallet: MasterWallet;
    private sourceSubwallet: MainAndIDChainSubWallet;
    private intentTransfer: IntentTransfer;
    private balance: number; // ELA
    private chainId: string; // IDChain
    private walletInfo = {};

    constructor(
        public walletManager: WalletManager,
        public popupProvider: PopupProvider,
        private coinTransferService: CoinTransferService,
        private globalIntentService: GlobalIntentService,
        public native: Native,
        public zone: NgZone,
        private translate: TranslateService,
        public theme: GlobalThemeService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.didtransaction-title"));
    }

    ionViewDidEnter() {
      if (this.walletInfo["Type"] === "Multi-Sign") {
          // TODO: reject didtransaction if multi sign (show error popup)
          this.cancelOperation();
      }
    }

    async init() {
        this.chainId = this.coinTransferService.chainId;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);

        if (this.chainId === StandardCoinName.IDChain && !this.masterWallet.hasSubWallet(StandardCoinName.IDChain)) {
            await this.notifyNoIDChain();
            this.cancelOperation();
            return;
        }

        this.sourceSubwallet = this.masterWallet.getSubWallet(this.chainId) as MainAndIDChainSubWallet;
    }

    /**
     * Cancel the vote operation. Closes the screen and goes back to the calling application after
     * sending the intent response.
     */
    async cancelOperation() {
        await this.globalIntentService.sendIntentResponse(
            { txid: null, status: 'cancelled' },
            this.intentTransfer.intentId
        );
    }

    goTransaction() {
        this.checkValue();
    }

    notifyNoIDChain() {
        return this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.no-open-side-chain');
    }

    async checkValue() {
        if (this.balance < 0.0002) {
            this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.text-did-balance-not-enough');
            return;
        }
        const isAvailableBalanceEnough = await this.sourceSubwallet.isAvailableBalanceEnough(new BigNumber(20000));
        if (!isAvailableBalanceEnough) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.text-did-balance-not-enough');
            this.cancelOperation();
            return;
        }
        this.createIDTransaction();
    }

    async createIDTransaction() {
        Logger.log('wallet', 'Calling createIdTransaction(): ', this.coinTransferService.didrequest);

        const rawTx = await (this.sourceSubwallet as MainAndIDChainSubWallet).createIDTransaction(
              this.coinTransferService.didrequest,
              '', // Memo, not necessary
          );

        Logger.log('wallet', 'Created raw DID transaction:', rawTx);

        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: this.masterWallet.id,
            chainId: this.chainId,
            rawTransaction: rawTx,
            payPassword: '',
            action: this.intentTransfer.action,
            intentId: this.intentTransfer.intentId,
        });

        const result = await this.sourceSubwallet.signAndSendRawTransaction(rawTx, transfer);
        await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
    }
}

