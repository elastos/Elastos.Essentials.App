import { Component, NgZone, ViewChild } from '@angular/core';
import { PayloadStakeInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { StakeService } from '../../services/stake.service';

@Component({
    selector: 'page-stake',
    templateUrl: 'stake.page.html',
    styleUrls: ['./stake.page.scss']
})
export class StakePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

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

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('staking.stake'));

        this.dataFetched = false;
        this.maxStake = await this.stakeService.getBalanceByFirstAddress();
        this.dataFetched = true;
    }

    ionViewWillLeave() {

    }

    async stake() {
        // Request the wallet to publish our vote.
        if (await this.voteService.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }
        else if (this.amount > this.maxStake) {
            await this.popupProvider.ionicAlert('staking.stake', 'crproposalvoting.greater-than-max-votes');
            return false;
        }
        else if (this.amount <= 0) {
            await this.popupProvider.ionicAlert('staking.stake', 'crproposalvoting.less-than-equal-zero-votes');
            return false;
        }

        const stakeAmount = Util.accMul(this.amount, Config.SELA);
        await this.createStakeTransaction(stakeAmount);
        return true;
    }

    async createStakeTransaction(stakeAmount) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndTransacting = true;
        Logger.log(App.STAKING, 'Creating stake transaction with amount', stakeAmount);

        const stakeAddr = this.voteService.sourceSubwallet.getOwnerStakeAddress();
        const payload: PayloadStakeInfo = {
            Version: 0,
            StakeAddress: stakeAddr
        };

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            const rawTx = await this.voteService.sourceSubwallet.createStakeTransaction(
                payload,
                stakeAmount,
                'DPoS 2.0 stake transaction', //memo
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