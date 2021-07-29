import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { ProfileService } from "../../services/profile.service";
import { BasicCredentialsService } from "../../services/basiccredentials.service";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { Logger } from "src/app/logger";
import { Subscription } from "rxjs";
import { Events } from "src/app/services/events.service";
import { transparentPixelIconDataUrl } from "src/app/helpers/picture.helpers";
import { AuthService } from "../../services/auth.service";
import { CredentialDisplayEntry } from "../../model/credentialdisplayentry.model";

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
        public events: Events,
        public route: ActivatedRoute,
        public zone: NgZone,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public profileService: ProfileService,
        private authService: AuthService,
        private basicCredentialService: BasicCredentialsService
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
        this.profileService.visibleCredentials.forEach(val => {
            this._publishableCredentials.push(Object.assign({}, val))
        });
        this.profileService.invisibleCredentials.forEach(val => {
            if (!("apppackage" in val.credential.getSubject()) || (val.credential.getFragment() == "avatar" && val.credential.getSubject().hasOwnProperty["data"]))
                this._publishableCredentials.push(val);
        });
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
        let fragment = entry.credential.getFragment();
        let translationKey = "identity.credential-info-type-" + fragment;
        let translated = this.translate.instant(translationKey);

        if (!translated || translated == "" || translated == translationKey)
            return fragment;

        return translated;
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

    async onVisibilityChange(visible: boolean, entry: CredentialDisplayEntry) {
        this.updatingVisibility = true;
        
        await this.authService.checkPasswordThenExecute(
            async () => {
                await this.profileService.setCredentialVisibility(entry.credential.getFragment(), visible, this.authService.getCurrentUserPassword());
                await this.profileService.updateDIDDocument();
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