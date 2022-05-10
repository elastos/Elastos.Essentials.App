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
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Config } from '../../../config/Config';
import { VoteContent, VoteType } from '../../../model/SPVWalletPluginBridge';
import { MainchainSubWallet } from '../../../model/wallets/elastos/mainchain.subwallet';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletService } from '../../../services/wallet.service';


@Component({
    selector: 'app-crmembervote',
    templateUrl: './crmembervote.page.html',
    styleUrls: ['./crmembervote.page.scss'],
})
export class CRmembervotePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    masterWalletId: string;
    sourceSubwallet: MainchainSubWallet = null;
    subWalletId: string; // ELA
    intentTransfer: IntentTransfer;
    transfer: Transfer = null;
    votecount = 0;

    balance: string; // Balance in SELA
    voteBalanceELA = 0; // ELA

    private alreadySentIntentResponce = false;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;


    constructor(
        public walletManager: WalletService,
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
        if (this.coinTransferService.walletInfo['Type'] === 'Multi-Sign') {
            // TODO: reject voting if multi sign (show error popup), as multi sign wallets cannot vote.
            void this.cancelOperation();
        }
    }

    ngOnDestroy() {
        if (!this.alreadySentIntentResponce) {
            void this.cancelOperation(false);
        }
    }

    init() {
        this.transfer = this.coinTransferService.transfer;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.subWalletId = this.coinTransferService.subWalletId;
        this.masterWalletId = this.coinTransferService.masterWalletId;
        this.sourceSubwallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId).getSubWallet(this.subWalletId) as MainchainSubWallet;
        this.balance = this.sourceSubwallet.getDisplayBalance().toString();

        this.parseVotes();

        void this.hasPendingVoteTransaction();
    }

    async hasPendingVoteTransaction() {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            void this.cancelOperation();
        }
    }

    parseVotes() {
        this.votecount = 0;
        let voteBalanceSela = 0;
        for (const key of Object.keys(this.transfer.votes)) {
            // eslint-disable-next-line no-prototype-builtins
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
    async cancelOperation(navigateBack = true) {
        await this.sendIntentResponse(
            { txid: null, status: 'cancelled' },
            this.intentTransfer.intentId, navigateBack
        );
    }

    private async sendIntentResponse(result, intentId, navigateBack = true) {
        this.alreadySentIntentResponce = true;
        await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
    }

    goTransaction() {
        if (this.checkValue()) {
            void this.createVoteCRTransaction();
        }
    }

    /**
     * Balance needs to be greater than 0.0002ELA (or 0.1?).
     */
    votingFees(): number {
        return 20000; // The unit is SELA, 20000 SELA = 0.0002ELA
    }

    checkValue() {
        const stakeAmount = this.sourceSubwallet.getRawBalance().minus(this.votingFees());
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
                subWalletId: this.subWalletId,
                rawTransaction: rawTx,
                payPassword: '',
                action: this.intentTransfer.action,
                intentId: this.intentTransfer.intentId,
            });

            const result = await this.sourceSubwallet.signAndSendRawTransaction(rawTx, transfer);
            await this.sendIntentResponse(result, transfer.intentId);
        } else {
            await this.sendIntentResponse(
                { txid: null, status: 'error' },
                this.intentTransfer.intentId
            );
        }
    }
}

