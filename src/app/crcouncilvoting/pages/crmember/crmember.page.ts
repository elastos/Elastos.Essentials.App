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
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { OptionsComponent } from '../../components/options/options.component';
import { CandidatesService } from '../../services/candidates.service';

@Component({
    selector: 'app-crmember',
    templateUrl: './crmember.page.html',
    styleUrls: ['./crmember.page.scss'],
})
export class CRMemberPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    current: number = 10;
    max: number = 100;
    color: string = '#45ccce';
    background: string = '#eaeaea';
    gradient: boolean = true;
    radius: number = 125;
    percentage: number = 0;

    public member: any = null;
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
        private route: ActivatedRoute,
    ) {
        this.init(this.route.snapshot.params.did);
    }

    async init(did: string) {
        this.member = await this.candidatesService.getCRMemeberInfo(did);
        Logger.log(App.CRCOUNCIL_VOTING, 'member info', this.member);
        this.member.impeachmentThroughVotes = Math.ceil(this.candidatesService.selectedMember.impeachmentThroughVotes);
        this.current = this.member.impeachmentVotes;
        this.max = this.member.impeachmentThroughVotes;
        this.background = this.theme.darkMode ? "rgba(0, 0, 0, 0.87)" : "rgba(0, 0, 0, 0.1)";
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.crmember-profile'));

        this.titleBar.setMenuVisibility(true);
        this.titleBar.setMenuComponent(OptionsComponent)
    }

    async showOptions() {
        Logger.log('Launcher', 'Opening options');

        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            component: OptionsComponent,
            componentProps: {
            },
            cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'launcher-options-component' : 'launcher-options-component-dark',
            translucent: false
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
        return item.id + " " + creationDate + " " + item.status;
    }

    update() {
        this.globalNative.genericToast("don't implement!");
    }

    claimDposNode() {
        this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crnode');
    }
}



