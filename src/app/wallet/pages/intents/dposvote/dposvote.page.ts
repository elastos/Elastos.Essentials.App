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

import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { VoteContentInfo, VoteContentType, VotesContentInfo, VotingInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { StakeService } from 'src/app/voting/staking/services/stake.service';
import { Candidates, VoteTypeString } from 'src/app/wallet/model/elastos.types';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { Config } from '../../../config/Config';
import { MainChainSubWallet } from '../../../model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletService } from '../../../services/wallet.service';


@Component({
    selector: 'app-dposvote',
    templateUrl: './dposvote.page.html',
    styleUrls: ['./dposvote.page.scss'],
})
export class DPoSVotePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    private masterWalletId: string;
    private sourceSubwallet: MainChainSubWallet = null;
    public voteAmountELA: string;
    public voteAmount: string; // Estimate amount, Balance in SELA
    public subWalletId: string;
    public intentTransfer: IntentTransfer;

    private alreadySentIntentResponce = false;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public walletManager: WalletService,
        public coinTransferService: CoinTransferService,
        public native: Native,
        public zone: NgZone,
        public popupProvider: PopupProvider,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService,
        private stakeService: StakeService,
    ) {
        void this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.dposvote-title'));
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
        switch (this.sourceSubwallet.masterWallet.type) {
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
        this.subWalletId = this.coinTransferService.subWalletId;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.masterWalletId = this.coinTransferService.masterWalletId;

        this.sourceSubwallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.masterWalletId).getSubWallet(this.subWalletId) as MainChainSubWallet;
        await this.sourceSubwallet.updateBalanceSpendable();

        await this.stakeService.getVoteRights();
        if (this.stakeService.votesRight.totalVotesRight > 0) {
            let stakeAmount = this.stakeService.votesRight.totalVotesRight;
            this.voteAmount = stakeAmount.toString();
            this.voteAmountELA = Util.accMul(stakeAmount, Config.SELA).toString();
        }
        else {
            let voteInEla = this.sourceSubwallet.getRawBalanceSpendable().minus(this.votingFees());
            if (voteInEla.isPositive) {
                this.voteAmountELA = voteInEla.toString()
                this.voteAmount = voteInEla.dividedBy(Config.SELAAsBigNumber).toString();
            }
        }
        void this.hasPendingVoteTransaction();
    }

    async hasPendingVoteTransaction() {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            void this.cancelOperation();
        }
    }

    /**
     * Cancel the vote operation. Closes the screen and goes back to the calling application after
     * sending the intent response.
     */
    async cancelOperation(navigateBack = true) {
        try {
            await this.sendIntentResponse(
                { txid: null, status: 'cancelled' },
                this.intentTransfer.intentId, navigateBack);
        } catch (err) {
            Logger.error('wallet', 'wallet app -> dposvote pg -> cancelOperation err', err);
            void this.globalNav.navigateBack();
        }
    }

    private async sendIntentResponse(result, intentId, navigateBack = true) {
        this.alreadySentIntentResponce = true;
        await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
    }

    /**
     * Balance needs to be greater than 0.00001ELA.
     * Reserve some utxos so that other votes can be executed without changing the dpos voting.
     */
    votingFees(): number {
        return 100000; // The unit is SELA, 100000 SELA =  0.001ELA
    }

    /**
     *
     */
    async goTransaction() {
        Logger.log('wallet', 'Creating vote transaction.');
        const stakeAmount = this.sourceSubwallet.getRawBalance().minus(this.votingFees());
        if (stakeAmount.isNegative()) {
            Logger.log('wallet', 'DPoSVotePage: Not enough balance:', this.sourceSubwallet.getDisplayBalance());
            this.native.toast_trans('wallet.insufficient-balance');
            return false;
        }

        if (!this.voteAmount) return;

        if (this.stakeService.votesRight.totalVotesRight > 0) {
            await this.createVoteTransactionV2();
        }
        else {
            await this.createVoteTransaction();
        }
    }

    async createVoteTransaction() {
        let candidates: Candidates = {};

        // TODO: We should include others voting?
        for (let i = 0, len = this.coinTransferService.publickeys.length; i < len; i++) {
            candidates[this.coinTransferService.publickeys[i]] = this.voteAmountELA;
        }

        let dposVoteContent: VoteContentInfo = {
            Type: VoteTypeString.Delegate,
            Candidates: candidates
        }

        const voteContent = [dposVoteContent];
        await this.native.showLoading(this.translate.instant('common.please-wait'));
        const rawTx = await this.sourceSubwallet.createVoteTransaction(
            voteContent,
            '', // Memo, not necessary
        );
        await this.native.hideLoading();

        await this.signAndSendRawTransaction(rawTx);
    }

    async createVoteTransactionV2() {
        var votesInfo = [];
        // TODO: We should include others voting?
        for (let i = 0, len = this.coinTransferService.publickeys.length; i < len; i++) {
            votesInfo.push({
                Candidate: this.coinTransferService.publickeys[i],
                Votes: this.voteAmountELA,
                Locktime: 0
            })
        }

        const voteContents: VotesContentInfo[] = [
            {
                VoteType: VoteContentType.Delegate,
                VotesInfo: votesInfo
            }
        ];

        const payload: VotingInfo = {
            Version: 0,
            Contents: voteContents
        };

        await this.native.showLoading(this.translate.instant('common.please-wait'));
        const rawTx = await this.sourceSubwallet.createDPoSV2VoteTransaction(
            payload,
            '', // Memo, not necessary
        );
        await this.native.hideLoading();
        await this.signAndSendRawTransaction(rawTx);
    }

    async signAndSendRawTransaction(rawTx) {
        if (rawTx) {
            const transfer = new Transfer();
            Object.assign(transfer, {
                masterWalletId: this.masterWalletId,
                subWalletId: this.subWalletId,
                //rawTransaction: rawTx,
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

