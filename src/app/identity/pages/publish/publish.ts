import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { transparentPixelIconDataUrl } from "src/app/helpers/picture.helpers";
import { GlobalEvents } from "src/app/services/global.events.service";
import { GlobalPopupService } from "src/app/services/global.popup.service";
import { GlobalThemeService } from "src/app/services/theming/global.theme.service";
import { CredentialDisplayEntry } from "../../model/credentialdisplayentry.model";
import { AuthService } from "../../services/auth.service";
import { BasicCredentialsService } from "../../services/basiccredentials.service";
import { ProfileService } from "../../services/profile.service";

@Component({
    selector: "page-publish",
    templateUrl: "publish.html",
    styleUrls: ["publish.scss"],
})

export class PublishPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    avatarImg = null;
    _publishableCredentials: CredentialDisplayEntry[] = [];
    public unchangedPublishedCredentials: DIDPlugin.VerifiableCredential[] = [];
    private subscription: Subscription = null;
    public updatingVisibility = false; // Lock toggles while updating the document for a short while to avoid parrallel updates

    constructor(
        public events: GlobalEvents,
        public route: ActivatedRoute,
        public zone: NgZone,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public profileService: ProfileService,
        private authService: AuthService,
        private basicCredentialService: BasicCredentialsService,
        private globalPopupService: GlobalPopupService
    ) {
        this.init();
    }

    ngOnInit() {
        this.subscription = this.events.subscribe("did:didchanged", () => {
            this.zone.run(() => {
                this.init();
            });
        });

        this._publishableCredentials = [];
        this.profileService.credsInLocalDoc.forEach(val => {
            this._publishableCredentials.push(Object.assign({}, val))
        });
        this.profileService.credsNotInLocalDoc.forEach(val => {
            if (!("apppackage" in val.credential.getSubject()) || (val.credential.getFragment() == "avatar" && val.credential.getSubject().hasOwnProperty["data"]))
                this._publishableCredentials.push(Object.assign({}, val));
        });

        this._publishableCredentials.forEach(pc => pc.credential.prepareForDisplay());
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    init() {
        this.profileService.getAvatarDataUrl().subscribe(avatarDataUrl => {
            this.avatarImg = avatarDataUrl;
        });
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('identity.publish'));
        this.unchangedPublishedCredentials = this.profileService.getUnchangedPublishedCredentials();
    }

    ionViewWillLeave() {
    }

    getDisplayableCredentialTitle(entry: CredentialDisplayEntry): string {
        return entry.credential.getDisplayableTitle();
    }

    displayableProperties(credential: DIDPlugin.VerifiableCredential) {
        let fragment = credential.getFragment();
        if (fragment === "avatar") return [];

        let subject = credential.getSubject();
        return Object.keys(subject)
            .filter((key) => key != "id")
            .sort()
            .map((prop) => {
                return {
                    name: prop,
                    value:
                        subject[prop] != ""
                            ? subject[prop]
                            : this.translate.instant("identity.not-set"),
                };
            });
    }

    publishableCredentials(): CredentialDisplayEntry[] {
        return this._publishableCredentials;
    }

    public async onCredentialCheckboxClicked(entry: CredentialDisplayEntry) {
        if (this.updatingVisibility)
            return;

        this.updatingVisibility = true;

        await this.authService.checkPasswordThenExecute(
            async () => {
                let makeVisible = !entry.isInLocalDocument;

                if (makeVisible) {
                    // Willing to make visible
                    // If the credential is sensitive, make sure to let user confirm his choice first
                    let relatedCredential = entry.credential;
                    if (relatedCredential.isSensitiveCredential()) {
                        let confirmed = await this.globalPopupService.showConfirmationPopup(this.translate.instant('identity.sensitive-title'), this.translate.instant('identity.sensitive-prompt'));
                        if (!confirmed) {
                            this.updatingVisibility = false;
                            return;
                        }
                    }
                }
                await this.profileService.setCredentialVisibility(entry.credential.getFragment(), makeVisible, this.authService.getCurrentUserPassword());
                entry.isInLocalDocument = !entry.isInLocalDocument;

                this.updatingVisibility = false;
            },
            () => {
                this.updatingVisibility = false;
            }
        );
    }

    getAvatar(entry: CredentialDisplayEntry): string {
        return this.avatarImg || transparentPixelIconDataUrl();
    }

    getCredIconSrc(entry: CredentialDisplayEntry): string {
        let fragment = entry.credential.getFragment();

        if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
            fragment = "finger-print";
        }

        let skin = this.theme.darkMode ? "dark" : "light";
        return `/assets/identity/smallIcons/dark/${fragment}.svg`;
    }

    isAvatarCred(entry: CredentialDisplayEntry): boolean {
        let fragment = entry.credential.getFragment();
        if (fragment === "avatar") {
            return true;
        } else {
            return false;
        }
    }
}