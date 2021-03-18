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

import { Component, OnInit, NgZone } from '@angular/core';
import { Config } from '../../../config/Config';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { CoinTransferService, Transfer, IntentTransfer } from '../../../services/cointransfer.service';
import { MainchainSubWallet } from '../../../model/wallets/MainchainSubWallet';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';


@Component({
  selector: 'app-crmembervote',
  templateUrl: './crmembervote.page.html',
  styleUrls: ['./crmembervote.page.scss'],
})
export class CRmembervotePage implements OnInit {
    masterWalletId: string;
    sourceSubwallet: MainchainSubWallet = null;
    chainId: string; // ELA
    intentTransfer: IntentTransfer;
    transfer: Transfer = null;
    votecount = 0;

    balance: string; // Balance in SELA
    voteBalanceELA = 0; // ELA

    constructor(public walletManager: WalletManager,
                private coinTransferService: CoinTransferService,
                private globalIntentService: GlobalIntentService,
                public native: Native,
                public zone: NgZone,
                public popupProvider: PopupProvider) {
        this.init();
    }

    ngOnInit() {
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
        this.chainId = this.coinTransferService.chainId;
        this.masterWalletId = this.coinTransferService.masterWalletId;
        this.sourceSubwallet = this.walletManager.getMasterWallet(this.masterWalletId).getSubWallet(this.chainId) as MainchainSubWallet;
        this.balance = this.sourceSubwallet.getDisplayBalance().toString();

        this.parseVotes();

        this.hasPendingVoteTransaction();
    }

    async hasPendingVoteTransaction() {
        if (await this.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('confirmTitle', 'transaction-pending');
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

    checkValue() {
        // TODO: Check balance
        return true;
    }

    async createVoteCRTransaction() {
        Logger.log('wallet', 'Creating vote CR transaction');
        this.transfer.rawTransaction =  await this.walletManager.spvBridge.createVoteCRTransaction(this.masterWalletId, this.chainId,
                '', this.transfer.votes, this.transfer.memo, '[]');
        // TODO need to check DropVotes
        this.walletManager.openPayModal(this.transfer);
    }
}

