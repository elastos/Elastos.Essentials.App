import { Component, NgZone, ViewChild } from '@angular/core';
import { UnstakeInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ProposalDetails } from 'src/app/voting/crproposalvoting/model/proposal-details';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { StakeService } from '../../services/stake.service';

@Component({
    selector: 'page-unstake',
    templateUrl: 'unstake.page.html',
    styleUrls: ['./unstake.page.scss']
})
export class UnstakePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public proposalDetail: ProposalDetails;
    public dataFetched = false;
    public signingAndTransacting = false;
    public maxStake = 0;
    public amount = 0;

    constructor(
        public stakeService: StakeService,
        public translate: TranslateService,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public zone: NgZone,
    ) {

    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('staking.unstake'));

        this.maxStake = this.stakeService.votesRight.minRemainVoteRight;
    }

    ionViewWillLeave() {

    }

    async unstake() {
        // Request the wallet to publish our vote.
        if (await this.voteService.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }
        else if (this.amount > this.maxStake) {
            await this.popupProvider.ionicAlert('staking.unstake', 'crproposalvoting.greater-than-max-votes');
            return false;
        }
        else if (this.amount <= 0) {
            await this.popupProvider.ionicAlert('staking.unstake', 'crproposalvoting.less-than-equal-zero-votes');
            return false;
        }

        const unstakeAmount = Util.accMul(this.amount, Config.SELA);
        await this.createUnstakeTransaction(unstakeAmount);
        return true;
    }

    async createUnstakeTransaction(unstakeAmount: number) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndTransacting = true;
        Logger.log(App.STAKING, 'Creating stake transaction with amount', unstakeAmount);

        const payload: UnstakeInfo = {
            ToAddress: this.stakeService.firstAddress,
            Value: unstakeAmount.toString(),
        };

        Logger.warn(App.STAKING, 'payload', payload);

        try {

            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

            const rawTx = await this.voteService.sourceSubwallet.createUnstakeTransaction(
                payload,
                '', //memo
            );
            await this.globalNative.hideLoading();

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.STAKING, '/staking/staking-home');
            if (ret) {
                this.voteService.toastSuccessfully('staking.stake');
            }
        }
        catch(e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }

        this.signingAndTransacting = false;
    }

    click0() {
        this.amount = 0;
    }

    clickMax() {
        this.amount = this.maxStake;
    }

}