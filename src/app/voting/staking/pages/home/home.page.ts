import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
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

    constructor(
        public translate: TranslateService,
        public stakeService: StakeService,
        public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
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
            {
                title: this.translate.instant('staking.staked'),
                value: this.stakeService.votesRight.staked,
                active: false
            },
            {
                title: this.translate.instant('staking.your-rewards'),
                value: this.stakeService.rewardInfo.total,
                active: false
            },
            {
                title: this.translate.instant('staking.available-reward'),
                value: this.stakeService.rewardInfo.claimable,
                active: false
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
        this.voteItems.push({
            title: "DPoS 2.0",
            type: VoteType.DPoSV2,
            votes: this.stakeService.votesRight.votes[VoteType.DPoSV2],
            ratio: Math.floor((this.stakeService.votesRight.votes[VoteType.DPoSV2] / this.stakeService.votesRight.totalVotesRight) * 10000) / 100,
            stakeuntilDate: this.stakeService.votesRight.lockTimeDate,
            stakeuntilExpired: this.stakeService.votesRight.lockTimeExpired,
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

    unvote() {
        if (!this.stakeService.votesRight.voteInfos) {
            return
        }

        // this.signingAndTransacting = true;
        // Logger.log('wallet', 'Creating vote transaction with votes', votes);


        // let voteContentInfo: VotesContentInfo = {
        //     VoteType: VoteContentType.DposV2,
        //     VotesInfo: votes
        // };

        // try {
        //     const voteContent = [voteContentInfo];
        //     const payload: VotingInfo = {
        //         Version: 0,
        //         Contents: voteContent
        //       };


        //     await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
        //     const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
        //         payload,
        //         '', //memo
        //     );
        //     await this.globalNative.hideLoading();
        //     Logger.log('wallet', "rawTx:", rawTx);

        //     let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS_VOTING, "/dpos2/menu/list");
        //     if (ret) {
        //         this.voteService.toastSuccessfully('voting.vote');
        //     }
        // }
        // catch (e) {
        //     await this.globalNative.hideLoading();
        //     await this.voteService.popupErrorMessage(e);
        // }

        // this.castingVote = false;
        // this.signingAndTransacting = false;
    }

    clickDetails(event: Event, type: VoteType) {
        if (type == VoteType.DPoSV2) {
            this.goTo("/dpos2/menu/my-votes");
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