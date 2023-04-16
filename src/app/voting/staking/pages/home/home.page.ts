import { Component, OnInit, ViewChild } from '@angular/core';
import { VotesContentInfo, VotingInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { StakeService, VoteType } from '../../services/stake.service';


@Component({
    selector: 'app-home',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss'],
})
export class StakingHomePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    public showItems = [];
    public buttonList = [];
    public voteItems = [];

    public detail = false;
    public showVotesDetails = false;
    public voteType = VoteType.DPoSV2;
    public voteInfo: any;

    public dataFetched = false;
    public signingAndTransacting = false;
    public showArrow = true;

    // Helper
    public WalletUtil = WalletUtil;
    public networkWallet: AnyNetworkWallet = null;

    constructor(
        public uxService: UXService,
        public translate: TranslateService,
        public stakeService: StakeService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        private voteService: VoteService,
        public popupProvider: GlobalPopupService,
        public currencyService: CurrencyService,
    ) {
    }

    ngOnInit() { }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-elastos-staking'));
        this.dataFetched = false;
        this.networkWallet = WalletService.instance.activeNetworkWallet.value;

        await this.stakeService.initData();
        this.addShowItems();
        this.addButtonList();
        this.addVoteItems();
        this.showArrow = this.stakeService.votesRight.totalVotesRight > 0;
        this.dataFetched = true;
    }

    ionViewDidEnter() {

    }

    addShowItems() {
        this.showItems = [];
        this.showItems.push(
            // {
            //     title: this.translate.instant('staking.staked'),
            //     value: this.stakeService.votesRight.maxStaked,
            // },
            {
                title: this.translate.instant('staking.your-rewards'),
                value: this.uxService.toThousands(this.stakeService.totalRewardInfo.total),
            },
            {
                title: this.translate.instant('staking.available-reward'),
                value: this.uxService.toThousands(this.stakeService.totalRewardInfo.claimable),
            },
        );
    }


    addButtonList() {
        this.buttonList = [];
        this.buttonList.push(
            {
                label: this.translate.instant('staking.stake'),
                icon: 'assets/staking/icons/stake.svg',
                url: '/staking/stake',
            },
            {
                label: this.translate.instant('staking.unstake'),
                icon: 'assets/staking/icons/unstake.svg',
                url: '/staking/unstake',
            },
            {
                label: this.translate.instant('staking.withdraw'),
                icon: 'assets/staking/icons/withdraw.svg',
                url: '/staking/withdraw',
            },
            {
                label: this.translate.instant('staking.unvote'),
                icon: 'assets/staking/icons/unvote.svg',
                url: '/staking/unvote',
            },
        );
    }

    addVoteItems() {
        this.voteItems = [];
        if (this.stakeService.votesRight.totalVotesRight > 0) {
            this.voteItems.push({
                title: "BPoS",
                type: VoteType.DPoSV2,
                votes: this.uxService.toThousands(this.stakeService.votesRight.votes[VoteType.DPoSV2]),
                ratio: this.uxService.getPercentage(this.stakeService.votesRight.votes[VoteType.DPoSV2], this.stakeService.votesRight.totalVotesRight),
                stakeuntilDate: this.stakeService.votesRight.dpos2LockTimeDate,
                stakeuntilExpiredIn: this.stakeService.votesRight.dpos2LockTimeExpired,
            });
            for (let i = 0; i < 4; i++) {
                var item = {
                    title: this.translate.instant(this.stakeService.votesRight.voteInfos[i].title),
                    type: i,
                    votes: this.uxService.toThousands(this.stakeService.votesRight.votes[i]),
                    ratio: this.uxService.getPercentage(this.stakeService.votesRight.votes[i], this.stakeService.votesRight.totalVotesRight),
                } as any;
                this.voteItems.push(item);
            }
        }
    }

    async unvote() {
        if (!this.stakeService.votesRight.voteInfos || this.stakeService.votesRight.voteInfos.length < 1) {
            this.globalNative.genericToast('dposvoting.no-voting');
            return
        }

        var voteContents: VotesContentInfo[] = [];
        for (let i = 0; i < 4; i++) {
            let voteInfo = this.stakeService.votesRight.voteInfos[i];
            if (voteInfo) {
                let list = voteInfo.list;
                if (list && list.length > 0) {
                    voteContents.push({
                        VoteType: i,
                        VotesInfo: []
                    })
                }
            }
        }

        if (voteContents.length == 0) {
            this.globalNative.genericToast('dposvoting.no-voting');
            return;
        }

        if (!await this.popupProvider.ionicConfirm('staking.unvote', 'staking.unvote-message', 'common.ok', 'common.cancel')) {
            return;
        }

        this.signingAndTransacting = true;

        const payload: VotingInfo = {
            Version: 0,
            Contents: voteContents
        };

        Logger.log(App.STAKING, 'unvote payload', payload);

        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
                payload,
                '', //memo
            );
            await this.globalNative.hideLoading();
            Logger.log(App.STAKING, "rawTx:", rawTx);
            let ret = await this.voteService.signAndSendRawTransaction(rawTx);
            if (ret) {
                this.voteService.toastSuccessfully('staking.unvote');
            }
        }
        catch (e) {
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }

         this.signingAndTransacting = false;
    }

    clickDetails(event: Event, type: VoteType) {
        if (type == VoteType.DPoSV2) {
            void this.voteService.selectWalletAndNavTo(App.DPOS2, '/dpos2/menu/my-votes');
        }
        else {
            this.voteType = type;
            this.showVotesDetails = true;
            event.stopPropagation();
        }

    }

    async clickButton(url: string) {
        if (url == "/staking/unvote") {
            await this.unvote();
        }
        else if (url == "/staking/unstake" && this.stakeService.votesRight.minRemainVoteRight == 0) {
            this.globalNative.genericToast('staking.no-stake');
        }
        else if (url == "/staking/withdraw" && this.stakeService.totalRewardInfo.claimable == 0) {
            this.globalNative.genericToast('staking.no-reward');
        }
        else {
            this.goTo(url);
        }

    }

    goTo(url: string) {
        void this.globalNav.navigateTo(App.STAKING, url);
    }

    async doRefresh(event) {
        this.voteService.needFetchData[App.STAKING] = true;
        await this.stakeService.initData();

        setTimeout(() => {
            event.target.complete();
        }, 500);
    }
}
