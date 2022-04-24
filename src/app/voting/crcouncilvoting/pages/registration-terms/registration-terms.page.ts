import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { App } from 'src/app/model/app.enum';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
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
        private walletManager: WalletService,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        private globalNative: GlobalNativeService,
        private globalIntentService: GlobalIntentService,
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
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration');
    }

    public cancel() {
        void this.globalNav.navigateBack();
    }
}
