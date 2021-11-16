import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Avatar } from 'src/app/contacts/models/avatar';
import { CredentialAvatar } from 'src/app/didsessions/model/did.model';
import { evalObjectFieldPath } from 'src/app/helpers/objects';
import { rawImageToBase64DataUrl, transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { JSONObject } from 'src/app/model/json';
import { GlobalHiveCacheService } from 'src/app/services/global.hivecache.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { DIDService } from '../../services/did.service';
import { ExpirationService } from '../../services/expiration.service';
import { ProfileService } from '../../services/profile.service';

class CredentialDisplayEntry {
    constructor(public credential: DIDPlugin.VerifiableCredential) { }
}

type ValueItem = {
    name: string,
    value: string
};

@Component({
    selector: 'credential',
    templateUrl: './credential.component.html',
    styleUrls: ['./credential.component.scss'],
})
export class CredentialComponent {
    public _credential: CredentialDisplayEntry = null;
    public iconSrc = transparentPixelIconDataUrl();
    public description: string = null;
    public checkBoxColor = '#565bdb';
    public isExpired = false;

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
        private hiveCache: GlobalHiveCacheService,
        private expirationService: ExpirationService
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

            // Check if the credential is expired
            let expirationInfo = this.expirationService.verifyCredentialExpiration(DIDService.instance.getActiveDid().pluginDid.getDIDString(), credential, 0);
            let isExpired = false;
            if (expirationInfo) // hacky case, but null expirationInfo means we should not check the expiration... (legacy)
                isExpired = expirationInfo.daysToExpire <= 0;

            await this.prepareIcon();
            await this.prepareDescription();
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
            // If the credential implements the DisplayableCredential interface, we get the icon from this.
            let credProps = this._credential.credential.getSubject();
            if ("displayable" in credProps) {
                this.iconSrc = (credProps["displayable"] as JSONObject)["icon"] as string;
            }
            else {
                // Fallback for old style credentials - try to guess an icon, or use a defaut one.
                let fragment = this._credential.credential.getFragment();

                if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
                    fragment = "finger-print";
                }

                this.iconSrc = `/assets/identity/smallIcons/dark/${fragment}.svg`;
            }
        }
    }

    private prepareDescription() {
        let credProps = this._credential.credential.getSubject();
        if ("displayable" in credProps) {
            // rawDescription sample: hello ${firstName} ${lastName.test}
            let rawDescription = (credProps["displayable"] as JSONObject)["description"] as string;

            // From a raw description, find all special ${...} tags and replace them with values from the subject.
            if (rawDescription) {
                let keywordTags = Array.from(rawDescription.match(/\${([a-zA-Z0-9.]+)}/g))

                let description = rawDescription;
                for (let tag of keywordTags) {
                    // tag: ${xxx}
                    // matchingGroup: ['${...}', '...'];
                    let matchingGroup = tag.match(/\${([a-zA-Z0-9.]+)}/);
                    if (matchingGroup && matchingGroup.length > 1) {
                        let jsonFieldPath = matchingGroup[1];
                        let evaluatedField = evalObjectFieldPath(credProps, jsonFieldPath);
                        description = description.replace(tag, evaluatedField);
                    }
                }
                this.description = description;
            }
        }
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

    /* public setTitle(title: string) {
        this._title = title;
    } */

    // TODO: rework
    getIcon(): string {
        return this.iconSrc;
    }

    // NOTE: currently does backward compatibility for ID-based credentials in profile. Rework
    getTitle(): string {
        // If the credential implements the DisplayableCredential type, get the title from there.
        let credProps = this._credential.credential.getSubject();
        if ("displayable" in credProps) {
            return (credProps["displayable"] as JSONObject)["title"] as string;
        }
        else {
            // Fallback try to guess a name, or use a default display
            let fragment = this._credential.credential.getFragment();
            let translationKey = "identity.credential-info-type-" + fragment;
            let translated = this.translate.instant(translationKey);

            if (!translated || translated == "" || translated == translationKey)
                return fragment;

            return translated;
        }
    }

    /**
     * Values representing the credential content, if the credential is not a DisplayableCredential.
     * typically, this is the list JSON fields.
     * Returns null if nothing can be displayed easily.
     */
    getValueItems(): ValueItem[] {
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
