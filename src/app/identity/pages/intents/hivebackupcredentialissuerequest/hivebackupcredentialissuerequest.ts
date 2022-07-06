import { Component, NgZone, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { AuthService } from 'src/app/identity/services/auth.service';
import { UXService } from 'src/app/identity/services/ux.service';
import { Logger } from 'src/app/logger';
import { ApplicationDIDInfo, GlobalApplicationDidService } from 'src/app/services/global.applicationdid.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { HiveBackupCredIssueIdentityIntent } from '../../../model/identity.intents';
import { DIDService } from '../../../services/did.service';
import { IntentReceiverService } from '../../../services/intentreceiver.service';

@Component({
    selector: 'page-hivebackupcredentialissuerequest',
    templateUrl: 'hivebackupcredentialissuerequest.html',
    styleUrls: ['hivebackupcredentialissuerequest.scss']
})
export class HiveBackupCredentialIssueRequestPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    private appDid: string = null;
    private publishedAppInfo: ApplicationDIDInfo = null;
    public receivedIntent: HiveBackupCredIssueIdentityIntent = null;
    public preliminaryChecksCompleted = false;
    public triedToFetchAppIcon = false;
    public requestingAppName = null;
    public requestingAppIconUrl = null; // Base64 data url displayable in an <img> element, after being fetched

    constructor(
        private zone: NgZone,
        public didService: DIDService,
        private sanitizer: DomSanitizer,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private authService: AuthService,
        private uxService: UXService,
        private intentService: IntentReceiverService,
        private globalApplicationDidService: GlobalApplicationDidService,
        private globalHiveService: GlobalHiveService
    ) {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('identity.hivebackup-title'));
        this.titleBar.setNavigationMode(null);
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
            // Close icon
            await this.rejectRequest();
            void this.titleBar.globalNav.exitCurrentContext();
        });

        void this.zone.run(async () => {
            this.receivedIntent = this.intentService.getReceivedIntent<HiveBackupCredIssueIdentityIntent>();
            await this.fetchApplicationDidInfo();
            this.preliminaryChecksCompleted = true; // Checks completed
        });
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    private async fetchApplicationDidInfo(): Promise<void> {
        let callingAppDID = this.receivedIntent.params.caller;

        // Fetch the application from chain and extract info.
        let publishedAppInfo = await this.globalApplicationDidService.fetchPublishedAppInfo(callingAppDID);
        if (publishedAppInfo.didDocument) {
            Logger.log("identity", "Published application info:", publishedAppInfo);

            this.requestingAppName = publishedAppInfo.name;

            void this.fetchAppIcon(publishedAppInfo.iconUrl);
        }
    }

    private async fetchAppIcon(hiveIconUrl: string) {
        try {
            this.requestingAppIconUrl = await this.globalHiveService.fetchHiveScriptPictureToDataUrl(hiveIconUrl);
        }
        catch (e) {
            Logger.error("identity", `Failed to fetch application icon at ${hiveIconUrl}`);
        }
    }

    getDappIcon() {
        if (this.requestingAppIconUrl) {
            return this.sanitizer.bypassSecurityTrustResourceUrl(this.requestingAppIconUrl);
        } else {
            return 'assets/identity/icon/elastos-icon.svg'
        }
    }

    private generateHiveBackupCredential(): Promise<DIDPlugin.VerifiableCredential> {
        let properties = {
            sourceHiveNodeDID: this.receivedIntent.params.sourceHiveNodeDID,
            targetHiveNodeDID: this.receivedIntent.params.targetHiveNodeDID,
            targetNodeURL: this.receivedIntent.params.targetNodeURL
        };

        return new Promise((resolve, reject) => {
            void this.authService.checkPasswordThenExecute(async () => {
                Logger.log('identity', "HiveBackupCredIssueRequest - issuing credential");

                await this.didService.getActiveDid().pluginDid.issueCredential(
                    this.receivedIntent.params.sourceHiveNodeDID,
                    "#hive-backup-credential",
                    ['HiveBackupCredential'],
                    3, // Short expiration, 3 days
                    properties,
                    this.authService.getCurrentUserPassword(),
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    (issuedCredential) => {
                        resolve(issuedCredential);
                    }, (err) => {
                        Logger.error('identity', "Failed to issue the hive backup credential...", err);
                        reject(err);
                    });
            }, () => {
                // Cancelled
                Logger.warn("identity", "Hive backup credential generation cancelled");
                reject();
            });
        });
    }

    async acceptRequest() {
        try {
            let issuedCredential = await this.generateHiveBackupCredential();
            Logger.log('identity', "Sending hivebackupcredissue intent response for intent id " + this.receivedIntent.intentId)
            let credentialAsString = await issuedCredential.toString();

            await this.uxService.sendIntentResponse({
                credential: credentialAsString
            }, this.receivedIntent.intentId);
        }
        catch (e) {
            void this.rejectRequest();
        }
    }

    async rejectRequest() {
        await this.uxService.sendIntentResponse({}, this.receivedIntent.intentId);
    }

    public getAppIcon() {
        return this.requestingAppIconUrl || "assets/identity/default/securityWarning.svg";
    }
}
