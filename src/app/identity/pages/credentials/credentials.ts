import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ActionSheetController, ModalController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { ShowQRCodeComponent } from "../../components/showqrcode/showqrcode.component";
import { Profile } from "../../model/profile.model";
import { DIDURL } from "../../model/didurl.model";
import { DIDPublicationStatusEvent } from "../../model/eventtypes.model";
import { UXService } from "../../services/ux.service";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { HiveService } from "../../services/hive.service";
import { HttpClient } from "@angular/common/http";
import { Native } from "../../services/native";
import { DID } from "../../model/did.model";
import { DIDDocument } from "../../model/diddocument.model";
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { Events } from "../../services/events.service";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { ProfileService } from "../../services/profile.service";
import { Logger } from "src/app/logger";

type ProfileDisplayEntry = {
  credentialId: string; // related credential id
  label: string; // "title" to display
  value: string; // value to display
  willingToBePubliclyVisible?: boolean; // Whether it's currently set to become published or not.
};

type IssuerDisplayEntry = {
  did: string;
  name: string;
  avatar: string;
};

type CredentialDisplayEntry = {
  credential: DIDPlugin.VerifiableCredential;
  issuer: string;
  willingToBePubliclyVisible: boolean;
  willingToDelete: boolean;
  canDelete: boolean;
};

