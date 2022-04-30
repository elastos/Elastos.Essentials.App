import { Component, OnInit, ViewChild } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalNativeService } from "src/app/services/global.native.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalPopupService } from "src/app/services/global.popup.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from "src/app/voting/services/vote.service";
import { Candidate } from "../../model/candidates.model";
import { CRCouncilService } from "../../services/crcouncil.service";



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
    public candidatesFetched = false;
    public remainingTime: string;
    private updatedBalance = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public crCouncilService: CRCouncilService,
        private storage: GlobalStorageService,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public theme: GlobalThemeService,
        private toastCtrl: ToastController,
        private voteService: VoteService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
    ) {

    }

    ngOnInit() {
        this.showCandidate = false;
    }

    async ionViewWillEnter() {
        if (!this.updatedBalance) {
            await this.voteService.sourceSubwallet.updateBalanceSpendable();
            this.updatedBalance = true;
        }

        this.titleBar.setBackgroundColor("#732CCE");
        this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-candidates'));

        this.remainingTime = await this.crCouncilService.getRemainingTime();
        if (!this.candidatesFetched) {
            await this.crCouncilService.fetchCandidates();
            this.candidatesFetched = true;
        }

        switch (this.crCouncilService.candidateInfo.state) {
            case 'Unregistered':
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.ADD });
                this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                    void this.goToCandidateRegistration();
                });
                break;
            case 'Pending':
            case 'Active':
            case 'Canceled':
            // case 'Returned':
                void this.crCouncilService.addCandidateOperationIcon(this.theme.darkMode, this.titleBar, this.titleBarIconClickedListener);
                break;
        }

    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async goToCandidateRegistration() {
        if (!this.crCouncilService.candidateInfo.txConfirm) {
            this.globalNative.genericToast('crcouncilvoting.text-registration-no-confirm');
            return;
        }

        if (!this.voteService.checkBalanceForRegistration()) {
            await this.popupProvider.ionicAlert('wallet.insufficient-balance', 'crcouncilvoting.reg-candidate-balance-not-enough');
            return;
        }

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'crcouncilvoting.candidate-deposit-warning', 'common.ok', 'common.cancel')) {
            return;
        }

        await this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration-terms');
    }

    /****************** Select Candidate *******************/
    addCandidate(candidate: Candidate) {
        let targetCandidate = this.crCouncilService.selectedCandidates.find(
            _candidate => _candidate.cid === candidate.cid
        );
        if (!targetCandidate) {
            this.crCouncilService.selectedCandidates.push({
                cid: candidate.cid,
                nickname: candidate.nickname,
                imageUrl: candidate.imageUrl,
                location: candidate.location,
                userVotes: 0
            });
        } else {
            this.crCouncilService.selectedCandidates = this.crCouncilService.selectedCandidates.filter(
                _candidate => _candidate.cid !== candidate.cid
            );
        }
        Logger.log('crcouncil', "addCandidate: Selected candidates", this.crCouncilService.selectedCandidates
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
        let targetCandidate = this.crCouncilService.selectedCandidates.find(
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
        return moment(this.crCouncilService.councilTerm).format("MMM Do YY");
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

    async onShowCandidateInfo(did: string) {
        await this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidate/' + did);
    }
}
