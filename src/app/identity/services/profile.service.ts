import { Injectable, NgZone } from "@angular/core";
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
import { AvatarCredentialSubject } from "../model/avatarcredentialsubject";
import { GlobalHiveCacheService } from "src/app/services/global.hivecache.service";
import { BehaviorSubject, Subscription } from "rxjs";
import { GlobalHiveService, VaultLinkStatusCheckState } from "src/app/services/global.hive.service";
import { DIDEvents } from "./events";
import { rawImageToBase64DataUrl } from "src/app/helpers/picture.helpers";
import { GlobalService, GlobalServiceManager } from "src/app/services/global.service.manager";
import { IdentityEntry } from "src/app/services/global.didsessions.service";
import { Avatar } from "src/app/contacts/models/avatar";
import { CredentialAvatar } from "src/app/didsessions/model/did.model";
import { CredentialDisplayEntry } from "../model/credentialdisplayentry.model";

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

@Injectable({
  providedIn: "root",
})
export class ProfileService extends GlobalService {
  public static instance: ProfileService = null;

  public didString = "";

  // Profile Data
  public visibleData: ProfileDisplayEntry[];
  public invisibleData: ProfileDisplayEntry[];

  // Profile Credentials
  // private visibleCred: CredentialDisplayEntry[];
  // private invisibleCred: CredentialDisplayEntry[];
  //public appCreds: AppCredentialDisplayEntry[];

  /**
   * UI model for credentials currently present in the local DID document. Meaning that this is
   * the representation of what user has currently locally and possibly willing to publish, but maybe not
   * published yet.
   */
  private credentials: CredentialDisplayEntry[] = []; // Can also be inheriting BasicCredentialDisplayEntry for some items
  private unchangedPublishedCredentials: DIDPlugin.VerifiableCredential[] = [];
  private _hasModifiedCredentials = false;

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

  private avatarDataUrlSubject: BehaviorSubject<string> = null;
  private hiveCacheDataUrlSub: Subscription = null;

  constructor(
    public events: Events,
    private native: Native,
    private zone: NgZone,
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
    super();
    ProfileService.instance = this;

    // Initialize values
    this.resetService();
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);

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

  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    let didString = this.didService.getActiveDid().getDIDString();
    this.didSyncService.onlineDIDDocumentsStatus.get(didString).subscribe((status) => {
      Logger.log("identity", "Profile service got DID Document status change event for DID " + didString);
      if (status.checked) {
        this.publishStatusFetched = true;
        this.publishedDIDDocument = status.document;
        this.recomputeDocumentAndCredentials();
      }
      else {
        this.publishStatusFetched = false;
        this.publishedDIDDocument = null;
      }
    });

    this.events.subscribe("did:credentialadded", () => {
      this.recomputeDocumentAndCredentials();
    });
    this.events.subscribe("did:credentialdeleted", () => {
      this.recomputeDocumentAndCredentials();
    });
    this.events.subscribe("did:credentialmodified", () => {
      this.recomputeDocumentAndCredentials();
    });
    this.events.subscribe("credentials:modified", () => {
      this.recomputeDocumentAndCredentials();
    });
    this.events.subscribe("did:didchanged", () => {
      this.recomputeDocumentAndCredentials();
    });

