import { Injectable } from "@angular/core";
import { Native } from "./native";
import { PopoverController } from "@ionic/angular";
import { AuthService } from "./auth.service";
import { DIDSyncService } from "./didsync.service";
import { DIDService } from "./did.service";
import { TranslateService } from "@ngx-translate/core";
import { WarningComponent } from "../components/warning/warning.component";
import { DIDDocument } from "../model/diddocument.model";
import { DIDURL } from "../model/didurl.model";
import { BasicCredentialsService } from './basiccredentials.service';
import { Profile } from "../model/profile.model";
import { ContactNotifierService } from "src/app/services/contactnotifier.service";
import { Logger } from "src/app/logger";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { Events } from "src/app/services/events.service";
import { VerifiableCredential } from "../model/verifiablecredential.model";
import { AvatarCredentialSubject } from "../model/avatarcredentialsubject";
import { GlobalHiveCacheService } from "src/app/services/global.hivecache.service";
import { BehaviorSubject, Subscription } from "rxjs";
import { GlobalHiveService, VaultLinkStatusCheckState } from "src/app/services/global.hive.service";
import { DIDEvents } from "./events";

// eslint-disable-next-line @typescript-eslint/no-var-requires
var deepEqual = require('deep-equal');

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
  isVisible: boolean;
  willingToBePubliclyVisible: boolean;
  willingToDelete: boolean;
  canDelete: boolean;
};

type AppCredentialDisplayEntry = {
  credential: DIDPlugin.VerifiableCredential;
  willingToBePubliclyVisible: boolean;
  willingToDelete: boolean;
  canDelete: boolean;
  appInfo: {
    packageId: string;
    app: any;
    action: string;
  };
};

@Injectable({
  providedIn: "root",
})
export class ProfileService {
  public static instance: ProfileService = null;

  public didString = "";

  // Profile Data
  public visibleData: ProfileDisplayEntry[];
  public invisibleData: ProfileDisplayEntry[];

  // Profile Credentials
  // private visibleCred: CredentialDisplayEntry[];
  // private invisibleCred: CredentialDisplayEntry[];
  public appCreds: AppCredentialDisplayEntry[];
  private credentials: CredentialDisplayEntry[] = [];

  public issuers: {
    [issuerDid: string]: IssuerDisplayEntry;
  } = {};

  // Display data
  public displayedBio: string = null;

  // Display checkbox
  public editingVisibility = false;
  public deleteMode = false;

  // Display profile list
  public detailsActive = true;
  public credsActive = false;
  public capsulesActive = false;

  public publishedDIDDocument: DIDDocument = null;

  // Publish status
  public didNeedsToBePublished = false;
  private publishStatusFetched = false;

  // Store contollers
  public popover: any = null; // Store generic popover
  //public options: any = null; // Store options popover

  constructor(
    public events: Events,
    private native: Native,
    private popoverCtrl: PopoverController,
    private didService: DIDService,
    private didSyncService: DIDSyncService,
    private translate: TranslateService,
    private basicCredentialService: BasicCredentialsService,
    private globalIntentService: GlobalIntentService,
    private contactNotifier: ContactNotifierService,
    private hiveCache: GlobalHiveCacheService,
    private globalHiveService: GlobalHiveService
  ) {
    ProfileService.instance = this;
  }

  changeList(list: string) {
    if (list === "details") {
      this.detailsActive = true;
      this.credsActive = false;
      this.capsulesActive = false;
    }
    if (list === "credentials") {
      this.detailsActive = false;
      this.credsActive = true;
      this.capsulesActive = false;
    }
    if (list === "capsules") {
      this.detailsActive = false;
      this.credsActive = false;
      this.capsulesActive = true;
    }
  }

  init() {
    // Wait for DID store to be activated ("did changed") to subscribe to more DID specific events.
    this.events.subscribe("did:didchanged", () => {
      let didString = this.didService.getActiveDid().getDIDString();
      this.didSyncService.onlineDIDDocumentsStatus.get(didString).subscribe((status) => {
        if (status.checked) {
          this.publishStatusFetched = true;
          this.publishedDIDDocument = status.document;
          this.handleFetchedOnlinedDIDDocument();
        }
        else {
          this.publishStatusFetched = false;
          this.publishedDIDDocument = null;
        }
      });
    });

    this.didSyncService.didNeedsToBePublishedStatus.subscribe((didNeedsToBePublished) => {
      this.didNeedsToBePublished = didNeedsToBePublished;
    });

    this.globalHiveService.vaultStatus.subscribe(status => {
      if (status && status.checkState === VaultLinkStatusCheckState.SUCCESSFULLY_RETRIEVED && status.publishedInfo) {
        // We don't need it yet, but we start fetching the avatar that is possibly stored on a hive vault,
        // as soon as the main user's hive vault is ready. This way, the avatar will be ready when the user
        // starts the main identity screen.
        Logger.log("identity", "User's hive vault is ready, fetching his avatar if any");
        this.getAvatarDataUrl();
      }
    });
  }

