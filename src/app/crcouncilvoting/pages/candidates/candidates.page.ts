import { Component, OnInit, ViewChild } from "@angular/core";
import { ToastController, AlertController } from "@ionic/angular";
import { CandidatesService } from "../../services/candidates.service";
import { Candidate } from "../../model/candidates.model";
import { NavigationExtras } from "@angular/router";

import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from "src/app/services/global.nav.service";
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { Logger } from "src/app/logger";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { VoteService } from "src/app/vote/services/vote.service";
import { App } from "src/app/model/app.enum";
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";


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
    public crmemberInfo: any;

    constructor(
        public candidatesService: CandidatesService,
        private storage: GlobalStorageService,
        private globalNav: GlobalNavService,
        private globalIntentService: GlobalIntentService,
        public theme: GlobalThemeService,
        private toastCtrl: ToastController,
        private alertCtrl: AlertController,
        private voteService: VoteService,
        public translate: TranslateService
    ) { }



    ngOnInit() {
        this.showCandidate = false;
    }

    async ionViewWillEnter() {
        await this.candidatesService.init();
        if (this.candidatesService.candidates.length) {
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-candidates'));
        } else if (this.candidatesService.crmembers.length) {
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-members'));
        } else {
            this.titleBar.setTitle(this.translate.instant('launcher.app-cr-council'));
        }

        let did = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        for (let crmember of this.candidatesService.crmembers) {
            if (crmember.did == did) {
                this.crmemberInfo = crmember;
                this.addEditIcon();
                break;
            }
        }
    }

    ionViewWillLeave() {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    addEditIcon() {
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.EDIT });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
            await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_MANAGER, '/crcouncilvoting/crnode', {
                queryParams: {
                    crmember: this.crmemberInfo
                }
            });
        });
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
}
