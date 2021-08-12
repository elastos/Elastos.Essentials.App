import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ModalController, ActionSheetController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { ShowQRCodeComponent } from "../../components/showqrcode/showqrcode.component";
import { Profile } from "../../model/profile.model";
import { DIDURL } from "../../model/didurl.model";
import { UXService } from "../../services/ux.service";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { HttpClient } from "@angular/common/http";
import { Native } from "../../services/native";
import { DID } from "../../model/did.model";
import { DIDDocument } from "../../model/diddocument.model";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { Logger } from "src/app/logger";
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Events } from "src/app/services/events.service";
import { CredentialDisplayEntry } from "../../model/credentialdisplayentry.model";

@Component({
  selector: "page-profile",
  templateUrl: "profile.html",
  styleUrls: ["profile.scss"],
})
export class ProfilePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public profile: Profile;

  public credentials: VerifiableCredential[];

  public hasCredential = false;
  public creatingIdentity = false;
  public slideOpts: any;
  public avatarDataUrl: string = null;

  public fetchingApps = false;
  public foundApps = false;
  public currentOnChainDIDDocument: DIDDocument = null;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private promptpublishdidSubscription: Subscription = null;

  private hiveVault: DIDPlugin.Service = null;
  public hiveIsloaded = false;

  constructor(
    private http: HttpClient,
    public events: Events,
    public route: ActivatedRoute,
    public zone: NgZone,
    private translate: TranslateService,
    private didService: DIDService,
    private didSyncService: DIDSyncService,
    private modalCtrl: ModalController,
    private uxService: UXService,
    public native: Native,
    public theme: GlobalThemeService,
    public profileService: ProfileService,
    public actionSheetController: ActionSheetController,
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
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.promptpublishdidSubscription);
  }

  initHive() {
    if (!this.profileService.publishedDIDDocument) {
        // did is not published.
        Logger.log("identity", 'profile initHive : did is not published.')
        return;
    }
    var services = this.profileService.publishedDIDDocument.getServices();

    this.hiveVault = services.find(x => {
      return x.getType() == "HiveVault"
    });
    this.hiveIsloaded = true;
  }

  init(publishAvatar?: boolean) {
    this.initHive();
    let identity = this.didService.getActiveDid();
    if (identity) {
      // Happens when importing a new mnemonic over an existing one
      this.profile = this.profileService.getBasicProfile();
      Logger.log("identity",
        "ProfilePage is using this profile:",
        JSON.stringify(this.profile)
      );

      this.credentials = identity.credentials;
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

      //this.buildDetailEntries();
      //this.buildCredentialEntries(publishAvatar);

      this.slideOpts = {
        slidesPerView: 4,
        speed: 400,
      };

      this.profileService.getAvatarDataUrl().subscribe(dataUrl => {
        this.avatarDataUrl = dataUrl;
      });
    }
  }

  ionViewWillEnter() {
    this.buildAppAndAvatarCreds(false);
    this.titleBar.setTitle(this.translate.instant("identity.my-identity"));
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();
  }

  /***** Find and build app and avatar creds *****/
  buildAppAndAvatarCreds(publishAvatar?: boolean) {
    //this.profileService.appCreds = [];
    let hasAvatar = false;

    this.profileService.visibleCredentials.map((cred) => {
      // Find Avatar Credential
      if ("avatar" in cred.credential.getSubject()) {
        hasAvatar = true;
      }
      // Find Description Credential
      if ("description" in cred.credential.getSubject()) {
        this.profileService.displayedBio = cred.credential.getSubject().description;
        Logger.log("identity", "Profile has bio", this.profileService.displayedBio);
      }
    });
    this.profileService.invisibleCredentials.map((cred) => {
      // Find App Credentials
      if ("avatar" in cred.credential.getSubject()) {
        hasAvatar = true;
      }
      // Find Description Credentials
      if ("description" in cred.credential.getSubject()) {
        this.profileService.displayedBio = cred.credential.getSubject().description;
        Logger.log("identity", "Profile has bio", this.profileService.displayedBio);
      }
    });
  }

  /**
   * The name credential can not be deleted.
   */
  credentialIsCanDelete(credential: VerifiableCredential) {
    let fragment = credential.pluginVerifiableCredential.getFragment();
    if (fragment === "name") return false;
    else return true;
  }

  /******************** Reveal QR Code ********************/
  async showQRCode() {
    const modal = await this.modalCtrl.create({
      component: ShowQRCodeComponent,
      componentProps: {
        didString: this.profileService.didString,
        qrCodeString: await this.profileService.getAddFriendShareableUrl(),
      },
      cssClass: !this.theme.darkMode ? "identity-showqrcode-component" : 'identity-showqrcode-component-dark',
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

  /********** Prompt warning before deleting if creds are selected **********/
  deleteSelectedCredentials() {
    let selectedCreds = 0;
    this.profileService.invisibleCredentials.map((cred) => {
      if (cred.willingToDelete) {
        selectedCreds++;
      }
    });
    this.profileService.visibleCredentials.map((cred) => {
      if (cred.willingToDelete) {
        selectedCreds++;
      }
    });

    if (selectedCreds > 0) {
      void this.profileService.showWarning("delete", null);
    } else {
      this.native.toast("You did not select any credentials to delete", 2000);
    }
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

  getCredentialValue(credential: DIDPlugin.VerifiableCredential) {
    return this.displayableProperties(credential)[0].value;
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



  getCredIconSrc(entry: CredentialDisplayEntry): string {
    let fragment = entry.credential.getFragment();
    let skin = this.theme.darkMode ? "dark" : "light";
    switch (fragment) {
      case "avatar":
        return "image";
      default:
        return `/assets/identity/smallIcons/${skin}/${fragment}.svg`;
    }
  }

  getCredIcon(entry: CredentialDisplayEntry): string {
    let fragment = entry.credential.getFragment();
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
      case "nation":
        return "flag";
      case "gender":
        return "transgender";
      case "telephone":
        return "call";
      case "name":
        return "person";
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
  getIssuerIdFromVerifiableCredential(
    vc: DIDPlugin.VerifiableCredential
  ): string {
    if (vc === null) return null;

    let id = vc.getIssuer();
    if (id === undefined) return null;

    return id;
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
}
