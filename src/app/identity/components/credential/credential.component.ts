import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import FastAverageColor from 'fast-average-color';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VerifiableCredential } from '../../model/verifiablecredential.model';
import { DIDService } from '../../services/did.service';
import { ExpirationService } from '../../services/expiration.service';
import { ProfileService } from '../../services/profile.service';

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
    @ViewChild("icon") iconElement: ElementRef;

    public _credential: VerifiableCredential = null;
    public description: string = null;
    public checkBoxColor = '#565bdb';
    public isExpired = false;

    @Input("selectable") public selectable = false; // Whether to show the selection checkbox or not
    @Input("selected") public selected = false; // On/off checkbox model - defined by the parent
    @Input("showPubStatus") public showPubStatus = true; // Show the "published" icon or not

    @Input()
    set credential(credential: DIDPlugin.VerifiableCredential) {
        void this.updateCredential(credential);
    }

    @Output("onClicked")
    private clicked?= new EventEmitter();

    @Output("checkBoxClicked")
    private checkBoxClicked?= new EventEmitter();

    constructor(
        public theme: GlobalThemeService,
        protected popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private profileService: ProfileService,
        private translate: TranslateService,
        private expirationService: ExpirationService
    ) { }

    /**
     * Called when the credential @input value changes
     */
    private async updateCredential(credential: DIDPlugin.VerifiableCredential) {
        if (credential) {
            this._credential = new VerifiableCredential(credential);

            // Check if the credential is expired
            let expirationInfo = this.expirationService.verifyCredentialExpiration(DIDService.instance.getActiveDid().pluginDid.getDIDString(), credential, 0);
            let isExpired = false;
            if (expirationInfo) // hacky case, but null expirationInfo means we should not check the expiration... (legacy)
                isExpired = expirationInfo.daysToExpire <= 0;

            await this.prepareCredential();
        }
        else {
            this._credential = null;
        }
    }

    private prepareCredential() {
        this._credential.onIconReady(iconSrc => {
            this.applyIconAfterFetch(iconSrc);
        });
        this._credential.prepareForDisplay();
        this.description = this._credential.getDisplayableDescription();

    }

    /**
     * Applies an asynchronously fetched icon data to the UI icon
     */
    private applyIconAfterFetch(iconSrc: string) {
        // Load the image manually to be able to extract the main color
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = async () => {
            this.iconElement.nativeElement.crossOrigin = 'anonymous';
            this.iconElement.nativeElement.src = image.src;

            const fac = new FastAverageColor();
            try {
                let color = await fac.getColorAsync(this.iconElement.nativeElement);

                // Change the icon background colro according to the main icon color type (light or dark)
                if (color.isDark)
                    this.iconElement.nativeElement.style.backgroundColor = "#FFFFFF80"; // color.rgba;
                else
                    this.iconElement.nativeElement.style.backgroundColor = "#00000080";
            } catch (e) {
                console.log(e);
            }
        };
        image.onerror = () => {
            image.src = "assets/identity/smallIcons/dark/finger-print.svg";
            this.iconElement.nativeElement.style.backgroundColor = "#00000080";
        };
        image.src = iconSrc;
    }

    /* public setTitle(title: string) {
        this._title = title;
    } */

    getIcon(): string {
        return this._credential.getDisplayableIconSrc();
    }

    getTitle(): string {
        return this._credential.getDisplayableTitle();
    }

    /**
     * Values representing the credential content, if the credential is not a DisplayableCredential.
     * typically, this is the list JSON fields.
     * Returns null if nothing can be displayed easily.
     */
    getValueItems(): ValueItem[] {
        let fragment = this._credential.pluginVerifiableCredential.getFragment();
        if (fragment === "avatar")
            return null;

        let subject = this._credential.pluginVerifiableCredential.getSubject();

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
        return this.profileService.credentialIsInPublishedDIDDocument(this._credential.pluginVerifiableCredential);
    }

    public isSensitive(): boolean {
        return this._credential.isSensitiveCredential();
    }

    public onClicked() {
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