  isPublishStatusFetched(): boolean {
    return this.publishStatusFetched;
  }

  setCredentialVisibility(key: string, isVisible: boolean) {
    let credential = this.credentials.find((item) => {
      Logger.log("identity", item.credential.getFragment());

      return item.credential.getFragment() == key;
    });
    if (credential) {
      credential.isVisible = isVisible;
      Logger.log("identity", "Credential2 : " + JSON.stringify(credential));
      Logger.log("identity", "all credentials: " + JSON.stringify(this.credentials));

      this.events.publish("credentials:modified");
    }
  }

  getBasicProfile(): Profile {
    let profile = new Profile();

    // We normally have one credential for each profile field
    this.allCreds.map((cred) => {
      let props = cred.credential.getSubject(); // Credentials properties
      if (!props) {
        Logger.warn('identity', "Found an empty credential subject while trying to build profile, this should not happen...");
        return;
      }

      // Loop over each property in the credential (even if normally there is only one property per credential)
      for (let p of Object.keys(props)) {
        // Skip the special entry "id" that exists in every credential.
        if (p == "id") continue;

        // Try to retrieve a standard property info from this property
        let basicCredentialInfo = BasicCredentialsService.instance.getBasicCredentialInfoByKey(p, cred.isVisible);
        if (basicCredentialInfo) {
          profile.setValue(basicCredentialInfo, props[p]);
        }
      }
    });

    //Logger.log("identity", "Basic profile:", JSON.stringify(profile));
    return profile;

  }

