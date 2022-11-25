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
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-nextcr',
    templateUrl: './nextcr.page.html',
    styleUrls: ['./nextcr.page.scss'],
})
export class NextCRPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public member: any = null;
    public isSelf = false;

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
        void this.init(this.route.snapshot.params.did);
    }

    async init(did: string) {
        this.member = await this.crCouncilService.nextCRs.find(nextcr => nextcr.did === did);
        this.isSelf = Util.isSelfDid(did);
        Logger.log(App.CRCOUNCIL_VOTING, 'nextcr info', this.member);
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.crmember-profile'));
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    claimDposNode() {
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/crnode');
    }
}



