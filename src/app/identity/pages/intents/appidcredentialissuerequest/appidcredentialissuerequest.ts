import { Component, NgZone, ViewChild } from '@angular/core';
import { DIDService } from '../../../services/did.service';
import { UXService } from '../../../services/ux.service';
import { PopupProvider } from '../../../services/popup';
import { AuthService } from '../../../services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { AppIDService } from '../../../services/appid.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AppIdCredIssueIdentityIntent } from '../../../model/identity.intents';
import { IntentReceiverService } from '../../../services/intentreceiver.service';

// Displayable version of a verifiable credential. Can contain one or more IssuedCredentialItem that
// are displayable version of verifiable credential subject entries.
type IssuedAppIdCredential = {
    appinstancedid: string,
    appdid: string,
    expirationDate: Date,
}

@Component({
    selector: 'page-appidcredentialissuerequest',
    templateUrl: 'appidcredentialissuerequest.html',
    styleUrls: ['appidcredentialissuerequest.scss']
})
export class AppIdCredentialIssueRequestPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public requestDapp;

    public receivedIntent: AppIdCredIssueIdentityIntent = null;
    public displayableCredential: IssuedAppIdCredential = null; // Displayable reworked material
    public preliminaryChecksCompleted = false;

    public showAppInstanceDid = false;
    public showAppDID = false;
    public showExpiration = false;

    constructor(
        private zone: NgZone,
        public didService: DIDService,
        private popup: PopupProvider,
        private uxService: UXService,
        private authService: AuthService,
        private appServices: UXService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private appIDService: AppIDService,
        private intentService: IntentReceiverService
    ) {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('identity.appidcredential-issue'));
        this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);

        void this.zone.run(async () => {
            this.receivedIntent = this.intentService.getReceivedIntent<AppIdCredIssueIdentityIntent>();
            await this.checkIntentSenderAppDid();

            this.organizeDisplayableInformation();
            this.runPreliminaryChecks();
        });
    }

    /**
     * Check a few things after entering the screen. Mostly, issued credential content quality.
     */
    runPreliminaryChecks() {
        // Nothing yet

        this.preliminaryChecksCompleted = true; // Checks completed and everything is all right.
    }

    checkIntentSenderAppDid() {
        if (this.receivedIntent.from == "internal") { // TODO: use appmanager enum when ready
            // Intent received from essentials itself. Everything is ok.
        }
        else {
            // Intent received from an external application.
            // TODO
        }

        /*if (!await this.uxService.isIntentResponseGoingOutsideElastos(this.receivedIntent.params)) {
            // Get real app did from runtime
            let appDid = await this.uxService.getAppDid(this.receivedIntent.appPackageId);
            if (!appDid) {
                // We were unable to retrieve the application did for some reason. Because of that,
                // we can't generate this credential and we let user know.
                let errorMessage = "The application DID could not be retrieved. ";
                errorMessage += "If you are developing your application, make sure to first create and publish your application identity ";
                errorMessage += "using the dApp developer tool dApp, then configure your manifest.json with a 'did' entry that contains your app's DID";
                await this.popup.ionicAlert(this.translate.instant('error'), errorMessage, this.translate.instant('close'));
                this.rejectRequest();
                return;
            }

            this.requestDapp.appdid = appDid;
        } else {
            // From native apps

            // Ensure we received a app DID info so we can check who is supposed to be sending this request
            if (!this.requestDapp.appdid) {
                // It is mandatory to get a appdid info from native apps
                let errorMessage = "No application DID received. The calling native application must pass a appdid parameter";
                errorMessage += " to its request so that we can verify it";
                await this.popup.ionicAlert(this.translate.instant('error'), errorMessage, this.translate.instant('close'));
                this.rejectRequest();
                return;
            }

            // NOTE: We don't check if the app did is published or not here. The runtime will do it when sending the
            // intent response.
        }*/
    }

    /**
     * Get the app did from chain for native app.
     */
    getAppDidFromChain() {
        // TODO
    }

    /**
     * From the raw data provided by the caller, we create our internal model ready for UI.
     */
    organizeDisplayableInformation() {
        let now = new Date().getTime();
        let oneMonthAsMs = 30 * 24 * 60 * 60 * 1000;
        this.displayableCredential = {
            appinstancedid: this.receivedIntent.params.appinstancedid,
            appdid: this.receivedIntent.params.appdid,
            expirationDate: new Date(now + oneMonthAsMs),
        };
    }

    acceptRequest() {
        void this.appIDService.generateAndSendApplicationIDCredentialIntentResponse(this.receivedIntent.params);
    }

    rejectRequest() {
        void this.appIDService.rejectExternalRequest();
    }
}
