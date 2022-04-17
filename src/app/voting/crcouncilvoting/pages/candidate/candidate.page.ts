import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CandidateOptionsComponent } from '../../components/candidate-options/options.component';
import { CandidatesService } from '../../services/candidates.service';

@Component({
    selector: 'app-candidate',
    templateUrl: './candidate.page.html',
    styleUrls: ['./candidate.page.scss'],
})
export class CandidatePage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    current: number = 10;
    max: number = 100;
    color: string = '#45ccce';
    background: string = '#eaeaea';
    gradient: boolean = true;
    radius: number = 125;
    percentage: number = 0;

    public candidate: any = null;
    public segmentValue = "about";

    private popover: any = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public theme: GlobalThemeService,
        public translate: TranslateService,
        private popoverCtrl: PopoverController,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public candidatesService: CandidatesService,
        public voteService: VoteService,
        private route: ActivatedRoute,
    ) {
        void this.init(this.route.snapshot.params.did);
    }

    async init(did: string) {
        this.candidate = await this.candidatesService.candidates.find(candidate => candidate.did === did);
        Logger.log(App.CRCOUNCIL_VOTING, 'member info', this.candidate);
        // this.candidate.impeachmentThroughVotes = Math.ceil(this.candidatesService.selectedMember.impeachmentThroughVotes);
        this.current = 1000;
        this.max = 100000;
        this.background = this.theme.darkMode ? "rgba(0, 0, 0, 0.87)" : "rgba(0, 0, 0, 0.1)";

        if (Util.isSelfDid(this.candidate.did)) {
            this.titleBar.setMenuVisibility(true);
            this.titleBar.setMenuComponent(CandidateOptionsComponent)
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.candidate-profile'));
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



