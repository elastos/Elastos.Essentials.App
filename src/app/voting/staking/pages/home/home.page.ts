import { Component, OnInit, ViewChild } from '@angular/core';
import { VotesContentInfo, VotingInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
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

    constructor(
        public translate: TranslateService,
        public stakeService: StakeService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        private voteService: VoteService,
    ) {
    }

    ngOnInit() { }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-elastos-staking'));
        this.dataFetched = false;
        await this.stakeService.initData();
        this.addShowItems();
        this.addButtonList();
        this.addVoteItems();
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
                value: this.stakeService.totalRewardInfo.total,
            },
            {
                title: this.translate.instant('staking.available-reward'),
                value: this.stakeService.totalRewardInfo.claimable,
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
                title: "DPoS 2.0",
                type: VoteType.DPoSV2,
                votes: this.stakeService.votesRight.votes[VoteType.DPoSV2],
                ratio: Math.floor((this.stakeService.votesRight.votes[VoteType.DPoSV2] / this.stakeService.votesRight.totalVotesRight) * 10000) / 100,
                stakeuntilDate: this.stakeService.votesRight.dpos2LockTimeDate,
                stakeuntilExpired: this.stakeService.votesRight.dpos2LockTimeExpired,
            });
            for (let i = 0; i < 4; i++) {
                var item = {
                    title: this.translate.instant(this.stakeService.votesRight.voteInfos[i].title),
                    type: i,
                    votes: this.stakeService.votesRight.votes[i],
                    ratio: Math.floor((this.stakeService.votesRight.votes[i] / this.stakeService.votesRight.totalVotesRight) * 10000) / 100,
                } as any;
                this.voteItems.push(item);
            }
        }
    }

    async unvote() {
        if (!this.stakeService.votesRight.voteInfos) {
            return
        }

        this.signingAndTransacting = true;

        var voteContents: VotesContentInfo[] = [];
        for (let i = 0; i < 4; i++) {
            let list = this.stakeService.votesRight.voteInfos[i].list;
            if (list.length > 0) {
                voteContents.push({
                    VoteType: i,
                    VotesInfo: []
                })
            }
        }

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
            void this.voteService.selectWalletAndNavTo(App.DPOS_VOTING, '/dpos2/menu/my-votes');
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
        else {
            this.goTo(url);
        }

    }

    goTo(url: string) {
        void this.globalNav.navigateTo(App.STAKING, url);
    }
}