@Component({
  selector: "credentials-profile",
  templateUrl: "credentials.html",
  styleUrls: ["credentials.scss"],
})
export class CredentialsPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public profile: Profile;

  public credentials: VerifiableCredential[];
  private publishedCredentials: DIDPlugin.VerifiableCredential[];
  public hasCredential: boolean = false;
  public creatingIdentity: boolean = false;

  public fetchingApps = false;

  public segment: string = "all";

  public currentOnChainDIDDocument: DIDDocument = null;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private promptpublishdidSubscription: Subscription = null;

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
    private native: Native,
    public theme: GlobalThemeService,
    public hiveService: HiveService,
    public actionSheetController: ActionSheetController,
    public profileService: ProfileService,
    private basicCredentialService: BasicCredentialsService
  ) {
    this.init();
  }

  ngOnInit() {
    this.didchangedSubscription = this.events.subscribe("did:didchanged", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.publicationstatusSubscription = this.events.subscribe(
      "did:publicationstatus",
      (status: DIDPublicationStatusEvent) => {
        let activeDid = this.didService.getActiveDid();
        if (activeDid && activeDid === status.did)
          this.profileService.didNeedsToBePublished = status.shouldPublish;
      }
    );

    this.documentChangedSubscription = this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {

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
        this.profileService.showWarning("publishIdentity", null);
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

  init(publishAvatar?: boolean) {
    this.publishedCredentials = this.profileService.getPublishedCredentials();

    let identity = this.didService.getActiveDid();
    if (identity) {
      // Happens when importing a new mnemonic over an existing one
      this.profile = identity.getBasicProfile();
      Logger.log("identity", 
        "Credentials Page is using this profile:",
        JSON.stringify(this.profile)
      );

      this.credentials = identity.credentials;
      this.hasCredential = this.credentials.length > 0 ? true : false;
      Logger.log("identity", "Has credentials?", this.hasCredential);
      Logger.log("identity", "Credentials", JSON.stringify(this.credentials));

      // Sort credentials by title
      this.credentials.sort((c1, c2) => {
        if (
          c1.pluginVerifiableCredential.getFragment() >
          c2.pluginVerifiableCredential.getFragment()
        )
          return 1;
        else return -1;
      });

      this.checkDidForPublish(identity);
      this.buildDetailEntries();
      //this.buildCredentialEntries(publishAvatar);


    }
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();

    this.init();

  }

  async checkDidForPublish(identity: DID) {
    this.profileService.didNeedsToBePublished = await this.didSyncService.checkIfDIDDocumentNeedsToBePublished(
      identity
    );
    this.profileService.setPublishStatus(true);
  }

  isPublished(credential: DIDPlugin.VerifiableCredential) {
    let foundCred = this.publishedCredentials.find(x => {
      return x.getId() == credential.getId();
    });

    if (foundCred == null) {
      return false;
    } else {
      let published = JSON.stringify(foundCred.getSubject());
      let local = JSON.stringify(credential.getSubject());
      if (local != published) {
        return false;
      }
    }
    return true;
  }

  // isCredSyncOnChain(credential: DIDPlugin.VerifiableCredential): boolean {

  //   const howLong = this.timer();
  //   // do some stuff

  //   if (this.currentOnChainDIDDocument === null) {

  //     Logger.log("identity", "1: " + Logger.log("identity", howLong.ms));
  //     return false;

  //   }

  //   let fragment = credential.getFragment();
  //   let localValue = credential.getSubject()[fragment];

  //   let chainValue = this.currentOnChainDIDDocument.getCredentialById(new DIDURL("#" + fragment));
  //   if (!chainValue) {
  //     Logger.log("identity", "2: " + Logger.log("identity", howLong.ms));
  //     return false;
  //   }

  //   if (!localValue) {
  //     Logger.log("identity", "3: " + Logger.log("identity", howLong.ms));
  //     //handling capsules credential
  //     localValue = this.getLocalCredByProperty(credential, "apppackage");
  //     if (localValue) {
  //       let apppackage = chainValue.getSubject().apppackage;

  //       return localValue === apppackage;
  //       Logger.log("identity", "4: " + Logger.log("identity", howLong.ms));
  //     }
  //     else {
  //       // handle external credentials
  //       return true;
  //     }
  //   }

  //   chainValue = chainValue.getSubject()[fragment];

  //   if (typeof localValue === "object" || typeof chainValue === "object") {
  //     //avatar
  //     Logger.log("identity", "5: " + Logger.log("identity", howLong.ms));
  //     return JSON.stringify(localValue) === JSON.stringify(chainValue);
  //   }


  //   return localValue === chainValue;
  // }

  getLocalCredByProperty(credential: DIDPlugin.VerifiableCredential, property: string): string {
    const credHasProp = credential
      .getSubject()
      .hasOwnProperty(property);

    if (credHasProp)
      return credential.getSubject()[property];

    return null;
  }

  /**
   * Convenience conversion to display profile data on UI.
   */
  buildDetailEntries() {
    let notSetTranslated = this.translate.instant("not-set");

    // Initialize
    this.profileService.visibleData = [];
    this.profileService.invisibleData = [];

    let profileEntries = this.profile.entries;
    for (let entry of profileEntries) {
      this.pushDisplayEntry(entry.key, {
        credentialId: entry.key,
        label: this.translate.instant("credential-info-type-" + entry.key),
        value: entry.toDisplayString() || notSetTranslated,
      });
    }
  }

  pushDisplayEntry(profileKey: string, entry: ProfileDisplayEntry) {
    if (this.profileEntryIsVisibleOnChain(profileKey)) {
      entry.willingToBePubliclyVisible = true;
      this.profileService.visibleData.push(entry);
    } else {
      entry.willingToBePubliclyVisible = profileKey === "name" ? true : false;
      this.profileService.invisibleData.push(entry);
    }

    // Logger.log("identity", "Invisible data", this.profileService.invisibleData);
    // Logger.log("identity", "Visible data", this.profileService.visibleData);
  }


  /**
   * Tells if a given profile key is currently visible on chain or not (inside the DID document or not).
   *
   * @param profileKey Credential key.
   */
  profileEntryIsVisibleOnChain(profileKey: string): boolean {
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();
    if (!currentDidDocument) return false;

    let credential = currentDidDocument.getCredentialById(
      new DIDURL("#" + profileKey)
    );
    return credential != null;
  }



  /***** Find and build app and avatar creds *****/
  buildAppAndAvatarCreds(publishAvatar?: boolean) {
    this.profileService.appCreds = [];
    let hasAvatar: boolean = false;

    this.profileService.visibleCredentials.map((cred) => {
      // Find App Credentials
      if (cred.credential.getSubject().hasOwnProperty("apppackage")) {
        this.profileService.appCreds.push({
          credential: cred.credential,
          willingToBePubliclyVisible: cred.willingToBePubliclyVisible,
          willingToDelete: cred.willingToDelete,
          canDelete: cred.canDelete,
          appInfo: {
            packageId: null,
            app: null,
            action: null,
          },
        });
      }
      // Find Avatar Credential
      if (cred.credential.getSubject().hasOwnProperty("avatar")) {
        hasAvatar = true;
        this.hiveService.rawImage =
          "data:image/png;base64," + cred.credential.getSubject().avatar.data;
        Logger.log("identity", "Profile has avatar", this.hiveService.rawImage);

        if (publishAvatar) {
          Logger.log("identity", "Prompting avatar publish");
          cred.willingToBePubliclyVisible = true;
          this.profileService.showWarning("publishVisibility", null);
        }
      }
      // Find Description Credential
      if (cred.credential.getSubject().hasOwnProperty("description")) {
        this.profileService.displayedBio = cred.credential.getSubject().description;
        Logger.log("identity", "Profile has bio", this.profileService.displayedBio);
      }
    });
    this.profileService.invisibleCredentials.map((cred) => {
      // Find App Credentials
      if (cred.credential.getSubject().hasOwnProperty("apppackage")) {
        this.profileService.appCreds.push({
          credential: cred.credential,
          willingToBePubliclyVisible: cred.willingToBePubliclyVisible,
          willingToDelete: cred.willingToDelete,
          canDelete: cred.canDelete,
          appInfo: {
            packageId: null,
            app: null,
            action: null,
          },
        });
      }
      // Find App Credentials
      if (cred.credential.getSubject().hasOwnProperty("avatar")) {
        hasAvatar = true;
        // this.hiveService.rawImage =
        //   "data:image/png;base64," + cred.credential.getSubject().avatar.data;
        Logger.log("identity", "Profile has avatar", this.hiveService.rawImage);

        if (publishAvatar) {
          Logger.log("identity", "Prompting avatar publish");
          cred.willingToBePubliclyVisible = true;
          this.profileService.showWarning("publishVisibility", null);
        }
      }
      // Find Description Credentials
      if (cred.credential.getSubject().hasOwnProperty("description")) {
        this.profileService.displayedBio = cred.credential.getSubject().description;
        Logger.log("identity", "Profile has bio", this.profileService.displayedBio);
      }
    });

    Logger.log("identity", "App creds", this.profileService.appCreds);
    if (this.profileService.appCreds.length > 0) {
      this.buildDisplayableAppsInfo();
    }

    if (!hasAvatar) {
      this.hiveService.rawImage = null;
    }
  }

  private async buildDisplayableAppsInfo() {
    let fetchCount = this.profileService.appCreds.length;
    this.fetchingApps = true;
    this.profileService.appCreds.forEach((cred) => {
      this.http
        .get<any>(
          "https://dapp-store.elastos.org/apps/" +
          cred.credential.getSubject().apppackage +
          "/manifest"
        )
        .subscribe(
          (manifest: any) => {
            Logger.log("identity", "Got app!", manifest);
            this.zone.run(async () => {
              cred.appInfo = {
                packageId: cred.credential.getSubject().apppackage,
                app: manifest,
                action: cred.credential.getSubject().action
                  ? cred.credential.getSubject().actionappInfo
                  : manifest.short_description,
              };

              fetchCount--;
              if (fetchCount == 0) this.fetchingApps = false;
            });
          },
          (err) => {
            Logger.log("identity", "HTTP ERROR " + JSON.stringify(err));
            this.zone.run(async () => {
              cred.appInfo = {
                packageId: cred.credential.getSubject().apppackage,
                app: null,
                action: cred.credential.getSubject().action
                  ? cred.credential.getSubject().action
                  : null,
              };

              fetchCount--;
              if (fetchCount == 0) this.fetchingApps = false;
            });
          }
        );
    });

    Logger.log("identity", "App infos", this.profileService.appCreds);
  }

  getAppIcon(appId: string) {
    return "https://dapp-store.elastos.org/apps/" + appId + "/icon";
  }



  /**
   * Tells if a given credential is currently visible on chain or not (inside the DID document or not).
   */
  credentialIsVisibleOnChain(credential: VerifiableCredential) {
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();
    if (!currentDidDocument) return false;

    let didDocumentCredential = currentDidDocument.getCredentialById(
      new DIDURL(credential.pluginVerifiableCredential.getId())
    );
    return didDocumentCredential != null;
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
      cssClass: !this.theme.darkMode ? "qrcode-modal" : "dark-qrcode-modal",
    });
    modal.onDidDismiss().then((params) => { });
    modal.present();
  }



  /**
   * Publish an updated DID document locally and to the DID sidechain, according to user's choices
   * for each profile item (+ the DID itself).
   */
  publishVisibilityChanges() {
    this.profileService.showWarning("publishVisibility", null);
  }

  /********** Prompt warning before deleting if creds are selected **********/
  deleteSelectedCredentials() {
    let selectedCreds: number = 0;
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
      this.profileService.showWarning("delete", null);
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
    let translationKey = "credential-info-type-" + fragment;
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
              : this.translate.instant("not-set"),
        };
      });
  }

  getDisplayableEntryValue(value: any) {
    if (value instanceof Object) {
      return JSON.stringify(value);
    }
    return value;
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

  avatarImg = "";

  getAvatar(entry: CredentialDisplayEntry): string {
    if (this.avatarImg == "") {
      let subject = entry.credential.getSubject();
      let avatar = subject["avatar"];
      this.avatarImg = `data:${avatar["content-type"]};${avatar["type"]},${avatar["data"]}`;
    }
    return this.avatarImg;
  }

  getCredIconSrc(entry: CredentialDisplayEntry): string {
    let fragment = entry.credential.getFragment();

    if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
      fragment = "finger-print";
    }

    let skin = this.theme.darkMode ? "dark" : "light";
    return `/assets/identity/smallIcons/dark/${fragment}.svg`;
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
    return this.hasAvatarIssuer(issuerId) ? issuer.avatar : this.getSmallIcon("name");
  }

  getSmallIcon(iconName: string) {
    return this.theme.darkMode ? `/assets/identity/smallIcons/dark/${iconName}.svg` : `/assets/identity/smallIcons/light/${iconName}.svg`
  }

  getIssuerName(issuerId: string): string {
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.name;
  }

  hasIssuerName(issuerId: string): boolean {
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.name !== null && issuer.name !== "";
  }

  getIssuerDID(issuerId: string): string {
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.did;
  }


  credentialsListChanged(ev: any) {
    this.segment = ev.detail.value;
  }

  get filteredCredentials(): CredentialDisplayEntry[] {

    if (this.segment == "all") return this.profileService.allCreds;
    if (this.segment == "hidden") return this.profileService.invisibleCredentials;
    if (this.segment == "visible") return this.profileService.visibleCredentials;



    return this.profileService.allCreds.filter((item) => {
      let types = item.credential.getTypes();
      let isVerified = !types.includes("SelfProclaimedCredential");

      if (this.segment == "verified" && isVerified) return true;
      if (this.segment == "unverified" && !isVerified) return true;

      return false;
    });
  }

  isVerified(entry: CredentialDisplayEntry) {
    let types = entry.credential.getTypes();
    return !types.includes("SelfProclaimedCredential");
  }

  openCredential(entry: CredentialDisplayEntry) {
    this.native.go("/identity/credentialdetails", {
      credentialId: entry.credential.getId(),
    });
  }
}
