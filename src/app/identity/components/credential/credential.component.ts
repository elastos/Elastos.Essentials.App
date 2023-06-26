import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import FastAverageColor from 'fast-average-color';
import { rawImageToBase64DataUrl, transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { DIDDocument } from '../../model/diddocument.model';
import { VerifiableCredential } from '../../model/verifiablecredential.model';
import { CredentialsService } from '../../services/credentials.service';
import { DIDService } from '../../services/did.service';
import { DIDDocumentsService } from '../../services/diddocuments.service';
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
    public isExpired = false;
    private issuerDidDocument: DIDDocument = null;
    private issuerName: string = null;
    public issuerIcon = transparentPixelIconDataUrl();

    // Whether this credential can be "verified", meaning that its fields implement published credential types
    public conformsToCredentialtypes = true;

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
        private expirationService: ExpirationService,
        private credentialsService: CredentialsService,
        private didDocumentsService: DIDDocumentsService
    ) { }

    ionViewWillEnter() {
    }

    /**
     * Called when the credential @input value changes
     */
    private async updateCredential(credential: DIDPlugin.VerifiableCredential) {
        if (credential) {
            this._credential = new VerifiableCredential(credential);

            // ISSUER icon placeholder while fetching the real icon
            this.issuerIcon = this.theme.darkMode ? 'assets/launcher/default/default-avatar.svg' : 'assets/launcher/default/darkmode/default-avatar.svg';

            // Get ISSUER info
            void this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(this._credential.pluginVerifiableCredential.getIssuer()).then(issuerDocumentStatus => {
                if (issuerDocumentStatus.checked && issuerDocumentStatus.document) {
                    // Issuer document fetched and non null: store it and
                    this.issuerDidDocument = issuerDocumentStatus.document;

                    // Get the issuer icon
                    let representativeIconSubject = this.didDocumentsService.getRepresentativeIcon(this.issuerDidDocument);
                    if (representativeIconSubject) {
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises
                        representativeIconSubject.subscribe(async iconBuffer => {
                            if (iconBuffer) {
                                this.issuerIcon = await rawImageToBase64DataUrl(iconBuffer);
                            }
                        });
                    }
                    else {
                        // No icon in the document
                    }

                    // Get the issuer name
                    this.issuerName = this.didDocumentsService.getRepresentativeOwnerName(this.issuerDidDocument);
                }
            });

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
            this.applyIconAfterFetch(this._credential, iconSrc);
        });
        this._credential.prepareForDisplay();
        this.description = this._credential.getDisplayableDescription();
    }

    /**
     * Applies an asynchronously fetched icon data to the UI icon
     */
    private applyIconAfterFetch(credential: VerifiableCredential, iconSrc: string) {
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
            image.src = credential.getFallbackIcon();
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
                let value = '';
                if (prop == 'wallet') {
                    value = this.translate.instant('common.wallet');
                    if (subject[prop]) {
                      let networkWallet = WalletService.instance.getNetworkWalletByWalletCredential(subject[prop]);
                      if (networkWallet) {
                        value += ' - ' + networkWallet.masterWallet.name;
                      }
                    }
                } else if (prop == 'gender') {
                    if (subject[prop] == 'M' || subject[prop] == 'male') {
                        value = this.translate.instant("identity.male");
                    } else if (subject[prop] == 'F' || subject[prop] == 'female') {
                        value = this.translate.instant("identity.female");
                    }
                } else {
                    value = subject[prop] != ""
                        ? subject[prop]
                        : this.translate.instant("identity.not-set");
                }

                return {
                    name: prop,
                    value: value
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

    public selfIssued(): boolean {
        if (!this._credential)
            return true;

        return this.credentialsService.credentialSelfIssued(this._credential);
    }

    public getIssuerName(): string {
        if (!this.issuerName) {
            if (!this.issuerDidDocument)
                return "";
            else
                return this.issuerDidDocument.pluginDidDocument.getSubject().getDIDString();
        }
        else {
            return this.issuerName;
        }
    }
}
