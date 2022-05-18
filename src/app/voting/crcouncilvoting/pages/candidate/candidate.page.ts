import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-candidate',
    templateUrl: './candidate.page.html',
    styleUrls: ['./candidate.page.scss'],
})
export class CandidatePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    current = 0;
    max = 0;
    ratio = "0.0";
    color = '#52B6FF';
    background = '#eaeaea';
    gradient = false;
    radius = 125;
    percentage = 0;

    public candidate: any = null;
    public segmentValue = "about";

    private popover: any = null;
    socialMedias = [
        // {
        //     url: "http://twitter.com/",
        //     type: "twitter"
        // },
        // {
        //     url: "http://telegram.com/",
        //     type: "telegram"
        // },
    ];

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public theme: GlobalThemeService,
        public translate: TranslateService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public crCouncilService: CRCouncilService,
        public voteService: VoteService,
        private route: ActivatedRoute,
        public uxService: UXService,
    ) {
        void this.init(this.route.snapshot.params.did);
    }

    async init(did: string) {
        this.candidate = await this.crCouncilService.candidates.find(candidate => candidate.did === did);
        Logger.log(App.CRCOUNCIL_VOTING, 'candidate info', this.candidate);
        this.current = this.candidate.votes;
        this.max = this.crCouncilService.totalVotes;
        if (this.max > 0) {
            this.ratio = (this.current * 100 / this.max).toFixed(1);
        }

        this.background = this.theme.darkMode ? "rgba(0, 0, 0, 0.87)" : "rgba(0, 0, 0, 0.1)";
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.candidate-profile'));
        if (Util.isSelfDid(this.candidate.did)) {
            void this.crCouncilService.addCandidateOperationIcon(this.theme.darkMode, this.titleBar, this.titleBarIconClickedListener);
        }
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    segmentChanged(ev: any) {
        this.segmentValue = ev.detail.value;
        console.log('Segment changed', ev);
    }

    getItemDescription(item: any): string {
        let creationDate = Util.timestampToDateTime(item.createdAt * 1000);
        return item.id + " " + creationDate + " " + item.status;
    }

    update() {
        this.globalNative.genericToast("don't implement!");
    }

    claimDposNode() {
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crnode');
    }
}



