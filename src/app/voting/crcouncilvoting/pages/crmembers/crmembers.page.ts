import { Component, OnInit, ViewChild } from "@angular/core";
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CandidatesService } from "../../services/candidates.service";

@Component({
    selector: "app-crmembers",
    templateUrl: "./crmembers.page.html",
    styleUrls: ["./crmembers.page.scss"]
})
export class CRMembersPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public showCandidate = false;
    public candidateIndex: number;
    public addingCandidates = false;
    public crmembersFetched = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public candidatesService: CandidatesService,
        private globalNav: GlobalNavService,
        public theme: GlobalThemeService,
        public translate: TranslateService
    ) { }


    ngOnInit() {
        this.showCandidate = false;
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-members'));
        await this.candidatesService.getCRVotingStage();
        if (!this.crmembersFetched) {
            await this.candidatesService.fetchCRMembers();
            this.crmembersFetched = true;
        }
    }

    ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    //   this.candidatesService.stopTimeout();
    }

    doRefresh(event) {
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    gotoCandidate() {
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
    }

    async onShowMemberInfo(did: string) {
        await this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crmember/' + did);
    }
}
