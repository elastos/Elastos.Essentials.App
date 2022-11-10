import { Avatar } from 'src/app/contacts/models/avatar';
import { CredentialAvatar } from 'src/app/didsessions/model/did.model';
import { evalObjectFieldPath } from 'src/app/helpers/objects';
import { rawImageToBase64DataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { JSONObject } from 'src/app/model/json';
import { GlobalHiveCacheService } from 'src/app/services/global.hivecache.service';
import { GlobalTranslationService } from '../../services/global.translation.service';
import { BasicCredentialsService } from '../services/basiccredentials.service';

export class VerifiableCredential {
    private title: string = null;
    private description: string = null;
    private iconSrc: string = this.getFallbackIcon();
    private onIconReadyCallback: (iconSrc: string) => void = null;

    constructor(public pluginVerifiableCredential: DIDPlugin.VerifiableCredential) {
    }

    /**
     * Prepare all display data.
     */
    public prepareForDisplay() {
        this.prepareTitle();
        this.prepareDescription();
        void this.prepareIcon();
    }

    private prepareTitle() {
        // If the credential implements the DisplayableCredential type, get the title from there.
        let credProps = this.pluginVerifiableCredential.getSubject();
        if ("displayable" in credProps) {
            this.title = (credProps["displayable"] as JSONObject)["title"] as string;
        }
        else {
            // Fallback try to guess a name, or use a default display
            let fragment = this.pluginVerifiableCredential.getFragment();
            let translationKey = "identity.credential-info-type-" + fragment;
            let translated = GlobalTranslationService.instance.translateInstant(translationKey);

            if (!translated || translated == "" || translated == translationKey)
                this.title = fragment;
            else
                this.title = translated;
        }
    }

    /**
     * Tries to extract a user friendly "description" of the credential, ie a readable summary
     * of its content. Such summary is currently built this way:
     * - If the credential is a DisplayableCredential type, use those fields
     */
    private prepareDescription() {
        let credProps = this.pluginVerifiableCredential.getSubject();
        if ("displayable" in credProps) {
            // rawDescription sample: hello ${firstName} ${lastName.test}
            let rawDescription = (credProps["displayable"] as JSONObject)["description"] as string;

            // From a raw description, find all special ${...} tags and replace them with values from the subject.
            if (rawDescription) {
                let tagsMatch = rawDescription.match(/\${([a-zA-Z0-9.]+)}/g);
                let keywordTags = tagsMatch ? Array.from(tagsMatch) : [];

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

    private async prepareIcon(): Promise<void> {
        if (this.hasRemotePictureToFetch()) { // Remote picture to fetch
            let avatarCredential = this.pluginVerifiableCredential;
            if (avatarCredential.getSubject() && avatarCredential.getSubject().avatar && avatarCredential.getSubject().avatar.data) {
                let hiveAssetUrl: string = avatarCredential.getSubject().avatar.data;
                let avatarCacheKey = hiveAssetUrl;

                if (hiveAssetUrl.startsWith("hive://")) {
                    Logger.log("identity", "Refreshing picture from hive url", hiveAssetUrl);
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  /* this.hiveCacheDataUrlSub = */ GlobalHiveCacheService.instance.getAssetByUrl(avatarCacheKey, hiveAssetUrl).subscribe(async rawData => {
                        //console.log("DEBUG HIVE CACHE CHANGED IN PROFILE SERVICE, NEXT", /* rawData */)
                        if (rawData) {
                            Logger.log("identity", "Got raw picture data from hive");
                            let base64DataUrl = await rawImageToBase64DataUrl(rawData);
                            //console.log("DEBUG BASE64 ENCODED", /* base64DataUrl */);
                            this.iconSrc = base64DataUrl;
                        }
                        else {
                            Logger.log("identity", "Got empty picture data from the hive cache service (real picture may come later)");
                            this.iconSrc = null;
                        }
                        this.loadIconWithFallback();
                    });
                }
                else {
                    // Assume base64.
                    let avatar = await Avatar.fromAvatarCredential(avatarCredential.getSubject().avatar as CredentialAvatar);
                    this.iconSrc = avatar.toBase64DataUrl();
                    this.loadIconWithFallback();
                }
            }
        }
        else { // No remote picture to fetch
            // If the credential implements the DisplayableCredential interface, we get the icon from this.
            let credProps = this.pluginVerifiableCredential.getSubject();
            if ("displayable" in credProps) {
                this.iconSrc = (credProps["displayable"] as JSONObject)["icon"] as string;
            }
            else {
                // Fallback for old style credentials - try to guess an icon, or use a defaut one.
                let fragment = this.pluginVerifiableCredential.getFragment();

                if (!BasicCredentialsService.instance.getBasicCredentialkeys().some(x => x == fragment)) {
                    fragment = "finger-print";
                }

                this.iconSrc = `/assets/identity/smallIcons/dark/${fragment}.svg`;
            }

            this.loadIconWithFallback();
        }
    }

    /**
     * Tries to load the target picture, and in case of error, replaces the icon src with
     * a placeholder.
     */
    private loadIconWithFallback() {
        if (this.iconSrc == null) {
            this.iconSrc = this.getFallbackIcon();
        }

        let image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
            this.iconSrc = image.src;
            this.onIconReadyCallback?.(this.iconSrc);
        };
        image.onerror = () => {
            this.iconSrc = this.getFallbackIcon();
            this.onIconReadyCallback?.(this.iconSrc);
        };

        // Try to load the picture
        image.src = this.iconSrc;
    }

    /**
     * Fallback icon used either when the real icon is not loaded yet, or failed to load
     */
    public getFallbackIcon(): string {
        if (!this.isUserAvatar())
            return "assets/identity/smallIcons/dark/finger-print.svg";
        else
            return "assets/identity/smallIcons/dark/name.svg";
    }

    // TODO - rework - basic way of checking if the credential is an avatar.
    // Rework using a specific avatar credential type.
    private hasRemotePictureToFetch(): boolean {
        let fragment = this.pluginVerifiableCredential.getFragment();
        if (fragment === "avatar") {
            return true;
        } else {
            return false;
        }
    }

    /**
    * Similar to hasRemotePictureToFetch() but more narrow (only for pictures representing faces)
    */
    private isUserAvatar(): boolean {
        let fragment = this.pluginVerifiableCredential.getFragment();
        return (fragment === "avatar");
    }

    /**
     * Icon source directly display in a HTML <img>. Either a url, or a base64 image.
     */
    public getDisplayableIconSrc(): string {
        return this.iconSrc;
    }

    /**
     * "Title" best representing this credential on the UI
     */
    public getDisplayableTitle(): string {
        return this.title;
    }

    /**
     * "Sub-title" / "description" best representing this credential on the UI
     * */
    public getDisplayableDescription(): string {
        return this.description;
    }

    public onIconReady(callback: (iconSrc: string) => void) {
        this.onIconReadyCallback = callback;
    }

    /**
     * Convenient shortcut to the real credential
     */
    public getSubject(): any {
        return this.pluginVerifiableCredential.getSubject();
    }

    /**
     * Convenient shortcut to the real credential
     */
    public getFragment(): any {
        return this.pluginVerifiableCredential.getFragment();
    }

    /**
     * Convenient shortcut to the real credential
     */
    public getTypes(): any {
        return this.pluginVerifiableCredential.getTypes();
    }

    /**
     * Convenient shortcut to the real credential
     */
    public getId(): any {
        return this.pluginVerifiableCredential.getId();
    }

    /**
     * Tells if this credentials is considered as sensitive, meaning that users should be careful
     * while publishing or sharing such credential.
     */
    public isSensitiveCredential(): boolean {
        return this.pluginVerifiableCredential.getTypes().indexOf("SensitiveCredential") >= 0;
    }
}