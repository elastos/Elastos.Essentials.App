import { Component, NgZone, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { StakeService } from '../../services/stake.service';

@Component({
    selector: 'page-withdraw',
    templateUrl: 'withdraw.page.html',
    styleUrls: ['./withdraw.page.scss']
})
export class WithdrawPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public signingAndTransacting = false;
    public isKeyboardHide = true;

    public available = 0;
    public amount = 0;
    public advanced = false;
    public address = "";
    public isNodeReward = false;
    public isMuiltWallet = false;
    public showArrow = true;

    constructor(
        public uxService: UXService,
        public stakeService: StakeService,
        public translate: TranslateService,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
        private voteService: VoteService,
        public theme: GlobalThemeService,
        private globalNative: GlobalNativeService,
        public keyboard: Keyboard,
        public zone: NgZone,
    ) {

    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('staking.withdraw'));

        this.available = this.stakeService.rewardInfo.claimable;
        this.address = this.stakeService.firstAddress;
        this.isMuiltWallet = this.voteService.isMuiltWallet();
        this.showArrow = !this.isMuiltWallet;

        this.keyboard.onKeyboardWillShow().subscribe(() => {
            this.zone.run(() => {
                this.isKeyboardHide = false;
            });
        });

        this.keyboard.onKeyboardWillHide().subscribe(() => {
            this.zone.run(() => {
                this.isKeyboardHide = true;
            });
        });
    }

    ionViewWillLeave() {

    }

    async withdraw() {
        if (!this.uxService.checkWalletAddress(this.address)) {
            var formatWrong = this.translate.instant('common.text-input-format-wrong');
            formatWrong = this.translate.instant('staking.reciever-address') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return;
        }

        // Request the wallet to publish our vote.
        if (await this.voteService.sourceSubwallet.hasPendingBalance()) {
            await this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.transaction-pending');
            return false;
        }
        else if (this.amount > this.available) {
            await this.popupProvider.ionicAlert('staking.withdraw', 'crproposalvoting.greater-than-max-votes');
            return false;
        }
        else if (this.amount <= 0) {
            await this.popupProvider.ionicAlert('staking.withdraw', 'crproposalvoting.less-than-equal-zero-votes');
            return false;
        }

        const stakeAmount = Util.accMul(this.amount, Config.SELA);
        await this.createWithdrawTransaction(stakeAmount.toString());

        return true;
    }

    async createWithdrawTransaction(stakeAmount) {
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndTransacting = true;

        try {

            var payload = {
                Value: stakeAmount,
                ToAddress:  this.address
            } as any;

            if (this.isNodeReward) {
                payload.Code = this.voteService.sourceSubwallet.getCodeofOwnerAddress();

                const digest = this.voteService.sourceSubwallet.getDPoSV2ClaimRewardDigest(payload);
                const password = await AuthService.instance.getWalletPassword(this.voteService.masterWalletId, true, true);
                payload.Signature = await this.voteService.sourceSubwallet.signDigestWithOwnerKey(digest, password);
            }

            Logger.log(App.STAKING, 'Creating withdraw transaction with payload', payload);

            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2ClaimRewardTransaction(
                payload,
                '', //memo
            );
            await this.globalNative.hideLoading();

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.STAKING, '/staking/staking-home');
            if (ret) {
                this.voteService.toastSuccessfully('staking.withdraw');
            }
        }
        catch(e) {
            // Something wrong happened while signing the JWT. Just tell the end user that we can't complete the operation for now.
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }

        this.signingAndTransacting = false;
    }

    onRewardChange(event) {
        if (this.isNodeReward) {
            this.available = this.stakeService.nodeRewardInfo.claimable;
            this.address = this.stakeService.ownerAddress;
        }
        else {
            this.available = this.stakeService.rewardInfo.claimable;
            this.address = this.stakeService.firstAddress;
        }
    }

    clickMax() {
        this.amount = this.available;
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