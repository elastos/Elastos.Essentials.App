import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  ModalController,
  PopoverController,
  ActionSheetController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { ShowQRCodeComponent } from "../../components/showqrcode/showqrcode.component";
import { Profile } from "../../model/profile.model";
import { DIDURL } from "../../model/didurl.model";
import { DIDPublicationStatusEvent } from "../../model/eventtypes.model";
import { UXService } from "../../services/ux.service";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { HiveService } from "../../services/hive.service";
import { HttpClient } from "@angular/common/http";
import { Native } from "../../services/native";
import { DID } from "../../model/did.model";
import { DIDDocument } from "../../model/diddocument.model";
import { AuthService } from "../../services/auth.service";
import { Events } from "../../services/events.service";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { ThemeService } from "src/app/didsessions/services/theme.service";
import { TemporaryAppManagerPlugin } from "src/app/TMP_STUBS";

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
  selector: "page-myprofile",
  templateUrl: "myprofile.html",
  styleUrls: ["myprofile.scss"],
})
export class MyProfilePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public profile: Profile;

  public profileName: string = null;
  public credentials: VerifiableCredential[];
  public hasCredential: boolean = false;
  public creatingIdentity: boolean = false;
  public hasModifiedCredentials: boolean = false;
  public unchangedPublishedCredentials: DIDPlugin.VerifiableCredential[] = [];

  public fetchingApps = false;

  public currentOnChainDIDDocument: DIDDocument = null;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private documentFetchedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private promptpublishdidSubscription: Subscription = null;
  private modifiedCredentialsSubscription: Subscription = null;

  constructor(
    private http: HttpClient,
    public events: Events,
    public route: ActivatedRoute,
    public zone: NgZone,
    private translate: TranslateService,
    private authService: AuthService,
    private didService: DIDService,
    private didSyncService: DIDSyncService,
    private modalCtrl: ModalController,
    private uxService: UXService,
    private native: Native,
    public theme: ThemeService,
    public hiveService: HiveService,
    public profileService: ProfileService,
    public actionSheetController: ActionSheetController,
    private appManager: TemporaryAppManagerPlugin
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
      console.log("Publish avatar?", publishAvatar);
      // When the did document content changes, we rebuild our profile entries on screen.
      this.init(publishAvatar);
    });

    // When the personal DID document finished being fetched from chain
    this.documentFetchedSubscription = this.events.subscribe("diddocument:fetched", () => {
      this.zone.run(() => {
        // Compare local credentials with the ones in the document.
        console.log("DID Document fetch completed, comparing local credentials with document ones");
        this.unchangedPublishedCredentials = this.profileService.getUnchangedPublishedCredentials();
        this.hasModifiedCredentials = this.profileService.hasModifiedCredentials();
      });
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

    this.modifiedCredentialsSubscription = this.events.subscribe("credentials:modified", () => {
      this.zone.run(() => {
        console.log("Credentials have been modified, comparing local credentials with document ones");
        this.unchangedPublishedCredentials = this.profileService.getUnchangedPublishedCredentials();
        this.hasModifiedCredentials = this.profileService.hasModifiedCredentials();
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
    this.unsubscribe(this.documentFetchedSubscription);
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.promptpublishdidSubscription);
    this.unsubscribe(this.modifiedCredentialsSubscription);
  }

  init(publishAvatar?: boolean) {
    let identity = this.didService.getActiveDid();
    if (identity) {
      // Happens when importing a new mnemonic over an existing one
      this.profile = identity.getBasicProfile();


      this.profileName = this.profile.getName();
      this.credentials = identity.credentials;
      this.hasCredential = this.credentials.length > 0 ? true : false;
      console.log("Has credentials?", this.hasCredential);
      console.log("Credentials", JSON.stringify(this.credentials));

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
      this.buildCredentialEntries(publishAvatar);
    }
  }

  ionViewWillEnter() {
    console.log("ionWillEnter");
    this.buildCredentialEntries();

    this.unchangedPublishedCredentials = this.profileService.getUnchangedPublishedCredentials();
    this.hasModifiedCredentials = this.profileService.hasModifiedCredentials();

    this.profileService.didString = this.didService
      .getActiveDid()
      .getDIDString();
    this.didSyncService
      .getDIDDocumentFromDID(this.profileService.didString)
      .then((didDoc) => {
        this.currentOnChainDIDDocument = didDoc;
        if (this.currentOnChainDIDDocument) {
          console.log("diddocument" + this.currentOnChainDIDDocument.pluginDidDocument.toJson());
        } else {
          console.log("diddocument is not published.");
        }
      });
  }

  ionViewDidEnter() {
    console.log("ionDidEnter");
    console.log("Dark theme : ", this.theme.darkMode);
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();

    console.log(
      "MyProfilePage ionViewDidEnter did: " + this.profileService.didString
    );
  }

  async checkDidForPublish(identity: DID) {
    this.profileService.didNeedsToBePublished = await this.didSyncService.checkIfDIDDocumentNeedsToBePublished(
      identity
    );
    this.profileService.setPublishStatus(true);
    console.log(
      "DID needs publishing?",
      this.profileService.didNeedsToBePublished
    );
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

    console.log("Invisible data", this.profileService.invisibleData);
    console.log("Visible data", this.profileService.visibleData);
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

  /**
   * Convenience conversion to display credential data on UI.
   */
  buildCredentialEntries(publishAvatar?: boolean) {
    // Initialize
    //this.profileService.visibleCred = [];
    //this.profileService.invisibleCred = [];
    this.profileService.cleanCredentials();
    // DID issuers found on credentials
    let issuersId: string[] = [];

    for (let c of this.credentials) {
      let canDelete = this.credentialIsCanDelete(c);

      let issuerId = this.getIssuerIdFromVerifiableCredential(
        c.pluginVerifiableCredential
      );
      if (issuerId !== null) issuersId.push(issuerId);

      if (this.credentialIsVisibleOnChain(c)) {
        this.profileService.pushCredentials({
          credential: c.pluginVerifiableCredential,
          issuer: issuerId,
          isVisible: true,
          willingToBePubliclyVisible: true,
          willingToDelete: false,
          canDelete: canDelete,
        });
      } else {
        this.profileService.pushCredentials({
          credential: c.pluginVerifiableCredential,
          issuer: issuerId,
          willingToBePubliclyVisible:
            c.pluginVerifiableCredential.getFragment() === "name"
              ? true
              : false,
          isVisible: false,
          willingToDelete: false,
          canDelete: canDelete,
        });
      }
    }

    if (issuersId.length > 0) {
      this.zone.run(async () => {
        await this.profileService.loadIssuers(issuersId);
      });
    }

    console.log("Visible creds", this.profileService.visibleCredentials);
    console.log("Invisible creds", this.profileService.invisibleCredentials);
    this.buildAppAndAvatarCreds(publishAvatar);
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

        // TODO: avatar is null
        this.hiveService.rawImage =
          "data:image/png;base64," + cred.credential.getSubject().avatar.data;
        console.log("Profile has avatar", this.hiveService.rawImage);

        if (publishAvatar) {
          console.log("Prompting avatar publish");
          cred.willingToBePubliclyVisible = true;
          this.profileService.showWarning("publishVisibility", null);
        }
      }
      // Find Description Credential
      if (cred.credential.getSubject().hasOwnProperty("description")) {
        this.profileService.displayedBio = cred.credential.getSubject().description;
        console.log("Profile has bio", this.profileService.displayedBio);
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
        let data = "";
        if (cred.credential.getSubject().avatar != null) {
          data = cred.credential.getSubject().avatar.data;
          this.hiveService.rawImage =
            "data:image/png;base64," + data;
        }


        if (publishAvatar) {
          console.log("Prompting avatar publish");
          cred.willingToBePubliclyVisible = true;
          this.profileService.showWarning("publishVisibility", null);
        }
      }
      // Find Description Credentials
      if (cred.credential.getSubject().hasOwnProperty("description")) {
        this.profileService.displayedBio = cred.credential.getSubject().description;
        console.log("Profile has bio", this.profileService.displayedBio);
      }
    });

    console.log("App creds", this.profileService.appCreds);
    if (this.profileService.appCreds.length > 0) {

    }

    if (!hasAvatar) {
      this.hiveService.rawImage = null;
    }
  }


  getAppIcon(appId: string) {
    return "https://dapp-store.elastos.org/apps/" + appId + "/icon";
  }

  /**********************************************
   Update app's visibility's selection for both
   'credentials' and 'capsules' tab
  ***********************************************/
  updateAppVisibility(event: any, entry: any) {
    if (this.profileService.capsulesActive) {
      // Update app credential's visibility under 'credentials' if its visibility was changed under 'capsules'
      this.profileService.visibleCredentials.map((cred) => {
        if (cred.credential === entry.credential) {
          console.log(
            'Updating app cred\'s visibility selection under "credentials" tab'
          );
          cred.willingToBePubliclyVisible = entry.willingToBePubliclyVisible;
        }
      });
      this.profileService.invisibleCredentials.map((cred) => {
        if (cred.credential === entry.credential) {
          console.log(
            'Updating app cred\'s visibility selection under "credentials" tab'
          );
          cred.willingToBePubliclyVisible = entry.willingToBePubliclyVisible;
        }
      });
    } else {
      // Update app credential's visibility under 'capsules' if its visibility was changed under 'credentials'
      this.profileService.appCreds.map((cred) => {
        if (cred.credential === entry.credential) {
          console.log(
            'Updating app cred\'s visibility selection under "capsules" tab'
          );
          cred.willingToBePubliclyVisible = entry.willingToBePubliclyVisible;
        }
      });
    }
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

    console.log("Claims object: ")
    console.log(claimsObject)

    this.appManager.sendIntent("https://did.elastos.net/credverify", {
      claims: claimsObject
    }, {}, (res: any) => {
      console.log("User data received", res);
    });
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

  /******************** Display Data Sync Status between Local and Onchain ********************/
  getLocalCredByProperty(entry: CredentialDisplayEntry, property: string): string {
    const credHasProp = entry.credential.getSubject().hasOwnProperty(property);

    if (credHasProp)
      return entry.credential.getSubject()[property];

    return null;
  }

  getOnChainCredByProperty(property: string): string {
    const chainValue = this.currentOnChainDIDDocument.getCredentials().filter(c => {
      if (c.getSubject().hasOwnProperty(property)) {
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

    if (!localValue) { //handling capsules credential

      let chainValue2 = '';
      localValue = this.getLocalCredByProperty(entry, 'apppackage');
      if (localValue) {
        chainValue2 = this.getOnChainCredByProperty('apppackage');

        return localValue === chainValue2;
      }
    }

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

  async exportMnemonic() {
    await this.authService.checkPasswordThenExecute(
      async () => {
        let mnemonics = await this.didService.activeDidStore.exportMnemonic(
          AuthService.instance.getCurrentUserPassword()
        );
        console.log("Mnemonics", mnemonics);
        this.native.go("exportmnemonic", { mnemonics: mnemonics });
      },
      () => {
        // Operation cancelled
        console.log("Password operation cancelled");
      },
      true,
      true
    );
  }
}
