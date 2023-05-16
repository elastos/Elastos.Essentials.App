import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { App } from 'src/app/model/app.enum';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CRCouncilService } from '../../services/crcouncil.service';

@Component({
    selector: 'app-registration-terms',
    templateUrl: './registration-terms.page.html',
    styleUrls: ['./registration-terms.page.scss'],
})
export class CandidateRegistrationTermsPage implements OnInit {
    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalNav: GlobalNavService,
        public crCouncilService: CRCouncilService,
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
    }

    public accept() {
        // Make sure to not come back here later
        this.globalNav.clearIntermediateRoutes(["/crcouncilvoting/registration-terms"]);
        // Go to registration
        this.crCouncilService.updateInfo = null;
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration');
    }

    public cancel() {
        void this.globalNav.navigateBack();
    }
}
