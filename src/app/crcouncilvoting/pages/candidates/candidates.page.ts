import { Component, OnInit, ViewChild } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from "src/app/vote/services/vote.service";
import { Candidate } from "../../model/candidates.model";
import { CandidatesService } from "../../services/candidates.service";



@Component({
    selector: "app-candidates",
    templateUrl: "./candidates.page.html",
    styleUrls: ["./candidates.page.scss"]
})
export class CandidatesPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public candidate: Candidate;
    public showCandidate = false;
    public candidateIndex: number;
    public addingCandidates = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public candidatesService: CandidatesService,
        private storage: GlobalStorageService,
        private globalNav: GlobalNavService,
        public theme: GlobalThemeService,
        private toastCtrl: ToastController,
        private voteService: VoteService,
        public translate: TranslateService
    ) { }



    ngOnInit() {
        this.showCandidate = false;
    }

    async ionViewWillEnter() {

        if (this.candidatesService.votingTermIndex != -1) {
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-candidates'));
        } else if (this.candidatesService.currentTermIndex != -1) {
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-members'));
        } else {
            this.titleBar.setTitle(this.translate.instant('launcher.app-cr-council'));
        }
    }

    ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    doRefresh(event) {
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    /****************** Select Candidate *******************/
    addCandidate(candidate: Candidate) {
        let targetCandidate = this.candidatesService.selectedCandidates.find(
            _candidate => _candidate.cid === candidate.cid
        );
        if (!targetCandidate) {
            this.candidatesService.selectedCandidates.push({
                cid: candidate.cid,
                nickname: candidate.nickname,
                imageUrl: candidate.imageUrl,
                userVotes: 0
            });
        } else {
            this.candidatesService.selectedCandidates = this.candidatesService.selectedCandidates.filter(
                _candidate => _candidate.cid !== candidate.cid
            );
        }
        Logger.log('crcouncil', "addCandidate: Selected candidates", this.candidatesService.selectedCandidates
        );
    }

    /****************** Route to Vote *******************/
    async addCandidates() {
        try {
            await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_VOTING, "/crcouncilvoting/vote");
        }
        catch (err) {
            Logger.log('crcouncil', err);
            void this.toastWalletErr();
        }
    }

    /****************** Modify Values *******************/
    candidateIsSelected(candidate: Candidate): boolean {
        let targetCandidate = this.candidatesService.selectedCandidates.find(
            _candidate => _candidate.cid === candidate.cid
        );
        if (targetCandidate) {
            return true;
        } else {
            return false;
        }
    }

    fixVotes(votes: string) {
        return parseInt(votes);
    }

    getCouncilStartDate() {
        return moment(this.candidatesService.councilTerm).format("MMM Do YY");
    }

    /****************** Show Slide *******************/
    _showCandidate(index: number, can: Candidate) {
        this.showCandidate = !this.showCandidate;
        this.candidateIndex = index;
        this.candidate = can;
    }

    /****************** Toasts/Alerts *******************/
    async toastWalletErr() {
        const toast = await this.toastCtrl.create({
            mode: "ios",
            position: "top",
            color: "primary",
            header: this.translate.instant("crcouncilvoting.get-ela-failed-header"),
            message: this.translate.instant("crcouncilvoting.get-ela-failed-message"),
            duration: 2000,
        });
        await toast.present();
    }

    async deleteStorage(): Promise<void> {
        await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'crcouncil', 'votes', []);
    }

    async onShowMemberInfo(did: string) {
        this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crmember/' + did);
    }
}
