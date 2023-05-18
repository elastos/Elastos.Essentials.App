import { Component, NgZone, ViewChild } from '@angular/core';
import { PayloadStakeInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
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
    public isSingleAddressWallet = false;

    constructor(
        public uxService: UXService,
        public stakeService: StakeService,
        public translate: TranslateService,
        private globalPopupService: GlobalPopupService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNative: GlobalNativeService,
        public zone: NgZone,
    ) {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('staking.stake'));

        this.dataFetched = false;

        this.maxStake = await this.stakeService.getBalanceByFirstAddress();
        if (this.maxStake >= 1) {
            this.maxStake = this.maxStake - 1;
        }
        else {
            this.maxStake = 0;
        }
        this.dataFetched = true;

        this.isSingleAddressWallet = this.voteService.networkWallet.getNetworkOptions().singleAddress;
    }

    async stake() {
        try {
            this.signingAndTransacting = true;

            // Request the wallet to publish our vote.
            if (await this.voteService.sourceSubwallet.hasPendingBalance(true)) {
                await this.globalPopupService.ionicAlert('common.warning', 'wallet.transaction-pending', "common.understood");
                return false;
            }
            else if (this.amount > this.maxStake) {
                await this.globalPopupService.ionicAlert('staking.stake', 'crproposalvoting.greater-than-max-votes');
                return false;
            }
            else if (this.amount <= 0) {
                await this.globalPopupService.ionicAlert('staking.stake', 'crproposalvoting.less-than-equal-zero-votes');
                return false;
            }

            const stakeAmount = Util.accMul(this.amount, Config.SELA);
            await this.createStakeTransaction(stakeAmount);
        }
        catch (e) {
            Logger.warn(App.STAKING, 'stake exception:', e)
        }
        finally {
            this.signingAndTransacting = false;
        }
        return true;
    }

    async createStakeTransaction(stakeAmount) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        const stakeAddr = this.voteService.sourceSubwallet.getOwnerStakeAddress();
        const payload: PayloadStakeInfo = {
            Version: 0,
            StakeAddress: stakeAddr
        };

        Logger.log(App.STAKING, 'Creating stake transaction with payload', payload);

        try {
            const rawTx = await this.voteService.sourceSubwallet.createStakeTransaction(
                payload,
                stakeAmount,
                'BPoS stake transaction', //memo
            );

            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('staking.stake');
            }
        }
        catch(e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.voteService.popupErrorMessage(e);
        }
    }

    clickMax() {
        this.amount = this.maxStake;
    }

    onInputFocus() {
        if( this.amount == 0) {
            this.amount = null;
        }
    }

    onInputBlur() {
        if (this.amount  == null) {
            this.amount  = 0;
        }
    }

}