  /*****************************************************************************
    Generates a share intent that shares a "addfriend" url,
    so that friends can easily add the current user as a global trinity friend
  *****************************************************************************/
  async shareIdentity() {
    // if (this.options) {
    //   this.options.dismiss();
    // }

    await this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("common.share-add-me-as-friend"),
      url: await this.getAddFriendShareableUrl(),
    });
  }

  async getAddFriendShareableUrl(): Promise<string> {
    let carrierAddress = await this.contactNotifier.getCarrierAddress();
    let addFriendUrl =
      "https://contact.elastos.net/addfriend?did=" +
      encodeURIComponent(this.didString);
    addFriendUrl += "&carrier=" + carrierAddress;

    return addFriendUrl;
  }

  get allCreds(): CredentialDisplayEntry[] {
    return this.credentials;
  }

  get visibleCredentials(): CredentialDisplayEntry[] {
    return this.allCreds.filter((item) => {
      return item.isVisible == true;
    });
  }

  get invisibleCredentials(): CredentialDisplayEntry[] {
    return this.allCreds.filter((item) => {
      return item.isVisible == false;
    });
  }

  cleanCredentials() {
    this.credentials = [];
    this.events.publish("credentials:modified");
  }

  pushCredentials(credential: CredentialDisplayEntry) {
    this.credentials.push(credential);
    this.events.publish("credentials:modified");
  }

  get verifiedCredentials(): CredentialDisplayEntry[] {
    return this.allCreds.filter((item) => {
      let types = item.credential.getTypes();
      let isVerified = !types.includes("SelfProclaimedCredential");

      return isVerified;
    });
  }

  get profileEntries(): CredentialDisplayEntry[] {
    let basicCredentials = this.basicCredentialService.getBasicCredentialkeys();
    return this.visibleCredentials.filter((item) => {
      let fragment = item.credential.getFragment();
      // let types = item.credential.getTypes();
      // let isApp = types.includes("ApplicationProfileCredential");

      return basicCredentials.find(x => x == fragment) && fragment !== "avatar";
    });
  }

  /********** Identity Data Options **********/
  editProfile() {
    this.editingVisibility = false;
    this.deleteMode = false;
    //this.options.dismiss();
    void this.native.go("/identity/editprofile", { create: false });
  }

  editVisibility() {
    if (this.appCreds.length === 0) {
      this.changeList("details");
    }
    this.deleteMode = false;
    //this.options.dismiss();
    this.editingVisibility = !this.editingVisibility;
  }

  deleteCredentials() {
    this.changeList("credentials");
    this.editingVisibility = false;
    //this.options.dismiss();
    this.deleteMode = !this.deleteMode;
  }

  /********** Reveal Data Options **********/
  async showWarning(warning: string, password: string) {
    Logger.log("identity", "Opening warning");
    this.popover = await this.popoverCtrl.create({
      mode: "ios",
      cssClass: "identity-warning-component",
      component: WarningComponent,
      componentProps: {
        warning: warning,
        password: password,
      },
      translucent: false,
    });
    void this.popover.onWillDismiss().then(async (params) => {
      if(params.data) {
        if(params.data.action === 'confirmDeleteCredentials') {
          this.confirmDeleteCredentials();
        } else if(params.data.action === 'publishDIDDocumentReal') {
          // this.native.go("/identity/publishing")
          this.publishDIDDocumentReal();
        }
      }

      this.popover = null;
      await this.native.setRootRouter("/identity/myprofile/home");
    });
    return await this.popover.present();
  }

  /********************************************************************
    If confirmed by user under delete mode, start deleting credentials
  *********************************************************************/
  confirmDeleteCredentials() {
    void AuthService.instance.checkPasswordThenExecute(
      async () => {
        let password = AuthService.instance.getCurrentUserPassword();

        let currentDidDocument = this.didService
          .getActiveDid()
          .getDIDDocument();

        for (let entry of this.visibleCredentials) {
          if (entry.willingToDelete) {
            await this.deleteSelectedEntryReal(entry, currentDidDocument);
          }
        }

        for (let entry of this.invisibleCredentials) {
          if (entry.willingToDelete) {
            await this.deleteSelectedEntryReal(entry, currentDidDocument);
          }
        }

        // Update profile
        this.events.publish("diddocument:changed");
        // Exit deletion mode
        this.deleteMode = false;
      },
      () => {
        // Cancelled
      }
    );
  }

  private async deleteSelectedEntryReal(
    entry: CredentialDisplayEntry,
    currentDidDocument: DIDDocument
  ): Promise<boolean> {
    // Delete locally
    await this.didService
      .getActiveDid()
      .deleteCredential(new DIDURL(entry.credential.getId()));
    // Delete from local DID document
    if (
      currentDidDocument.getCredentialById(new DIDURL(entry.credential.getId()))
    ) {
      await currentDidDocument.deleteCredential(
        entry.credential,
        AuthService.instance.getCurrentUserPassword()
      );
      return true;
    }
    return false;
  }

  public publish() {
    void this.native.go("/identity/publish");
  }

  private handleFetchedOnlinedDIDDocument() {
    // Nothing yet
  }

  getPublishedCredentials(): DIDPlugin.VerifiableCredential[] {
    if (this.publishedDIDDocument) {
      // We already have a document
      let creds = this.publishedDIDDocument.getCredentials();
      return creds;
    }
    else {
      // We don't have the online document yet (fetch not complete?)
      return [];
    }
  }

  getUnchangedPublishedCredentials(): DIDPlugin.VerifiableCredential[] {
    let publishedCredentials = this.getPublishedCredentials();
    let unchangedCredentials: DIDPlugin.VerifiableCredential[] = [];
    publishedCredentials.forEach(pubCred => {
      var found = this.credentials.find(x => {
        return x.credential.getId() == pubCred.getId();
      });

      if (found) {
        let local = JSON.parse(JSON.stringify(found.credential.getSubject()));
        let published = JSON.parse(JSON.stringify(pubCred.getSubject()));
        if (deepEqual(local, published))
          unchangedCredentials.push(pubCred)
      }
    });
    return unchangedCredentials;
  }

  hasModifiedCredentials(): boolean {
    let publishedCredentials = this.getPublishedCredentials();
    Logger.log("identity", "local creds:", this.credentials, "published:", publishedCredentials);
    for (let pubCred of publishedCredentials) {
      var found = this.credentials.find(x => {
        return x.credential.getId() == pubCred.getId();
      });

      if (found) {
        let local = JSON.parse(JSON.stringify(found.credential.getSubject()));
        let published = JSON.parse(JSON.stringify(pubCred.getSubject()));
        if (!deepEqual(local, published)) {
          Logger.log("identity", "Local and published credentials don't match. hasModifiedCredentials() returns true.", "Local:", local, "Published:", published);
          return true; // we handle only the modified case not the added or removed case
        }
      }
    }

    return false;
  }

  /***********************************************************************************
    If confirmed by user under edit-visibility mode, start publishing data/credentials
  ************************************************************************************/
  public publishDIDDocumentReal() {
    void AuthService.instance.checkPasswordThenExecute(
      async () => {
        let password = AuthService.instance.getCurrentUserPassword();

        await this.updateDIDDocumentFromSelection(password);
        await this.didSyncService.publishActiveDIDDIDDocument(password);
      },
      () => {
        // Cancelled
      }
    );
  }

  /****************************************************
  Checks visibility status for each profile credential
  and update the DID document accordingly
  *****************************************************/
  private async updateDIDDocumentFromSelection(password: string) {
    let changeCount = 0;
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();

    for (let credential of this.allCreds) {
      await this.updateDIDDocumentFromSelectionEntry(
        currentDidDocument,
        credential,
        password
      );
    }


    // Tell everyone that the DID document has some modifications.
    if (changeCount > 0) {
      this.events.publish("diddocument:changed");
    }
  }

  public updateDIDDocument() {
    void AuthService.instance.checkPasswordThenExecute(
      async () => {
        let password = AuthService.instance.getCurrentUserPassword();
        await this.updateDIDDocumentFromSelection(password);
        await this.didService.getActiveDidStore().synchronize(password);
      },
      () => { }
    );
  }

  private async updateDIDDocumentFromSelectionEntry(
    currentDidDocument: DIDDocument,
    credentialEntry: CredentialDisplayEntry,
    password: string
  ) {
    Logger.log("identity",
      "Updating document selection from entry ",
      currentDidDocument,
      credentialEntry
    );
    let credentialId = credentialEntry.credential.getId();
    Logger.log("identity", "Found credential id to publish", credentialId);
    let existingCredential = await currentDidDocument.getCredentialById(
      new DIDURL(credentialId)
    );
    if (!existingCredential && credentialEntry.isVisible) {
      // Credential doesn't exist in the did document yet but user wants to add it? Then add it.
      Logger.log("identity", "add");
      await currentDidDocument.addCredential(
        credentialEntry.credential,
        password
      );
    } else if (
      existingCredential &&
      !credentialEntry.isVisible
    ) {
      // Credential exists but user wants to remove it on chain? Then delete it from the did document
      Logger.log("identity", "delete");
      await currentDidDocument.deleteCredential(
        credentialEntry.credential,
        password
      );
    } else if (
      existingCredential &&
      credentialEntry.isVisible
    ) {
      // Credential exists but user wants to update it on chain? Then delete it from the did document and add it again
      Logger.log("identity", "update");
      await currentDidDocument.updateOrAddCredential(
        credentialEntry.credential,
        password
      );
    }
  }

  /***
   Load allissuers infos found on  profile credentials
  ***/
  loadIssuers(issuersId: string[]) {
    void Promise.all(
      issuersId.map((issuerId) => {
        return this.getIssuerDisplayEntryFromID(issuerId);
      })
    ).then((responses) => {
      responses.forEach((entry) => {
        if (entry !== null) {
          let id = this.transformIssuerId(entry.did);
          this.issuers[id] = entry;
        }
      });
    });
  }

  hasIssuer(issuerId: string): boolean {
    if (issuerId === null || issuerId === "") return false;
    let id = this.transformIssuerId(issuerId);
    return (id in this.issuers);
  }

  getIssuer(issuerId: string): IssuerDisplayEntry {
    if (!this.hasIssuer(issuerId)) return null;
    let id = this.transformIssuerId(issuerId);
    return this.issuers[id];
  }

  private transformIssuerId(issuerId: string) {
    return issuerId.replace("did:elastos:", "");
  }

  /***
   Get Issuer info (DID, name and avatar) from the published DID Document
  ***/
  public getIssuerDisplayEntryFromID(
    issuerId: string
  ): Promise<IssuerDisplayEntry> {
    return new Promise<IssuerDisplayEntry>((resolve, reject) => {
      this.didSyncService
        .getDIDDocumentFromDID(issuerId)
        .then((issuerDoc) => {
          if (issuerDoc === null) {
            Logger.log("identity", issuerId, ' is not published');
            resolve(null);
            return;
          }

          //Logger.log("identity", "Issuer ", issuerId);
          let response: IssuerDisplayEntry = {
            did: this.transformIssuerId(issuerId),
            name: "",
            avatar: "",
          };
          if (issuerDoc !== null) {
            // Get all credentials from issuer DID Document, check if document contains
            // Name and Avatar subjects and save found values into response
            let issuerCredentials: DIDPlugin.VerifiableCredential[] = issuerDoc.getCredentials();
            issuerCredentials.forEach((credential) => {
              let subject = credential.getSubject();
              if ("avatar" in subject) {
                let avatar = subject["avatar"];
                response.avatar = `data:${avatar["content-type"]};${avatar["type"]},${avatar["data"]}`;
              }
              if ("name" in subject) {
                response.name = subject["name"];
              }
            });
          }

          //Logger.log("identity", "Issuer response", response);
          resolve(response);
        })
        .catch((error) => {
          Logger.log("identity", "Issuer error", error);
          reject(error);
        });
    });
  }

  public getAvatarCredential(): DIDPlugin.VerifiableCredential {
    let avatarEntry = this.allCreds.find(c => c.credential.getFragment() === "avatar");
    if (avatarEntry)
      return avatarEntry.credential;
    else
      return null;
  }

  buildAvatar(contentType: "image/jpeg" | "image/png", type: "base64" | "elastoshive", data: string): AvatarCredentialSubject {
    return {
      "content-type": contentType,
      "type": type,
      "data": data
    };
  }

  private avatarDataUrlSubject: BehaviorSubject<string> = null;
  private hiveCacheDataUrlSub: Subscription = null;
  public getAvatarDataUrl(): BehaviorSubject<string> {
    if (!this.avatarDataUrlSubject) {
      this.avatarDataUrlSubject = new BehaviorSubject<string>(null);

      DIDEvents.instance.events.subscribe("did:avatarchanged", () => {
        console.log("DEBUG did:avatarchanged EVENT IN getAvatarDataUrl()")
        this.refreshAvatarUrl();
      });
    }

    this.refreshAvatarUrl();

    // Always return a subject that can be updated with a raw base64 url or data from a hive url
    // later on, even if null at first.
    console.log("DEBUG getAvatarDataUrl() returns:", this.avatarDataUrlSubject);
    return this.avatarDataUrlSubject;
  }

  private refreshAvatarUrl() {
    // Unsubscribe from previous hive cache if needed, as the avatar content type could have changed and become
    // a non hive type.
    if (this.hiveCacheDataUrlSub) {
      this.hiveCacheDataUrlSub.unsubscribe();
      this.hiveCacheDataUrlSub = null;
    }

    let avatarCredential = this.getAvatarCredential();
    if (avatarCredential) {
      console.log("DEBUG refreshAvatarUrl()", avatarCredential, avatarCredential.getSubject())
      if (avatarCredential.getSubject() && avatarCredential.getSubject().avatar && avatarCredential.getSubject().avatar.data) {
        //return "data:image/png;base64," + avatarCredential.getSubject().avatar.data;
        let avatarCacheKey = this.didService.getActiveDid().getDIDString()+"-avatar";
        let hiveAssetUrl: string = avatarCredential.getSubject().avatar.data;

        console.log("DEBUG refreshAvatarUrl() hiveAssetUrl", hiveAssetUrl)

        if (hiveAssetUrl.startsWith("hive://")) {
          // Listen to user's hive cache avatar changes
          console.log("DEBUG PROFILE SERVICE SUBSCR")
          this.hiveCacheDataUrlSub = this.hiveCache.getAssetByUrl(avatarCacheKey, hiveAssetUrl).subscribe(rawData => {
            console.log("DEBUG HIVE CACHE CHANGED IN PROFILE SERVICE, NEXT", rawData)
            if (rawData) {
              let base64DataUrl = "data:image/png;base64,"+Buffer.from(rawData).toString("base64");
              console.log("DEBUG BASE64 ENCODED", base64DataUrl);
              this.avatarDataUrlSubject.next(base64DataUrl);
            }
            else {
              this.avatarDataUrlSubject.next(null);
            }
          });
        }
      }
    }
  }
}
