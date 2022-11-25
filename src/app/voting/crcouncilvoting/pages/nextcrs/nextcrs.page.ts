import { Component, OnInit, ViewChild } from "@angular/core";
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { App } from "src/app/model/app.enum";
import { GlobalFirebaseService } from "src/app/services/global.firebase.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalPopupService } from "src/app/services/global.popup.service";
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from "src/app/voting/services/vote.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { CRCouncilService } from "../../services/crcouncil.service";

@Component({
    selector: "app-nextcrs",
    templateUrl: "./nextcrs.page.html",
    styleUrls: ["./nextcrs.page.scss"]
})
export class NextCRsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public candidateIndex: number;
    public addingCandidates = false;
    public dataFetched = false;
    public secretary: any = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public crCouncilService: CRCouncilService,
        private globalNav: GlobalNavService,
        public theme: GlobalThemeService,
        public popupProvider: GlobalPopupService,
        private walletManager: WalletService,
        public voteService: VoteService,
        public translate: TranslateService
    ) {
        GlobalFirebaseService.instance.logEvent("voting_crmembers_enter");
    }

    ngOnInit() {
    }

    async ionViewWillEnter() {
        //this.titleBar.setBackgroundColor("#732CCE");
        //this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.next-crs'));

        if (!this.dataFetched) {
            await this.crCouncilService.fetchNextCRs();
            this.dataFetched = true;
        }

        if (this.crCouncilService.isElected) {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: this.theme.darkMode ? 'assets/dposvoting/icon/darkmode/node.svg' : 'assets/dposvoting/icon/node.svg' });
            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                this.claimDposNode();
            });
        }
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    claimDposNode() {
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crnode');
    }

    async onShowNextCRInfo(did: string) {
        await this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/nextcr/' + did);
    }
}
