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

import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { TranslateService } from '@ngx-translate/core';
import { MainchainSubWallet } from '../../../model/wallets/MainchainSubWallet';
import { Config } from '../../../config/Config';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Candidates, VoteContent, VoteType } from 'src/app/wallet/model/SPVWalletPluginBridge';


@Component({
    selector: 'app-dposvote',
    templateUrl: './dposvote.page.html',
    styleUrls: ['./dposvote.page.scss'],
})
export class DPoSVotePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    private masterWalletId: string;
    private sourceSubwallet: MainchainSubWallet = null;
    public voteAmountELA: string;
    public voteAmount: string; // Estimate amount, Balance in SELA
    public elastosChainCode: string;
    private walletInfo = {};
    public intentTransfer: IntentTransfer;

    constructor(
        public walletManager: WalletManager,
        public coinTransferService: CoinTransferService,
        public native: Native,
        public zone: NgZone,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService,
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.dposvote-title'));
        this.titleBar.setNavigationMode(null);
    }

    ionViewDidEnter() {
        if (this.walletInfo["Type"] === "Multi-Sign") {
            // TODO: reject voting if multi sign (show error popup), as multi sign wallets cannot vote.
            this.cancelOperation();
        }
    }

    init() {
        this.elastosChainCode = this.coinTransferService.elastosChainCode;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.masterWalletId = this.coinTransferService.masterWalletId;

        this.sourceSubwallet = this.walletManager.getMasterWallet(this.masterWalletId).getSubWallet(this.elastosChainCode) as MainchainSubWallet;
        // All balance can be used for voting?
        let voteInEla = this.sourceSubwallet.balance.minus(this.votingFees());
        this.voteAmountELA = voteInEla.toString()
        this.voteAmount = voteInEla.dividedBy(Config.SELAAsBigNumber).toString();
        this.hasPendingVoteTransaction();
    }

    async hasPendingVoteTransaction() {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            this.cancelOperation();
        }
    }

    /**
     * Cancel the vote operation. Closes the screen and goes back to the calling application after
     * sending the intent response.
     */
    async cancelOperation() {
        try {
            await this.globalIntentService.sendIntentResponse(
                { txid: null, status: 'cancelled' },
                this.intentTransfer.intentId);
        } catch (err) {
            Logger.error('wallet', 'wallet app -> dposvote pg -> cancelOperation err', err);
            this.globalNav.navigateBack();
        }
    }

    /**
     * Balance needs to be greater than 0.0002ELA (or 0.1?).
     */
    votingFees(): number {
        return 20000; // SELA: 0.0002ELA
    }

    /**
     *
     */
    async goTransaction() {
        Logger.log('wallet', 'Creating vote transaction.');
        const stakeAmount = this.sourceSubwallet.balance.minus(this.votingFees());
        if (stakeAmount.isNegative()) {
            Logger.log('wallet', 'DPoSVotePage: Not enough balance:', this.sourceSubwallet.getDisplayBalance());
            this.native.toast_trans('wallet.insufficient-balance');
            return false;
        }

        let candidates: Candidates = {};

        // TODO: We should include others voting?
        for (let i = 0, len = this.coinTransferService.publickeys.length; i < len; i++) {
          candidates[this.coinTransferService.publickeys[i]] = this.voteAmountELA;
        }

        let dposVoteContent: VoteContent = {
          Type: VoteType.Delegate,
          Candidates: candidates
        }

        const voteContent = [dposVoteContent];
        await this.native.showLoading(this.translate.instant('common.please-wait'));
        const rawTx = await this.sourceSubwallet.createVoteTransaction(
                voteContent,
                '', // Memo, not necessary
            );
        await this.native.hideLoading();
        if (rawTx) {
          const transfer = new Transfer();
          Object.assign(transfer, {
              masterWalletId: this.masterWalletId,
              elastosChainCode: this.elastosChainCode,
              rawTransaction: rawTx,
              payPassword: '',
              action: this.intentTransfer.action,
              intentId: this.intentTransfer.intentId,
          });

          const result = await this.sourceSubwallet.signAndSendRawTransaction(rawTx, transfer);
          await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
        } else {
          await this.globalIntentService.sendIntentResponse(
            { txid: null, status: 'error' },
            this.intentTransfer.intentId
          );
        }
    }
}

