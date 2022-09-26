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
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CRMemberOptionsComponent } from '../../components/options/options.component';
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-crmember',
    templateUrl: './crmember.page.html',
    styleUrls: ['./crmember.page.scss'],
})
export class CRMemberPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    current = 10;
    max = 100;
    ratio = "0.0";
    color: string = '#45ccce';
    background: string = '#eaeaea';
    gradient: boolean = true;
    radius: number = 125;
    percentage: number = 0;

    public member: any = null;
    public segmentValue = "about";

    private popover: any = null;
    public memberFetched = false;
    public canUpdate = false;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public theme: GlobalThemeService,
        public translate: TranslateService,
        private popoverCtrl: PopoverController,
        private globalNav: GlobalNavService,
        private globalNative: GlobalNativeService,
        public crCouncilService: CRCouncilService,
        public voteService: VoteService,
        private route: ActivatedRoute,
        public uxService: UXService,
    ) {
        // void this.init(this.route.snapshot.params.did);
    }

    async init() {
        if (!this.memberFetched) {
            this.member = await this.crCouncilService.getCRMemberInfo(this.crCouncilService.selectedMemberDid);
            Logger.log(App.CRCOUNCIL_VOTING, 'member info', this.member);
            if (this.member) {
                this.member.impeachmentThroughVotes = Math.ceil(this.crCouncilService.selectedMember.impeachmentThroughVotes);
                this.current = this.member.impeachmentVotes;
                this.max = this.member.impeachmentThroughVotes;
                if (this.current >= this.max) {
                    this.ratio = "100";
                }
                else {
                    this.ratio = (this.current * 100 / this.max).toFixed(1);
                }
                this.background = this.theme.darkMode ? "rgba(0, 0, 0, 0.87)" : "rgba(0, 0, 0, 0.1)";
                this.canUpdate = this.member.isSelf && (this.member.status == "Elected" || this.member.status == "Inactive");
            }

            this.memberFetched = true;
        }

        if (this.member) {
            if (this.voteService.canVote()) {
                this.titleBar.setMenuVisibility(true);
                this.titleBar.setupMenuItems([
                    {
                        key: "impeach-council-member",
                        title: this.translate.instant('crcouncilvoting.impeach-council-member'),
                        iconPath: !this.theme.darkMode ? '/assets/crcouncilvoting/icon/impeach.svg' : '/assets/crcouncilvoting/icon/impeach_dark.svg'
                    }
                ]);
                this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = item => {
                    switch (item.key) {
                        case "impeach-council-member":
                            void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/impeach');
                            return;
                    }
                });
            }
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.crmember-profile'));
        void this.init();
    }

    async showOptions(ev) {
        Logger.log('Launcher', 'Opening options');

        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            component: CRMemberOptionsComponent,
            componentProps: {
            },
            cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'launcher-options-component' : 'launcher-options-component-dark',
            translucent: false,
            event: ev,
        });
        this.popover.onWillDismiss().then(() => {
            this.popover = null;
        });
        return await this.popover.present();
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
        let status = item.status ? this.translate.instant("voting." + item.status.toLowerCase()) : "";
        return item.id + " " + creationDate + " " + status;
    }

    update() {
        this.crCouncilService.updateInfo = this.crCouncilService.selectedMember;
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/update');
    }

    claimDposNode() {
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crnode');
    }
}



