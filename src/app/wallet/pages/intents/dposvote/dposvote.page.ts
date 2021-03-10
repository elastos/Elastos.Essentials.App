/*
 * Copyright (c) 2020 Elastos Foundation
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

import { Component, OnInit, NgZone } from '@angular/core';
import { AppService } from '../../../services/app.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { IntentService } from '../../../services/intent.service';
import { TranslateService } from '@ngx-translate/core';
import { MainchainSubWallet } from '../../../model/wallets/MainchainSubWallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../../config/Config';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NavController } from '@ionic/angular';

declare let appManager: AppManagerPlugin.AppManager;

@Component({
    selector: 'app-dposvote',
    templateUrl: './dposvote.page.html',
    styleUrls: ['./dposvote.page.scss'],
})
export class DPoSVotePage implements OnInit {

    private masterWalletId: string;
    private sourceSubwallet: MainchainSubWallet = null;
    public voteAmount: string; // Estimate amount, Balance in SELA
    public chainId: string;
    private walletInfo = {};
    public intentTransfer: IntentTransfer;

    constructor(
        public walletManager: WalletManager,
        public appService: AppService,
        public coinTransferService: CoinTransferService,
        private intentService: IntentService,
        public native: Native,
        public zone: NgZone,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private navCtrl: NavController
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.appService.setTitleBarTitle(this.translate.instant('dposvote-title'));
    }

    ionViewDidEnter() {
        if (this.walletInfo["Type"] === "Multi-Sign") {
            // TODO: reject voting if multi sign (show error popup), as multi sign wallets cannot vote.
            this.cancelOperation();
        }
    }

    init() {
        this.chainId = this.coinTransferService.chainId;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.masterWalletId = this.coinTransferService.masterWalletId;

        this.sourceSubwallet = this.walletManager.getMasterWallet(this.masterWalletId).getSubWallet(this.chainId) as MainchainSubWallet;

        this.voteAmount = this.sourceSubwallet.balance.minus(this.votingFees()).dividedBy(Config.SELAAsBigNumber).toString();
        this.hasPendingVoteTransaction();
    }

    async hasPendingVoteTransaction() {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('confirmTitle', 'transaction-pending');
            this.cancelOperation();
        }
    }

    /**
     * Cancel the vote operation. Closes the screen and goes back to the calling application after
     * sending the intent response.
     */
    async cancelOperation() {
        try {
            await this.intentService.sendIntentResponse(
                { txid: null, status: 'cancelled' },
                this.intentTransfer.intentId);
        } catch (err) {
            console.error('wallet app -> dposvote pg -> cancelOperation err', err);
            this.navCtrl.back();
        }
    }

    goTransaction() {
        this.checkValue();
    }

    async checkValue() {
        try {
            // -1 mean max.
            this.createVoteProducerTransaction('-1');
        } catch (error) {
            console.log('dposvote createVoteProducerTransaction error:', error);
        }
    }

    /**
     * Fees needed to pay for the vote transaction (Estimate). The more utxo, the more fees.
     */
    votingFees(): number {
        return 20000; // SELA: 0.0002ELA
    }

    /**
     * stakeAmount: SELA
     */
    async createVoteProducerTransaction(stakeAmount: string) {
        console.log('Creating vote transaction with amount', stakeAmount);

        const rawTx =
            await this.walletManager.spvBridge.createVoteProducerTransaction(
                this.masterWalletId, this.chainId,
                '', // To address, not necessary
                stakeAmount,
                JSON.stringify(this.coinTransferService.publickeys),
                '', // Memo, not necessary
            );

        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: this.masterWalletId,
            chainId: this.chainId,
            rawTransaction: rawTx,
            payPassword: '',
            action: this.intentTransfer.action,
            intentId: this.intentTransfer.intentId,
        });

        await this.sourceSubwallet.signAndSendRawTransaction(rawTx, transfer);
    }
}

