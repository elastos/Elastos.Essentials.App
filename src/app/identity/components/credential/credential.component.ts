import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Avatar } from 'src/app/contacts/models/avatar';
import { CredentialAvatar } from 'src/app/didsessions/model/did.model';
import { rawImageToBase64DataUrl, transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { GlobalHiveCacheService } from 'src/app/services/global.hivecache.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { ProfileService } from '../../services/profile.service';

class CredentialDisplayEntry {
    constructor(public credential: DIDPlugin.VerifiableCredential) { }
}

@Component({
    selector: 'credential',
    templateUrl: './credential.component.html',
    styleUrls: ['./credential.component.scss'],
})
export class CredentialComponent {
    public _credential: CredentialDisplayEntry = null;
    public iconSrc = transparentPixelIconDataUrl();
    public checkBoxColor = '#565bdb';

    @Input("selectable") public selectable = false; // Whether to show the selection checkbox or not
    @Input("selected") public selected = false; // On/off checkbox model - defined by the parent

    @Input()
    set credential(credential: DIDPlugin.VerifiableCredential) {
        void this.updateCredential(credential);
    }

    @Output("click")
    private clicked?= new EventEmitter();

    @Output("checkBoxClicked")
    private checkBoxClicked?= new EventEmitter();

    constructor(
        public theme: GlobalThemeService,
        protected popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private profileService: ProfileService,
        private basicCredentialService: BasicCredentialsService,
        private translate: TranslateService,
        private hiveCache: GlobalHiveCacheService
    ) {
        theme.activeTheme.subscribe((activeTheme) => {
            //this.setTitleBarTheme(activeTheme);
        });
    }

    /**
     * Called when the credential @input value changes
     */
    private async updateCredential(credential: DIDPlugin.VerifiableCredential) {
        if (credential) {
            this._credential = new CredentialDisplayEntry(credential);
            await this.prepareIcon();
        }
        else {
            this._credential = null;
        }
    }

    private async prepareIcon() {
        if (this.hasRemotePictureToFetch()) { // Remote picture to fetch
            let avatarCredential = this._credential.credential;
            if (avatarCredential.getSubject() && avatarCredential.getSubject().avatar && avatarCredential.getSubject().avatar.data) {
                let hiveAssetUrl: string = avatarCredential.getSubject().avatar.data;
                let avatarCacheKey = hiveAssetUrl;

                if (hiveAssetUrl.startsWith("hive://")) {
                    Logger.log("identity", "Refreshing picture from hive url", hiveAssetUrl);
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  /* this.hiveCacheDataUrlSub = */ this.hiveCache.getAssetByUrl(avatarCacheKey, hiveAssetUrl).subscribe(async rawData => {
                        //console.log("DEBUG HIVE CACHE CHANGED IN PROFILE SERVICE, NEXT", /* rawData */)
                        if (rawData) {
                            Logger.log("identity", "Got raw picture data from hive");
                            let base64DataUrl = await rawImageToBase64DataUrl(rawData);
                            //console.log("DEBUG BASE64 ENCODED", /* base64DataUrl */);
                            this.iconSrc = base64DataUrl;
                        }
                        else {
                            Logger.log("identity", "Got empty avatar data from hive");
                            this.iconSrc = transparentPixelIconDataUrl();
                        }
                    });
                }
                else {
                    // Assume base64.
                    let avatar = await Avatar.fromAvatarCredential(avatarCredential.getSubject().avatar as CredentialAvatar);
                    this.iconSrc = avatar.toBase64DataUrl();
                }
            }

        }
        else { // No remote picture to fetch
            let fragment = this._credential.credential.getFragment();

            if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
                fragment = "finger-print";
            }

            this.iconSrc = `/assets/identity/smallIcons/dark/${fragment}.svg`;
        }
    }

    /* public setTitle(title: string) {
        this._title = title;
    } */

    // TODO: rework
    getIcon(): string {
        return this.iconSrc;
    }

    // TODO: currently does backward compatibility for ID-based credentials in profile. Rework
    getTitle(): string {
        let fragment = this._credential.credential.getFragment();
        let translationKey = "identity.credential-info-type-" + fragment;
        let translated = this.translate.instant(translationKey);

        if (!translated || translated == "" || translated == translationKey)
            return fragment;

        return translated;
    }

    /**
     * Values representing the credential content, or null if nothing can be displayed easily.
     */
    getValueItems(): { name: string, value: string }[] {
        let fragment = this._credential.credential.getFragment();
        if (fragment === "avatar")
            return null;

        let subject = this._credential.credential.getSubject();

        // TODO: rework with displayable credential - for now, display raw properties
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

    isPublished(): boolean {
        return this.profileService.credentialIsInLocalDIDDocument(this._credential.credential);
    }

    // TODO - rework - basic way of checking if the credential is an avatar.
    // Rework using a specific avatar credential type.
    private hasRemotePictureToFetch(): boolean {
        let fragment = this._credential.credential.getFragment();
        if (fragment === "avatar") {
            return true;
        } else {
            return false;
        }
    }

    public onClick() {
        this.clicked?.emit();
    }

    /**
     * Notify parent page, without changing the selected status. The page will decide this.
     */
    public onChecked(event) {
        event.preventDefault();

        this.checkBoxClicked?.emit();
    }
}
