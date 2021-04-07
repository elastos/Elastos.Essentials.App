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
import { CoinTransferService, Transfer, IntentTransfer } from '../../../services/cointransfer.service';
import { WalletAccountType } from '../../../model/WalletAccount';
import { StandardCoinName } from '../../../model/Coin';
import { VoteType, CRProposalVoteInfo } from '../../../model/SPVWalletPluginBridge';
import { MainchainSubWallet } from '../../../model/wallets/MainchainSubWallet';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-crproposalvoteagainst',
  templateUrl: './crproposalvoteagainst.page.html',
  styleUrls: ['./crproposalvoteagainst.page.scss'],
})
export class CRProposalVoteAgainstPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    masterWalletId: string;
    sourceSubwallet: MainchainSubWallet = null;
    chainId: string; // ELA
    transfer: Transfer = null;
    intentTransfer: IntentTransfer;

    balance: string; // Balance in SELA

    constructor(public walletManager: WalletManager,
                private coinTransferService: CoinTransferService,
                private globalIntentService: GlobalIntentService,
                public translate: TranslateService,
                public native: Native,
                public zone: NgZone,
                public popupProvider: PopupProvider) {
        this.init();
    }

    ngOnInit() {
    }

    async ionViewDidEnter() {
        // TODO
        // this.titleBar.setTitle(this.translate.instant(''));
        if (this.coinTransferService.walletInfo.Type === WalletAccountType.MULTI_SIGN) {
            // TODO: reject voting if multi sign (show error popup), as multi sign wallets cannot vote.
            this.cancelOperation();
        }

        // TMP BPI TEST
        let previousVoteInfo = await this.walletManager.spvBridge.getVoteInfo(this.masterWalletId, StandardCoinName.ELA, VoteType.CRCProposal) as CRProposalVoteInfo[];
        Logger.log('wallet', "previousVoteInfo", previousVoteInfo);
    }

    init() {
        this.transfer = this.coinTransferService.transfer;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.chainId = this.coinTransferService.chainId;
        this.masterWalletId = this.coinTransferService.masterWalletId;
        this.sourceSubwallet = this.walletManager.getMasterWallet(this.masterWalletId).getSubWallet(this.chainId) as MainchainSubWallet;
        this.balance = this.sourceSubwallet.getDisplayBalance().toString();

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
        await this.globalIntentService.sendIntentResponse(
            { txid: null, status: 'cancelled' },
            this.intentTransfer.intentId
        );
    }

    goTransaction() {
        const stakeAmount = this.sourceSubwallet.balance.minus(this.votingFees());
        if (stakeAmount.isNegative()) {
            Logger.log('wallet', 'CRProposalVoteAgainstPage: Not enough balance:', stakeAmount.toString());
            this.native.toast_trans('amount-null');
            return false;
        }

        this.createVoteCRProposalTransaction(stakeAmount.toString());
    }

    /**
     * Fees needed to pay for the vote transaction. They have to be deduced from the total amount otherwise
     * funds won't be enough to vote.
     */
    votingFees(): number {
        return 100000; // SELA: 0.001ELA
    }

    async createVoteCRProposalTransaction(voteAmount) {
        Logger.log('wallet', 'Creating vote transaction with amount', voteAmount, ' this.transfer:', this.transfer);

        let invalidCandidates = await this.walletManager.computeVoteInvalidCandidates(this.masterWalletId);

        // The transfer "votes" array must contain exactly ONE entry: the voted proposal
        // TODO: don't use a votes array in a global transfer object. Use a custom object for CR proposal voting.
        let votes = {};
        votes[this.transfer.votes[0]] = voteAmount; // Vote with everything
        Logger.log('wallet', "Vote:", votes);

        this.transfer.rawTransaction =  await this.walletManager.spvBridge.createVoteCRCProposalTransaction(
            this.masterWalletId,
            this.chainId,
            '',
            JSON.stringify(votes),
            this.transfer.memo,
            JSON.stringify(invalidCandidates));

        this.walletManager.openPayModal(this.transfer);
    }
}

