import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CandidatesService } from '../../services/candidates.service';

@Component({
    selector: 'app-registration-terms',
    templateUrl: './registration-terms.page.html',
    styleUrls: ['./registration-terms.page.scss'],
})
export class CandidateRegistrationTermsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

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
        public candidatesService: CandidatesService,
    ) {

    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);
    }
}
