import { Component, OnInit, ViewChild } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalPopupService } from "src/app/services/global.popup.service";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from "src/app/voting/services/vote.service";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { WalletService } from "src/app/wallet/services/wallet.service";
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
        private popoverCtrl: PopoverController,
        public popupProvider: GlobalPopupService,
        private walletManager: WalletService,
        public voteService: VoteService,
        public translate: TranslateService
    ) { }


    ngOnInit() {
        this.showCandidate = false;
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.council-members'));
        this.titleBar.setMenuVisibility(true);
        this.titleBar.setupMenuItems([
            {
                key: "edit-candidate",
                iconPath: !this.theme.darkMode ? '/assets/crcouncilvoting/icon/edit-candidate.svg' : '/assets/crcouncilvoting/icon/darkmode/edit-candidate.svg',
                title: "Edit candidate details"
            },
            {
                key: "register-candidate",
                iconPath: BuiltInIcon.EDIT,
                title: "Register as CR candidate"
            },
            {
                key: "cancel-registration",
                iconPath: !this.theme.darkMode ? '/assets/crcouncilvoting/icon/unregister-candidate.svg' : '/assets/crcouncilvoting/icon/darkmode/unregister-candidate.svg',
                title: "Exit election"
            }
        ]);
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = item => {
            switch (item.key) {
                case "edit-candidate":
                    break;
                case "register-candidate":
                    void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration');
                    break;
                case "cancel-registration":
                    void this.unregister();
                    break;
            }
        });

        await this.candidatesService.getCRVotingStage();
        if (!this.crmembersFetched) {
            await this.candidatesService.fetchCRMembers();
            this.crmembersFetched = true;
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

    gotoCandidate() {
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
    }

    async onShowMemberInfo(did: string) {
        await this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crmember/' + did);
    }

    // TODO @DONGXIAO: move this to a service, not here.
    private async unregister() {
        Logger.log(App.CRCOUNCIL_VOTING, 'Calling unregister()');

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'crcouncilvoting.candidate-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        try {
            let payloadString = await this.walletManager.spvBridge.generateUnregisterCRPayload(this.voteService.masterWalletId, StandardCoinName.ELA,
                this.candidatesService.candidateInfo.cid);
            if (payloadString) {
                let payload = JSON.parse(payloadString);
                let signature = await this.candidatesService.getSignature(payload.Digest);
                if (signature) {
                    payload.Signature = signature;
                    Logger.log('CandidateRegistrationPage', 'generateUnregisterCRPayload', payload);
                    const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");
                    await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
                }
            }
        }
        catch (e) {

        }
    }
}
