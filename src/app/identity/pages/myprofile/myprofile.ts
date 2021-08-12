import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ModalController, ActionSheetController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { ShowQRCodeComponent } from "../../components/showqrcode/showqrcode.component";
import { Profile } from "../../model/profile.model";
import { DIDURL } from "../../model/didurl.model";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { Native } from "../../services/native";
import { DID } from "../../model/did.model";
import { DIDDocument } from "../../model/diddocument.model";
import { AuthService } from "../../services/auth.service";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { Logger } from "src/app/logger";
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { Events } from "src/app/services/events.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { CredentialDisplayEntry } from "../../model/credentialdisplayentry.model";

type IssuerDisplayEntry = {
  did: string;
  name: string;
  avatar: string;
};

@Component({
  selector: "page-myprofile",
  templateUrl: "myprofile.html",
  styleUrls: ["myprofile.scss"],
})
export class MyProfilePage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public profile: Profile;

  public profileName: string = null;
  public credentials: VerifiableCredential[];
  //public hasCredential = false;
  public creatingIdentity = false;
  //public hasModifiedCredentials = false;
  public avatarDataUrl: string = null;

  public fetchingApps = false;

  public currentOnChainDIDDocument: DIDDocument = null;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private documentFetchedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private promptpublishdidSubscription: Subscription = null;
  private modifiedCredentialsSubscription: Subscription = null;
  private avatarSubscription: Subscription = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public events: Events,
    public route: ActivatedRoute,
    public zone: NgZone,
    private translate: TranslateService,
    private authService: AuthService,
    private didService: DIDService,
    private didSyncService: DIDSyncService,
    private modalCtrl: ModalController,
    private native: Native,
    public theme: GlobalThemeService,
    public profileService: ProfileService,
    public actionSheetController: ActionSheetController,
    private globalIntentService: GlobalIntentService,
    private globalNav: GlobalNavService
  ) {
    this.init();
  }

  ngOnInit() {
    this.didchangedSubscription = this.events.subscribe("did:didchanged", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.documentChangedSubscription = this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {
      Logger.log("identity", "Publish avatar?", publishAvatar);
      // When the did document content changes, we rebuild our profile entries on screen.
      this.init(publishAvatar);
    });

    // When the personal DID document finished being fetched from chain
    let didString = this.didService.getActiveDid().getDIDString();
    /* this.didSyncService.onlineDIDDocumentsStatus.get(didString).subscribe((status) => {
      if (status.checked) {
        this.zone.run(() => {
          // Compare local credentials with the ones in the document.
          Logger.log("identity", "DID Document fetch completed, comparing local credentials with document ones");
        });
      }
    }); */

    this.credentialaddedSubscription = this.events.subscribe("did:credentialadded", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.promptpublishdidSubscription = this.events.subscribe("did:promptpublishdid", () => {
      this.zone.run(() => {
        void this.profileService.showWarning("publishIdentity", null);
      });
    });

    /* this.modifiedCredentialsSubscription = this.events.subscribe("credentials:modified", () => {
      this.zone.run(() => {
        Logger.log("identity", "Credentials have been modified, comparing local credentials with document ones");
      });
    }); */

    this.avatarSubscription = this.profileService.getAvatarDataUrl().subscribe(dataUrl => {
      this.avatarDataUrl = dataUrl;
    });
  }

  unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
  }

  ngOnDestroy() {
    this.unsubscribe(this.didchangedSubscription);
    this.unsubscribe(this.publicationstatusSubscription);
    this.unsubscribe(this.documentChangedSubscription);
    this.unsubscribe(this.documentFetchedSubscription);
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.promptpublishdidSubscription);
    this.unsubscribe(this.modifiedCredentialsSubscription);
    this.unsubscribe(this.avatarSubscription);
  }

  init(publishAvatar?: boolean) {
    let identity = this.didService.getActiveDid();
    if (identity) {
      // Happens when importing a new mnemonic over an existing one
      this.profile = identity.getBasicProfile();
      this.profileName = this.profile.getName();
      /* this.credentials = identity.credentials;
      this.hasCredential = this.credentials.length > 0 ? true : false;
      Logger.log("identity", "Has credentials?", this.hasCredential);

      // Sort credentials by title
      this.credentials.sort((c1, c2) => {
        if (
          c1.pluginVerifiableCredential.getFragment() >
          c2.pluginVerifiableCredential.getFragment()
        )
          return 1;
        else return -1;
      });

      this.buildDetailEntries();
      this.buildCredentialEntries(publishAvatar); */
    }
  }

  ionViewWillEnter() {
    Logger.log("identity", "ionWillEnter");
    //this.buildCredentialEntries();

    /* this.unchangedPublishedCredentials = this.profileService.getUnchangedPublishedCredentials();
    this.hasModifiedCredentials = this.profileService.hasModifiedCredentials(); */

    this.profileService.didString = this.didService.getActiveDid().getDIDString();
    void this.didSyncService
      .getDIDDocumentFromDID(this.profileService.didString)
      .then(async (didDoc) => {
        this.currentOnChainDIDDocument = didDoc;
        if (this.currentOnChainDIDDocument) {
          Logger.log("identity", "MyProfile: Published DID Document", await this.currentOnChainDIDDocument.pluginDidDocument.toJson());
        } else {
          Logger.log("identity", "MyProfile: DIDDocument is not published.");
        }
      });

    this.titleBar.setTitle(this.translate.instant("identity.my-identity"));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "settings",
      iconPath: BuiltInIcon.SETTINGS
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if (icon.key == "settings") {
        void this.native.go('/identity/settings');
      }
    });
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  getProfileName() {
    if (this.profileName == null) {
      let identity = this.didService.getActiveDid();
      if (identity) {
        // Happens when importing a new mnemonic over an existing one
        this.profile = this.profileService.getBasicProfile();

      }
      this.profileName = this.profile.getName();
    }
    return this.profileName;
  }

  /******************** Reveal QR Code ********************/
  async showQRCode() {
    const modal = await this.modalCtrl.create({
      component: ShowQRCodeComponent,
      componentProps: {
        didString: this.profileService.didString,
        qrCodeString: await this.profileService.getAddFriendShareableUrl(),
      },
      cssClass: !this.theme.darkMode ? "qrcode-modal" : "dark-qrcode-modal",
    });
    void modal.onDidDismiss().then((params) => { });
    await modal.present();
  }

  /**
   * Publish an updated DID document locally and to the DID sidechain, according to user's choices
   * for each profile item (+ the DID itself).
   */
  publishVisibilityChanges() {
    void this.profileService.showWarning("publishVisibility", null);
  }

  getLastPublished() {

  }

  /******************** Display Helpers  ********************/
  getCredentialKey(entry: CredentialDisplayEntry): string {
    let fragment = entry.credential.getFragment();
    return fragment;
  }

  getChainSyncStatusMessage(entry: CredentialDisplayEntry): string {
    if (!this.currentOnChainDIDDocument) return "";

    let fragment = entry.credential.getFragment();

    let localValue = entry.credential.getSubject()[fragment];
    let chainValue = this.currentOnChainDIDDocument.getCredentialById(
      new DIDURL("#" + fragment)
    );

    if (!chainValue)
      return "This credential is not published on the blockchain";

    chainValue = chainValue.getSubject()[fragment];

    return localValue != chainValue
      ? "This credential is different than the one on the blockchain"
      : "";
  }

  getCredentialVerified(entry: CredentialDisplayEntry) {

    let fragment = entry.credential.getFragment();
    let localValue = entry.credential.getSubject()[fragment];

    let claimsObject = {
      id: this.profileService.didString
    }

    claimsObject[fragment] = localValue

    Logger.log("identity", "Claims object: ")
    Logger.log("identity", claimsObject)

    void this.globalIntentService.sendIntent("https://did.elastos.net/credverify", {
      claims: claimsObject
    });
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

  getDisplayableEntryValue(value: any) {
    if (value instanceof Object) {
      return JSON.stringify(value);
    }
    return value;
  }

  /******************** Display Data Sync Status between Local and Onchain ********************/
  getLocalCredByProperty(entry: CredentialDisplayEntry, property: string): string {
    const credHasProp = (property in entry.credential.getSubject());
    if (credHasProp)
      return entry.credential.getSubject()[property];

    return null;
  }

  getOnChainCredByProperty(property: string): string {
    const chainValue = this.currentOnChainDIDDocument.getCredentials().filter(c => {
      if (property in c.getSubject()) {
        return c;
      }
    });

    return chainValue.length ? chainValue[0].getSubject()[property] : null;
  }

  isLocalCredSyncOnChain(entry: CredentialDisplayEntry): boolean {
    if (!this.currentOnChainDIDDocument) return false;

    let fragment = entry.credential.getFragment();

    let localValue = entry.credential.getSubject()[fragment];
    let chainValue = this.currentOnChainDIDDocument.getCredentialById(new DIDURL("#" + fragment));

    /* if (!localValue) { //handling capsules credential

      let chainValue2 = '';
      localValue = this.getLocalCredByProperty(entry, 'apppackage');
      if (localValue) {
        chainValue2 = this.getOnChainCredByProperty('apppackage');

        return localValue === chainValue2;
      }
    } */

    if (!chainValue)
      return false;

    chainValue = chainValue.getSubject()[fragment];

    if (typeof localValue === 'object' || typeof chainValue === 'object') { //avatar
      return JSON.stringify(localValue) === JSON.stringify(chainValue);
    }

    return localValue === chainValue;
  }

  isAvatarData(entry): boolean {
    if (entry.credentialId === "avatar") {
      return true;
    } else {
      return false;
    }
  }

  // Not in use
  isAvatarCred(entry: CredentialDisplayEntry): boolean {
    let fragment = entry.credential.getFragment();
    if (fragment === "avatar") {
      return true;
    } else {
      return false;
    }
  }

  hasIssuer(issuerId: string): boolean {
    return this.profileService.hasIssuer(issuerId);
  }

  hasAvatarIssuer(issuerId: string): boolean {
    if (!this.profileService.hasIssuer(issuerId)) return false;
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.avatar !== null && issuer.avatar !== "";
  }

  getIssuerAvatar(issuerId: string): string {
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.avatar;
  }

  getIssuerName(issuerId: string): string {
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.name;
  }

  getIssuerDID(issuerId: string): string {
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.did;
  }

  exportMnemonic() {
    return this.globalNav.navigateTo("identitybackup", "/identity/backupdid");
  }
}
