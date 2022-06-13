import { Component, NgZone, OnInit, ViewChild } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { ActionSheetController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { isNil } from "lodash-es";
import * as moment from "moment";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { TitleBarIcon, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { reducedDidString } from "src/app/helpers/did.helper";
import { rawImageToBase64DataUrl, transparentPixelIconDataUrl } from "src/app/helpers/picture.helpers";
import { AuthService } from "src/app/identity/services/auth.service";
import { Logger } from "src/app/logger";
import { GlobalCredentialTypesService } from "src/app/services/credential-types/global.credential.types.service";
import { GlobalEvents } from "src/app/services/global.events.service";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { GlobalNativeService } from "src/app/services/global.native.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalPopupService } from "src/app/services/global.popup.service";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { DIDDocument } from "../../model/diddocument.model";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { CredentialsService } from "../../services/credentials.service";
import { DIDService } from "../../services/did.service";
import { DIDDocumentsService } from "../../services/diddocuments.service";
import { ProfileService } from "../../services/profile.service";

type IssuerDisplayEntry = {
  did: string;
  name: string;
  avatar: string;
};

type DisplayProperty = {
  name: string;
  value: string;
};

@Component({
  selector: "credentialdetails-profile",
  templateUrl: "credentialdetails.page.html",
  styleUrls: ["credentialdetails.page.scss"],
})
export class CredentialDetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public credentials: VerifiableCredential[];
  public currentOnChainDIDDocument: DIDDocument = null;
  public credential: VerifiableCredential;
  private avatarImg = null;
  public isCredentialInLocalDIDDocument = false;
  public isCredentialInPublishedDIDDocument = false;
  public hasCheckedCredential = false;
  public conformityChecked = false;
  public isConform = false;
  public updatingVisibility = false; // The local document is being updated to add or remove this credential

  public segment = "validator";
  public credentialId: string = null;
  public iconSrc = transparentPixelIconDataUrl(); // Main icon html src data
  public iconLoaded = false;

  // Issuer
  private issuerDidDocument: DIDDocument = null;
  private issuerName: string = null;
  public issuerIcon = transparentPixelIconDataUrl();
  public issuerDid: string = null;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private onlineDIDDocumentStatusSub: Subscription = null;

  public displayableProperties: DisplayProperty[];

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public events: GlobalEvents,
    public route: ActivatedRoute,
    private router: Router,
    public zone: NgZone,
    private translate: TranslateService,
    private didService: DIDService,
    public theme: GlobalThemeService,
    public actionSheetController: ActionSheetController,
    public profileService: ProfileService,
    private globalIntentService: GlobalIntentService,
    private globalPopupService: GlobalPopupService,
    private globalNavService: GlobalNavService,
    private globalNativeService: GlobalNativeService,
    private didDocumentsService: DIDDocumentsService,
    private authService: AuthService,
    private credentialsService: CredentialsService,
    private sanitizer: DomSanitizer,
    private globalCredentialTypesService: GlobalCredentialTypesService
  ) {
    this.init();
  }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state.credentialId) {
      this.credentialId = navigation.extras.state.credentialId;

      let didString = this.didService.getActiveDid().getDIDString();
      this.onlineDIDDocumentStatusSub = this.didDocumentsService.onlineDIDDocumentsStatus.get(didString).subscribe((document) => {
        void this.prepareCredential();
      });
    }

    this.didchangedSubscription = this.events.subscribe("did:didchanged", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.documentChangedSubscription = this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {
      Logger.log('Identity', "Publish avatar?", publishAvatar);
      // When the did document content changes, we rebuild our profile entries on screen.
      this.init(publishAvatar);
    });

    this.credentialaddedSubscription = this.events.subscribe("did:credentialadded", () => {
      this.zone.run(() => {
        this.init();
      });
    });
  }

  unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.unsubscribe(this.didchangedSubscription);
    this.unsubscribe(this.publicationstatusSubscription);
    this.unsubscribe(this.documentChangedSubscription);
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.onlineDIDDocumentStatusSub);
  }

  init(publishAvatar?: boolean) {
    let identity = this.didService.getActiveDid();
    if (identity) {
      this.credentials = identity.credentials;

      this.profileService.getAvatarDataUrl().subscribe(avatarDataUrl => {
        this.avatarImg = avatarDataUrl;
      });
    }
  }

  ionViewWillEnter() {
    this.displayableProperties = this.getDisplayableProperties();
    this.titleBar.setTitle(this.translate.instant('identity.credentialdetails-title'));
    this.titleBar.setupMenuItems([
      { key: "delete", title: this.translate.instant('common.delete'), iconPath: "assets/contacts/images/delete.svg" }
    ]);
    this.titleBar.setMenuVisibility(true);

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if (icon.key === "delete") {
        void this.deleteCredential();
      }
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();
  }

  sanitize(imgPath: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(imgPath);
  }

  prepareCredential() {
    Logger.log("identity", "Computing credential status");

    this.iconLoaded = false;
    this.credential = null;
    this.segment = "validator";

    // Issuer icon placeholder while fetching the real icon
    this.issuerIcon = this.theme.darkMode ? 'assets/launcher/default/default-avatar.svg' : 'assets/launcher/default/darkmode/default-avatar.svg';

    if (isNil(this.credentialId) || isNil(this.credentials) || this.credentials.length <= 0)
      return;

    let selected = this.credentials.filter(
      (item) => item.pluginVerifiableCredential.getId() == this.credentialId
    );

    if (selected.length > 0)
      this.credential = selected[0];

    if (this.credential == null)
      return;

    this.checkIsCredentialInPublishedDIDDocument();
    this.checkIsCredentialInLocalDIDDocument();

    void this.globalCredentialTypesService.verifyCredential(this.credential.pluginVerifiableCredential).then(isFullyConform => {
      this.conformityChecked = true;
      this.isConform = isFullyConform;
    });

    // Prepare the credential for display
    this.credential.onIconReady(iconSrc => {
      this.zone.run(() => {
        this.iconSrc = iconSrc;
        this.iconLoaded = true;
      })
    });
    this.credential.prepareForDisplay();

    void this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(this.credential.pluginVerifiableCredential.getIssuer()).then(issuerDocumentStatus => {
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

        // Issuer DID for display
        this.issuerDid = reducedDidString(this.issuerDidDocument.pluginDidDocument.getSubject().getDIDString());
      }
    });

    //await this.isLocalCredSyncOnChain();
    this.hasCheckedCredential = true;
  }

  getDisplayableCredentialTitle(): string {
    return this.credential.getDisplayableTitle();
  }

  public hasDescription(): boolean {
    return !!this.credential.getDisplayableDescription();
  }

  public getDisplayableCredentialDescription(): string {
    return this.credential.getDisplayableDescription();
  }

  public getDisplayableCredentialIssuanceDate(): string {
    return moment(this.credential.pluginVerifiableCredential.getIssuanceDate()).format("LL");
  }

  public getDisplayableCredentialExpirationDate(): string {
    return moment(this.credential.pluginVerifiableCredential.getExpirationDate()).format("LL");
  }

  getDisplayableProperties() {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    if (fragment === "avatar") return [];

    let subject = this.credential.pluginVerifiableCredential.getSubject();
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

  isAvatarCred(): boolean {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    if (fragment === "avatar") {
      return true;
    } else {
      return false;
    }
  }

  getAvatar(): string {
    return this.avatarImg || transparentPixelIconDataUrl(); // Transparent pixel while loading
  }

  getCredIconSrc() {
    return this.sanitize(this.iconSrc);

    /* let fragment = this.credential.pluginVerifiableCredential.getFragment();

    if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
      fragment = "finger-print";
    }

    let skin = this.theme.darkMode ? "dark" : "light";
    return this.isVerified() ? `/assets/identity/headerIcons/${skin}/${fragment}-verified.svg` : `/assets/identity/headerIcons/${skin}/${fragment}.svg`; */
  }

  getSmallIcon(iconName: string) {
    return this.theme.darkMode ? `/assets/identity/smallIcons/dark/${iconName}.svg` : `/assets/identity/smallIcons/light/${iconName}.svg`
  }

  getCredIcon(): string {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    switch (fragment) {
      case "avatar":
        return "image";
      case "wechat":
        return "logo-whatsapp";
      case "instagram":
        return "logo-instagram";
      case "facebook":
        return "logo-facebook";
      case "snapchat":
        return "logo-snapchat";
      case "twitter":
        return "logo-twitter";
      case "email":
        return "mail";
      case "birthDate":
        return "calendar";
      case "nationality":
        return "flag";
      case "gender":
        return "transgender";
      case "telephone":
        return "call";
      case "nickname":
        return "glasses";
      case "birthPlace":
        return "globe";
      case "occupation":
        return "briefcase";
      case "education":
        return "school";
      case "interests":
        return "football";
      case "description":
        return "book";
      case "url":
        return "link";
      case "telegram":
        return "send";
      case "tiktok":
        return "logo-tiktok";
      case "twitch":
        return "logo-twitch";
      case "venmo":
        return "logo-venmo";
      case "paypal":
        return "logo-paypal";
      case "elaAddress":
        return "wallet";
      default:
        return "finger-print";
    }
  }

  public isSensitive(): boolean {
    return this.credential.isSensitiveCredential();
  }

  transformDate(date): string {
    return moment(date).format("DD, MMMM YYYY");
  }

  issuerSegmentChanged(ev: any) {
    this.segment = ev.detail.value;
  }

  /******************** Display Data Sync Status between Local and Onchain ********************/
  getLocalCredByProperty(property: string): string {
    const credHasProp = (property in this.credential.pluginVerifiableCredential.getSubject());
    if (credHasProp)
      return this.credential.pluginVerifiableCredential.getSubject()[property];

    return null;
  }

  getOnChainCredByProperty(property: string): string {
    const chainValue = this.currentOnChainDIDDocument
      .getCredentials()
      .filter((c) => {
        if (property in c.getSubject()) {
          return c;
        }
      });

    return chainValue.length ? chainValue[0].getSubject()[property] : null;
  }

  /* async isLocalCredSyncOnChain() {
    let didString = this.didService.getActiveDid().getDIDString();
    this.currentOnChainDIDDocument = await this.didSyncService.onlineDIDDocumentsStatus.get(didString).value.document;
    if (this.currentOnChainDIDDocument === null) {
      this.isCredentialInLocalDocument = false;
      return false;
    }

    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let localValue = this.credential.pluginVerifiableCredential.getSubject()[fragment];

    let chainValue = this.currentOnChainDIDDocument.getCredentialById(new DIDURL("#" + fragment));
    if (!chainValue) {
      this.isCredentialInLocalDocument = false;
      return false;
    }

    if (!localValue) {
      // handle external credentials
      this.isCredentialInLocalDocument = true;
      return;
    }

    chainValue = chainValue.getSubject()[fragment];

    if (typeof localValue === "object" || typeof chainValue === "object") {
      //avatar
      this.isCredentialInLocalDocument = JSON.stringify(localValue) === JSON.stringify(chainValue);
      return;
    }

    Logger.log('Identity', 'Local ' + localValue + " ; Chain " + chainValue);
    this.isCredentialInLocalDocument = localValue === chainValue;
  } */

  private checkIsCredentialInPublishedDIDDocument() {
    if (!this.credential)
      this.isCredentialInPublishedDIDDocument = false;
    else
      this.isCredentialInPublishedDIDDocument = this.profileService.credentialIsInPublishedDIDDocument(this.credential.pluginVerifiableCredential);
  }

  private checkIsCredentialInLocalDIDDocument() {
    if (!this.credential)
      this.isCredentialInLocalDIDDocument = false;
    else
      this.isCredentialInLocalDIDDocument = this.profileService.credentialIsInLocalDIDDocument(this.credential.pluginVerifiableCredential);
  }

  async publishCredential(): Promise<void> {
    await this.authService.checkPasswordThenExecute(
      async () => {
        // Make the credential visible in the did document
        await this.profileService.setCredentialVisibility(this.credential.pluginVerifiableCredential.getFragment(), true, this.authService.getCurrentUserPassword());

        // Show the publish prompt
        void this.profileService.showWarning("publishVisibility", "");
      },
      () => {
      }
    );
  }

  verifyCredential() {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let localValue = this.credential.pluginVerifiableCredential.getSubject()[
      fragment
    ];

    let claimsObject = {
      id: this.didService.getActiveDid().getDIDString(),
    };

    claimsObject[fragment] = localValue;

    void this.globalIntentService.sendIntent(
      "https://did.elastos.net/credverify",
      {
        claims: claimsObject,
      }
    );
  }

  /**
   * User requests to delete this credential:
   * - confirm
   * - delete from DID document
   * - delete from store
   * - exit screen
   */
  private async deleteCredential() {
    Logger.log("identity", "Request to delete current credential");
    let deletionConfirmed = await this.globalPopupService.showConfirmationPopup(this.translate.instant('identity.delete-credential'), this.translate.instant('identity.delete-credential-info'));
    if (!deletionConfirmed)
      return; // Cancelled

    // Delete
    let wasDeleted = await this.credentialsService.deleteCredential(this.credential);
    Logger.log("identity", "Credential deletion result:", wasDeleted, ". Maybe exiting screen");

    // Exit
    if (wasDeleted)
      void this.globalNavService.navigateBack();
  }

  /**
   * Adds or removes the current credential from the local DID Document, ready for next publication.
   */
  public async onVisibilityChange(visible: boolean) {
    this.updatingVisibility = true;

    await this.authService.checkPasswordThenExecute(
      async () => {
        if (visible) {
          // Willing to make visible
          // If the credential is sensitive, make sure to let user confirm his choice first
          let relatedCredential = this.credential;
          if (relatedCredential.isSensitiveCredential()) {
            let confirmed = await this.globalPopupService.showConfirmationPopup(this.translate.instant('identity.sensitive-title'), this.translate.instant('identity.sensitive-prompt'));
            if (!confirmed) {
              this.isCredentialInLocalDIDDocument = false; // Revert user's UI choice as we cancel this.
              this.updatingVisibility = false;
              return;
            }
          }
        }

        // Instantly update (save) this change in the profile service - cannot undo
        await this.profileService.setCredentialVisibility(this.credential.pluginVerifiableCredential.getFragment(), visible, AuthService.instance.getCurrentUserPassword());
        this.updatingVisibility = false;

        if (visible)
          this.globalNativeService.genericToast(this.translate.instant('identity.change-visible'));
        else {
          if (this.isCredentialInPublishedDIDDocument)
            this.globalNativeService.genericToast(this.translate.instant('identity.change-unpublished'));
          else
            this.globalNativeService.genericToast(this.translate.instant('identity.change-not-published'));
        }
      },
      () => {
        this.updatingVisibility = false;
        this.isCredentialInLocalDIDDocument = !this.isCredentialInLocalDIDDocument; // Revert user's UI choice as we cancel this.
      }
    );
  }

  public selfIssued(): boolean {
    if (!this.credential)
      return true;

    return this.credentialsService.credentialSelfIssued(this.credential);
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
