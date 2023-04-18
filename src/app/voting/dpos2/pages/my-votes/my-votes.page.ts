import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-my-votes',
    templateUrl: './my-votes.page.html',
    styleUrls: ['./my-votes.page.scss'],
})
export class MyVotesPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private votes = [];
    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: any;

    public dataFetched = false;
    public signingAndTransacting = false;

    constructor(
        public dpos2Service: DPoS2Service,
        public voteService: VoteService,
        public theme: GlobalThemeService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
        public uxService: UXService,
    ) { }

    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async initData() {
        this.dataFetched = false;
        await this.dpos2Service.init();
        this.votes = await this.dpos2Service.geMyVoteds();
        this.dataFetched = true;
        Logger.warn('BPoS', '--My votes', this.votes)
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('dposvoting.my-votes'));
        void this.initData();
    }

    showUpdateNode(index: number, node: any) {
        if ((node.locktime - node.blockheight) >= 720000) {
            return GlobalNativeService.instance.genericToast('voting.vote-max-deadline');
        }

        this.showNode = true;
        this.nodeIndex = index;
        this.node = node;
    }

    async mintBPosNFT(index: number, node: any) {
        Logger.warn('BPoS', '--mintBPosNFT')
        // this.nodeIndex = index;
        // this.node = node;

        // Create BPoS NFT Transaction
        // this.referkey = node.referkey
        // stake address
        // GenesisBlockHash
        if (!await this.voteService.checkWalletAvailableForVote()) {
            return;
        }

        this.signingAndTransacting = true;
        await GlobalNativeService.instance.showLoading(this.translate.instant('common.please-wait'));

        try {
            // let voteContentInfo: RenewalVotesContentInfo = {
            //     ReferKey: node.referkey,
            //     VoteInfo: {
            //         Candidate: node.candidate,
            //         Votes: votes,
            //         Locktime: locktime
            //     }
            // };

            // const payload: VotingInfo = {
            //     Version: 1,
            //     RenewalVotesContent: [voteContentInfo]
            // };

            // Logger.log(App.DPOS2, "Updata vote's payload:", payload);

            const rawTx = await this.voteService.sourceSubwallet.createDPoSV2VoteTransaction(
                node.referkey,
                '', //memo
            );

            await GlobalNativeService.instance.hideLoading();
            Logger.log(App.DPOS2, "rawTx:", rawTx);

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS2, "/dpos2/menu/my-votes");
            if (ret) {
                // node.lockDays = node.inputStakeDays;
                this.voteService.toastSuccessfully('dposvoting.update-vote');
                // this.buttonClick.emit(node.index);
            }

        }
        catch (e) {
            await GlobalNativeService.instance.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }

        // Update votes or hide the vote that minted.
    }

    onClick(index: number) {
        this.showNode = false;
    }
}
