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
import { Config } from '../../../config/Config';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { CoinTransferService, Transfer, IntentTransfer } from '../../../services/cointransfer.service';
import { MainchainSubWallet } from '../../../model/wallets/MainchainSubWallet';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';
import { VoteContent, VoteType } from '../../../model/SPVWalletPluginBridge';


@Component({
  selector: 'app-crmembervote',
  templateUrl: './crmembervote.page.html',
  styleUrls: ['./crmembervote.page.scss'],
})
export class CRmembervotePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    masterWalletId: string;
    sourceSubwallet: MainchainSubWallet = null;
    elastosChainCode: string; // ELA
    intentTransfer: IntentTransfer;
    transfer: Transfer = null;
    votecount = 0;

    balance: string; // Balance in SELA
    voteBalanceELA = 0; // ELA

    constructor(
        public walletManager: WalletManager,
        private coinTransferService: CoinTransferService,
        private globalIntentService: GlobalIntentService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public native: Native,
        public zone: NgZone,
        public popupProvider: PopupProvider
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
      this.titleBar.setTitle(this.translate.instant('wallet.crcouncilvote-title'));
      this.titleBar.setNavigationMode(null);
    }

    ionViewDidEnter() {
        if (this.coinTransferService.walletInfo['Type'] === 'Multi-Sign') {
            // TODO: reject voting if multi sign (show error popup), as multi sign wallets cannot vote.
            this.cancelOperation();
        }
    }

    init() {
        this.transfer = this.coinTransferService.transfer;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.elastosChainCode = this.coinTransferService.elastosChainCode;
        this.masterWalletId = this.coinTransferService.masterWalletId;
        this.sourceSubwallet = this.walletManager.getMasterWallet(this.masterWalletId).getSubWallet(this.elastosChainCode) as MainchainSubWallet;
        this.balance = this.sourceSubwallet.getDisplayBalance().toString();

        this.parseVotes();

        this.hasPendingVoteTransaction();
    }

    async hasPendingVoteTransaction() {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            this.cancelOperation();
        }
    }

    parseVotes() {
        this.votecount = 0;
        let voteBalanceSela = 0;
        for (const key of Object.keys(this.transfer.votes)) {
            if (this.transfer.votes.hasOwnProperty(key)) {
                voteBalanceSela += parseInt(this.transfer.votes[key], 10);
                this.votecount++;
            }
        }
        this.voteBalanceELA = voteBalanceSela / Config.SELA;
        Logger.log('wallet', 'totalVotes:', this.voteBalanceELA);
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
        if (this.checkValue()) {
            this.createVoteCRTransaction();
        }
    }

    /**
     * Balance needs to be greater than 0.0002ELA (or 0.1?).
     */
     votingFees(): number {
        return 20000; // SELA: 0.0002ELA
    }

    checkValue() {
        const stakeAmount = this.sourceSubwallet.balance.minus(this.votingFees());
        if (stakeAmount.isNegative()) {
            Logger.log('wallet', 'CRmembervotePage: Not enough balance:', this.sourceSubwallet.getDisplayBalance());
            this.native.toast_trans('wallet.insufficient-balance');
            return false;
        }
        return true;
    }

    async createVoteCRTransaction() {
        Logger.log('wallet', 'Creating vote CR transaction');

        let crVoteContent: VoteContent = {
          Type: VoteType.CRC,
          Candidates: this.transfer.votes
        }

        const voteContent = [crVoteContent];
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

