import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-secretary',
    templateUrl: './secretary.page.html',
    styleUrls: ['./secretary.page.scss'],
})
export class CRSecretaryPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public secretary: any = null;
    public secretaryFetched = false;

    constructor(
        public theme: GlobalThemeService,
        public translate: TranslateService,
        public crCouncilService: CRCouncilService,
        public voteService: VoteService,
    ) {
        // void this.init(this.route.snapshot.params.did);
    }

    async init() {
        if (!this.secretaryFetched) {
            this.secretary = await this.crCouncilService.secretaryGeneralInfo;
            Logger.log(App.CRCOUNCIL_VOTING, 'secretary info', this.secretary);

            this.secretaryFetched = true;
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilvoting.secretary-profile'));
        void this.init();
    }

    ionViewWillLeave() {

    }
}



