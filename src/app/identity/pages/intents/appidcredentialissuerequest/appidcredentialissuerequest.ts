import { Component, NgZone, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { Logger } from 'src/app/logger';
import { ApplicationDIDInfo, GlobalApplicationDidService } from 'src/app/services/global.applicationdid.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AppIdCredIssueIdentityIntent } from '../../../model/identity.intents';
import { AppIDService } from '../../../services/appid.service';
import { AuthService } from '../../../services/auth.service';
import { DIDService } from '../../../services/did.service';
import { IntentReceiverService } from '../../../services/intentreceiver.service';
import { PopupProvider } from '../../../services/popup';
import { UXService } from '../../../services/ux.service';

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
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    private appDid: string = null;
    private publishedAppInfo: ApplicationDIDInfo = null;
    public receivedIntent: AppIdCredIssueIdentityIntent = null;
    public displayableCredential: IssuedAppIdCredential = null; // Displayable reworked material
    public preliminaryChecksCompleted = false;
    public triedToFetchAppIcon = false;
    public appIconDataUrl = null; // Base64 data url displayable in an <img> element, after being fetched

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
        private intentService: IntentReceiverService,
        private globalApplicationDidService: GlobalApplicationDidService,
        private globalHiveService: GlobalHiveService
    ) {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('identity.appidcredential-issue'));
        this.titleBar.setNavigationMode(null);
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
            // Close icon
            await this.rejectRequest();
            void this.titleBar.globalNav.exitCurrentContext();
        });

        void this.zone.run(async () => {
            this.receivedIntent = this.intentService.getReceivedIntent<AppIdCredIssueIdentityIntent>();
            if (await this.fetchApplicationDidInfo()) {
                await this.checkIntentSenderAppDid();

                this.organizeDisplayableInformation();

                this.preliminaryChecksCompleted = true; // Checks completed

                void this.fetchAppIcon();
            }
        });
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    private async fetchApplicationDidInfo(): Promise<boolean> {
        this.appDid = this.receivedIntent.params.appdid;

        // Fetch the application from chain and extract info. If not found, we can't proceed.
        // App DIDs must be published.
        this.publishedAppInfo = await this.globalApplicationDidService.fetchPublishedAppInfo(this.appDid);
        if (!this.publishedAppInfo.didDocument) {
            // We were unable to retrieve the application did for some reason. Because of that,
            // we can't generate this credential and we let user know.
            let errorMessage = `The application DID ${this.appDid} could not be found on the identity chain. `;
            errorMessage += "If you are developing your application, make sure to first create and publish your application identity ";
            errorMessage += "using the developers tools screen in Essentials settings.";
            await this.popup.ionicAlert(this.translate.instant('common.error'), errorMessage, this.translate.instant('common.close'));
            this.rejectRequest();
            return false;
        }
        else {
            Logger.log("identity", "Published application info:", this.publishedAppInfo);

            if (this.publishedAppInfo.name && this.publishedAppInfo.iconUrl) {
                return true;
            }
            else {
                // We need an app icon and app name to display something verifiable to users
                let errorMessage = `The application DID ${this.appDid} was found on chain, but it doesn't
                contain a name and icon. Please first configure your application using the developers tools screen in Essentials settings.`;

                await this.popup.ionicAlert(this.translate.instant('common.error'), errorMessage, this.translate.instant('common.close'));
                this.rejectRequest();
                return false;
            }
        }
    }

    async checkIntentSenderAppDid(): Promise<void> {
        // Totally forbid access to Essential's context to third parties for now.
        if (this.appDid === GlobalConfig.ESSENTIALS_APP_DID) {
            let errorMessage = `Requesting to generate an application ID credential to access the
            Essentials' context (using Essentials' DID) is forbidden.`;
            await this.popup.ionicAlert(this.translate.instant('common.error'), errorMessage, this.translate.instant('common.close'));
            this.rejectRequest();
            return;
        }
    }

    private async fetchAppIcon() {
        try {
            this.appIconDataUrl = await this.globalHiveService.fetchHiveScriptPictureToDataUrl(this.publishedAppInfo.iconUrl);
        }
        catch (e) {
            Logger.error("identity", `Failed to fetch application icon at ${this.publishedAppInfo.iconUrl}`);
        }

        this.triedToFetchAppIcon = true;
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
        void this.appIDService.generateAndSendApplicationIDCredentialIntentResponse(this.receivedIntent);
    }

    rejectRequest() {
        void this.appIDService.rejectExternalRequest(this.receivedIntent);
    }

    public getAppIcon() {
        return this.appIconDataUrl || "assets/identity/default/securityWarning.svg";
    }
}