    return;
  }

  onUserSignOut(): Promise<void> {
    Logger.log("identity", "Signing out from profile service");

    this.resetService();

    return;
  }

  private resetService() {
    if (this.avatarDataUrlSubject) {
      this.avatarDataUrlSubject.next(null);
      this.avatarDataUrlSubject = null;
    }
    this.unsubscribeCacheDataUrl();

    this.didString = "";
    this.credentials = [];
    this.publishedDIDDocument = null;
    this.didNeedsToBePublished = false;
    this.publishStatusFetched = false;
    this.issuers = {};
    this.visibleData = [];
    this.invisibleData = [];
    this.displayedBio = null;
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

  isPublishStatusFetched(): boolean {
    return this.publishStatusFetched;
  }

  /**
   * Convenience conversion to display credential data on UI.
   */
  buildCredentialEntries(publishAvatar?: boolean) {
    // Sort credentials by title
    let rawCredentials = this.didService.getActiveDid().credentials;
    rawCredentials.sort((c1, c2) => {
      if (c1.pluginVerifiableCredential.getFragment() >c2.pluginVerifiableCredential.getFragment())
        return 1;
      else
        return -1;
    });

    // DID issuers found on credentials
    let issuersId: string[] = [];
    this.credentials = [];
    for (let c of rawCredentials) {
      let canDelete = this.credentialCanBeDeleted(c.pluginVerifiableCredential);

      let issuerId = this.getIssuerIdFromVerifiableCredential(
        c.pluginVerifiableCredential
      );
      if (issuerId !== null) issuersId.push(issuerId);

      if (this.credentialIsInLocalDIDDocument(c.pluginVerifiableCredential)) {
        this.credentials.push({
          credential: c.pluginVerifiableCredential,
          issuer: issuerId,
          isVisible: true,
          willingToDelete: false,
          canDelete: canDelete,
        });
      } else {
        this.credentials.push({
          credential: c.pluginVerifiableCredential,
          issuer: issuerId,
          isVisible: false,
          willingToDelete: false,
          canDelete: canDelete,
        });
      }
    }

    if (issuersId.length > 0) {
      this.zone.run(() => {
        void this.loadIssuers(issuersId);
      });
    }

    Logger.log("identity", "Visible credentials", this.visibleCredentials);
    Logger.log("identity", "Invisible credentials", this.invisibleCredentials);
    this.buildAppAndAvatarCreds();

    Logger.log("identity", "Built credential entries", this.credentials);
  }

  /***** Find and build app and avatar creds *****/
  buildAppAndAvatarCreds() {
    //this.profileService.appCreds = [];
    let hasAvatar = false;

    this.visibleCredentials.map((cred) => {
      // Find Avatar Credential
      if ("avatar" in cred.credential.getSubject()) {
        hasAvatar = true;
        Logger.log("identity", "Profile has avatar");
      }
      // Find Description Credential
      if ("description" in cred.credential.getSubject()) {
        this.displayedBio = cred.credential.getSubject().description;
        Logger.log("identity", "Profile has bio", this.displayedBio);
      }
    });
    this.invisibleCredentials.map((cred) => {
      // Find App Credentials
      if ("avatar" in cred.credential.getSubject()) {
        hasAvatar = true;
        let data = "";
        if (cred.credential.getSubject().avatar != null) {
          data = cred.credential.getSubject().avatar.data;
        }
      }
      // Find Description Credentials
      if ("description" in cred.credential.getSubject()) {
        this.displayedBio = cred.credential.getSubject().description;
        Logger.log("identity", "Profile has bio", this.displayedBio);
      }
    });
  }


  getIssuerIdFromVerifiableCredential(
    vc: DIDPlugin.VerifiableCredential
  ): string {
    if (vc === null) return null;

    let id = vc.getIssuer();
    if (id === undefined) return null;

    return id;
  }

  /**
   * Tells if a given credential is currently visible on chain or not (inside the DID document or not).
   */
  public credentialIsInLocalDIDDocument(credential: DIDPlugin.VerifiableCredential) {
    if (!credential)
      return false;

    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();
    if (!currentDidDocument)
      return false;

    let didDocumentCredential = currentDidDocument.getCredentialById(
      new DIDURL(credential.getId())
    );
    return didDocumentCredential != null;
  }

  /**
   * The name credential can not be deleted.
   */
  credentialCanBeDeleted(credential: DIDPlugin.VerifiableCredential) {
    let fragment = credential.getFragment();
    if (fragment === "name") return false;
    else return true;
  }

  async setCredentialVisibility(key: string, willingToBePubliclyVisible: boolean, password: string): Promise<void> {
    let credential = this.credentials.find((item) => {
      return item.credential.getFragment() == key;
    });
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();
    if (credential) {
      Logger.log("identity", "Changing visibility of "+key+" to visibility "+willingToBePubliclyVisible+" in profile service credentials");
      credential.isVisible = willingToBePubliclyVisible;
      await this.updateDIDDocumentFromSelectionEntry(currentDidDocument, credential, password);
      this.events.publish("credentials:modified");
    }
    else {
      Logger.log("identity", "Unable to change visibility of "+key+". Credential not found");
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
        let basicCredentialInfo = BasicCredentialsService.instance.getBasicCredentialInfoByKey(p);
        if (basicCredentialInfo) {
          profile.setValue(basicCredentialInfo, props[p], cred.isVisible);
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

  get verifiedCredentials(): CredentialDisplayEntry[] {
    return this.allCreds.filter((item) => {
      let types = item.credential.getTypes();
      let isVerified = !types.includes("SelfProclaimedCredential");

      return isVerified;
    });
  }

  /**
   * Returns the displayable credentials that are basic profile credentials only.
   */
  get profileEntries(): CredentialDisplayEntry[] {
    let basicCredentials = this.basicCredentialService.getBasicCredentialkeys();
    return this.visibleCredentials.filter((item) => {
      let fragment = item.credential.getFragment();
      return basicCredentials.find(x => x == fragment) && fragment !== "avatar" // default credential display entry
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
    this.changeList("details");
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
      if (params.data) {
        if (params.data.action === 'confirmDeleteCredentials') {
          this.confirmDeleteCredentials();
        } else if (params.data.action === 'publishDIDDocumentReal') {
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
      .deleteCredential(new DIDURL(entry.credential.getId()), true);
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

  private recomputeDocumentAndCredentials() {
    Logger.log("identity", "Profile service is recomputing its local model");
    // Refresh our local model
    this.buildCredentialEntries();
    this.computeUnchangedPublishedCredentials();
    this.computeHasModifiedCredentials();
  }

  getPublishedCredentials(): DIDPlugin.VerifiableCredential[] {
    if (this.publishedDIDDocument) {
      // We already have a document
      let creds = this.publishedDIDDocument.getCredentials();
      Logger.log("identity", "There are "+creds.length+" published credentials.", creds);
      return creds;
    }
    else {
      // We don't have the online document yet (fetch not complete?)
      Logger.log("identity", "No resolved published document (yet?), published credentials list is empty (for now)");
      return [];
    }
  }

  private computeUnchangedPublishedCredentials() {
    let publishedCredentials = this.getPublishedCredentials();
    let unchangedCredentials: DIDPlugin.VerifiableCredential[] = [];
    publishedCredentials.forEach(pubCred => {
      var found = this.credentials.find(x => {
        return new DIDURL(x.credential.getId()).getFragment() === new DIDURL(pubCred.getId()).getFragment();
      });

      if (found) {
        let local = JSON.parse(JSON.stringify(found.credential.getSubject()));
        let published = JSON.parse(JSON.stringify(pubCred.getSubject()));
        if (deepEqual(local, published))
          unchangedCredentials.push(pubCred)
      }
    });
    Logger.log("identity", "Unchanged published credentials were computed:", unchangedCredentials);
    this.unchangedPublishedCredentials = unchangedCredentials;
  }

  getUnchangedPublishedCredentials(): DIDPlugin.VerifiableCredential[] {
    return this.unchangedPublishedCredentials;
  }

  /**
   * Compute if some published credentials have changed locally, or if some new credentials
   * that were now published now need to be published.
   */
  private computeHasModifiedCredentials() {
    Logger.log("identity", "Computing if some credentials are modified. Credentials:", this.credentials);
    let publishedCredentials = this.getPublishedCredentials();

    // For each published credetial, check if a local change occured.
    for (let pubCred of publishedCredentials) {
      var found = this.credentials.find(x => {
        return x.credential.getFragment() == pubCred.getFragment();
      });

      if (found) {
        let local = JSON.parse(JSON.stringify(found.credential.getSubject()));
        let published = JSON.parse(JSON.stringify(pubCred.getSubject()));
        if (!deepEqual(local, published)) {
          Logger.log("identity", "Local and published credentials don't match. hasModifiedCredentials() returns true.", "Local:", local, "Published:", published);
          this._hasModifiedCredentials = true;
          return;
        }
      }
      else {
        // Published credential not found locally? This means the credential was deleted
        // locally but not published. So we have modified credentials.
        Logger.log("identity", "A published credential in not in the local document.", pubCred, "published", publishedCredentials, "local", this.credentials);
        this._hasModifiedCredentials = true;
        return;
      }
    }

    // For each VISIBLE local credential, check if it's already in the published credentials.
    // We may have set a credential to become public
    for (let localCred of this.credentials) {
      if (localCred.isVisible) {
        if (!publishedCredentials.find(c => c.getFragment() === localCred.credential.getFragment())) {
          // local cred willing to be visible but not found in published creds? we have a modified credential
          Logger.log("identity", "Local credential should be published for the first time", localCred);
          this._hasModifiedCredentials = true;
          return;
        }
      }
    }

    Logger.log("identity", "No credentials needs to be published");

    this._hasModifiedCredentials = false;
  }

  hasModifiedCredentials(): boolean {
    return this._hasModifiedCredentials;
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

  /**
   * Returns a promise that resolves when the document update is fully completed or when the operation
   * is cancelled.
   */
  public updateDIDDocument(): Promise<void> {
    return new Promise((resolve) => {
      void AuthService.instance.checkPasswordThenExecute(
        async () => {
          let password = AuthService.instance.getCurrentUserPassword();
          await this.updateDIDDocumentFromSelection(password);
          await this.didService.getActiveDidStore().synchronize();
          resolve();
        },
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Adds, removes or update a credential based on its in-app state as a CredentialDisplayEntry,
   * into the local did document.
   */
  private async updateDIDDocumentFromSelectionEntry(
    currentDidDocument: DIDDocument,
    credentialEntry: CredentialDisplayEntry,
    password: string
  ) {
    Logger.log("identity",
      "Checking if local document has to be modified for entry",
      currentDidDocument,
      credentialEntry
    );
    let credentialId = credentialEntry.credential.getId();
    let existingCredential = await currentDidDocument.getCredentialById(
      new DIDURL(credentialId)
    );
    if (!existingCredential && credentialEntry.isVisible) {
      // Credential doesn't exist in the did document yet but user wants to add it? Then add it.
      Logger.log("identity", "Credential wants to be published but not in the local document. Adding it");
      await currentDidDocument.addCredential(
        credentialEntry.credential,
        password
      );
    } else if (
      existingCredential &&
      !credentialEntry.isVisible
    ) {
      // Credential exists but user wants to remove it on chain? Then delete it from the did document
      Logger.log("identity", "Credential wants to NOT be published but it's in the local document. Removing it");
      await currentDidDocument.deleteCredential(
        credentialEntry.credential,
        password
      );
    } else if (
      existingCredential &&
      credentialEntry.isVisible
    ) {
      // Credential exists but user wants to update it on chain? Then delete it from the did document and add it again
      Logger.log("identity", "Credential exists in the local did document. Updating it");
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

  public getAvatarDataUrl(): BehaviorSubject<string> {
    if (!this.avatarDataUrlSubject) {
      this.avatarDataUrlSubject = new BehaviorSubject<string>(null);

      DIDEvents.instance.events.subscribe("did:avatarchanged", () => {
        void this.refreshAvatarUrl();
      });
    }

    void this.refreshAvatarUrl();

    // Always return a subject that can be updated with a raw base64 url or data from a hive url
    // later on, even if null at first.
    return this.avatarDataUrlSubject;
  }

  private unsubscribeCacheDataUrl() {
    if (this.hiveCacheDataUrlSub) {
      this.hiveCacheDataUrlSub.unsubscribe();
      this.hiveCacheDataUrlSub = null;
    }
  }

  private async refreshAvatarUrl() {
    // Unsubscribe from previous hive cache if needed, as the avatar content type could have changed and become
    // a non hive type.
    this.unsubscribeCacheDataUrl();

    let avatarCredential = this.getAvatarCredential();
    if (avatarCredential) {
      //console.log("DEBUG refreshAvatarUrl()", avatarCredential, avatarCredential.getSubject())
      if (avatarCredential.getSubject() && avatarCredential.getSubject().avatar && avatarCredential.getSubject().avatar.data) {
        //return "data:image/png;base64," + avatarCredential.getSubject().avatar.data;
        let avatarCacheKey = this.didService.getActiveDid().getDIDString() + "-avatar";
        let hiveAssetUrl: string = avatarCredential.getSubject().avatar.data;

        //console.log("DEBUG refreshAvatarUrl() hiveAssetUrl", avatarCacheKey, hiveAssetUrl)

        if (hiveAssetUrl.startsWith("hive://")) {
          Logger.log("identity", "Refreshing avatar from hive url", hiveAssetUrl);
          // Listen to user's hive cache avatar changes
          //console.log("DEBUG PROFILE SERVICE SUBSCR")
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          this.hiveCacheDataUrlSub = this.hiveCache.getAssetByUrl(avatarCacheKey, hiveAssetUrl).subscribe(async rawData => {
            //console.log("DEBUG HIVE CACHE CHANGED IN PROFILE SERVICE, NEXT", /* rawData */)
            if (rawData) {
              Logger.log("identity", "Got raw avatar data from hive");
              let base64DataUrl = await rawImageToBase64DataUrl(rawData);
              //console.log("DEBUG BASE64 ENCODED", /* base64DataUrl */);
              this.avatarDataUrlSubject.next(base64DataUrl);
            }
            else {
              Logger.log("identity", "Got empty avatar data from hive");
              this.avatarDataUrlSubject.next(null);
            }
          });
        }
        else {
          // Assume base64.
          let avatar = await Avatar.fromAvatarCredential(avatarCredential.getSubject().avatar as CredentialAvatar);
          this.avatarDataUrlSubject.next(avatar.toBase64DataUrl());
        }
      }
    }
  }
}
