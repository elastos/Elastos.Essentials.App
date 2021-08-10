import { Injectable, NgZone } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { LocalStorage } from "./localstorage";
import { PopupProvider } from "./popup";
import { Native } from "./native";
import {
  DIDDocumentPublishEvent
} from "../model/eventtypes.model";
import { DIDService } from "./did.service";
import { DIDDocument } from "../model/diddocument.model";
import { Logger } from "src/app/logger";
import { Events } from "src/app/services/events.service";
import { GlobalPublicationService, DIDPublicationStatus } from "src/app/services/global.publication.service";
import { BehaviorSubject } from "rxjs";
import { GlobalService, GlobalServiceManager } from "src/app/services/global.service.manager";
import { IdentityEntry } from "src/app/services/global.didsessions.service";
import { runDelayed } from "src/app/helpers/sleep.helper";

declare let didManager: DIDPlugin.DIDManager;

class OnlineDIDDocumentCache {
  private publishedDocuments: Map<string, DIDDocument | null>; // Published DID documents

  public get(didString: string) {

  }

  public set(didString: string, document: DIDDocument) {

  }
}

type OnlineDIDDocumentStatus = {
  checked: boolean;
  document: DIDDocument;
}

class OnlineDIDDocumentsStatus {
  private documentsSubjects = new Map<string, BehaviorSubject<OnlineDIDDocumentStatus>>();

  public get(didString: string): BehaviorSubject<OnlineDIDDocumentStatus> {
    if (!this.documentsSubjects.has(didString)) {
      // Document subject not cached yet, so we create one for it, with a null document (not yet fetched)
      let subject = new BehaviorSubject<OnlineDIDDocumentStatus>({
        checked: false,
        document: null
      });
      this.documentsSubjects.set(didString, subject);
    }
    return this.documentsSubjects.get(didString);
  }

  public set(didString: string, checked: boolean, document: DIDDocument) {
    // Create the subject if needed, and emit an update event.
    this.documentsSubjects.get(didString).next({checked, document});
  }
}

@Injectable({
  providedIn: "root",
})
export class DIDSyncService implements GlobalService {
  public static instance: DIDSyncService = null;

  /**
   * Subjects that notifiy about online DID Document availabilities.
   */
  public onlineDIDDocumentsStatus = new OnlineDIDDocumentsStatus();

  /**
   * Whether the active DID needs to be published or not (happens when local changes are made).
   */
  public didNeedsToBePublishedStatus = new BehaviorSubject<boolean>(false);

  constructor(
    public zone: NgZone,
    private translate: TranslateService,
    public toastCtrl: ToastController,
    public events: Events,
    public popupProvider: PopupProvider,
    public localStorage: LocalStorage,
    private didService: DIDService,
    public native: Native,
    private globalPublicationService: GlobalPublicationService,
  ) {
    DIDSyncService.instance = this;
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
    this.subscribeEvents();
  }

  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Fetch online DID document for this user.
    // Give some time to release the Essentials startup from too many operations.
    runDelayed(() => this.fetchActiveUserOnlineDIDDocument(), 3000);

    return;
  }

  onUserSignOut(): Promise<void> {
    return;
  }

  private subscribeEvents() {
    this.events.subscribe(
      "diddocument:publishresult",
      (result: DIDDocumentPublishEvent) => {
        Logger.log("identity", "diddocument:publishresult event received", result);
        this.onDIDDocumentPublishResponse(result);
      }
    );

    this.events.subscribe(
      "diddocument:onpublishpayload",
      (payloadInfo: {payload: string, memo: string}) => {
        void this.onDIDDocumentPublishPayloadCreated(payloadInfo.payload, payloadInfo.memo);
      }
    );

    this.globalPublicationService.publicationStatus.subscribe((status) => {
      Logger.log("identity", "DID publication status update for DID", status);
      if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED && this.didService.getActiveDid() && status.didString === this.didService.getActiveDid().getDIDString()) {
        Logger.log("identity", "DID publication complete, fetching the latest document online to refresh the UI");
        // DID published ? Fetch the latest DID Document to let the UI refresh its status (published or not, modified, etc)
        void this.fetchActiveUserOnlineDIDDocument();
      }
    });
  }

  /**
   * Publish the currently active DID document on the DID sidechain.
   */
  public async publishActiveDIDDIDDocument(password: string) {
    try {
      await this.native.showLoading(this.translate.instant('common.please-wait'));
      await this.globalPublicationService.publishDIDFromStore(
        this.didService
        .getActiveDidStore().getId(),
        password,
        this.didService.getActiveDid().getDIDString(),
        true
      )
      /* await this.didService
        .getActiveDidStore()
        .getActiveDid()
        .getDIDDocument()
        .publish(password); */
      void this.native.hideLoading();
    } catch (err) {
      await this.native.hideLoading();
      Logger.log("identity", JSON.stringify(err));
      await this.popupProvider.ionicAlert("identity.publish-error-title", err.message);
    }
  }

  /**
   * To be called after a DID publish transaction payload has been generated by the DID SDK,
   * in order to finalize the publication itself.
   */
  private onDIDDocumentPublishPayloadCreated(payload: string, memo: string) {
    void this.publishDIDTransaction(payload, memo);
  }

  private async publishDIDTransaction(payload: string, memo: string) {
    // Open the "fast did publishing" screen.
    await this.globalPublicationService.publishDIDFromRequest(this.didService.getActiveDid().getDIDString(), JSON.parse(payload), memo, true);
  }

  private onDIDDocumentPublishResponse(result: DIDDocumentPublishEvent) {
    if (result.published) {
      Logger.log("identity", "PUBLISHED !");
      void this.popupProvider.ionicAlert("identity.publish-success").then(() => {
        this.events.publish("diddocument:publishresultpopupclosed", result);
      });
    } else if (result.cancelled) {
      Logger.log("identity", "CANCELLED");
    } else if (result.error) {
      Logger.error('identity', "ERROR");
      void this.popupProvider.ionicAlert("identity.publish-error").then(() => {
        this.events.publish("diddocument:publishresultpopupclosed", result);
      });
    }

    // TODO: user feedback + update UI status (no need to sync any more)
  }

  /**
   * Fetches the DID Document and notifies listeners when this is ready
   */
  private async fetchActiveUserOnlineDIDDocument(forceRemote = false) {
    let didString = this.didService.getActiveDid().getDIDString();
    let currentOnChainDIDDocument = await this.resolveDIDWithoutDIDStore(
      didString,
      forceRemote
    );
    Logger.log("Identity", "Resolved on chain document: ", currentOnChainDIDDocument);

    // Tell listeners that the document has been fetched.
    this.onlineDIDDocumentsStatus.set(didString, true, currentOnChainDIDDocument);

    this.checkIfDIDDocumentNeedsToBePublished(currentOnChainDIDDocument);
  }

  /**
   * Checks if the active did's DID document needs to be uploaded to the sidechain.
   * This mostly happens when some changes have been made but user hasn't published them yet.
   *
   * NOTE: this method can reply quickly if checks can be done locally, but can also take networking
   * time when resolving is required.
   */
  public checkIfDIDDocumentNeedsToBePublished(
    currentOnChainDIDDocument: DIDDocument
  ): boolean {
    Logger.log("Identity", "Checking if active user's DID document needs to be published by comparing to online document", currentOnChainDIDDocument);

    // Check locally resolved DIDDocument modification date, or on chain one if notthing found locally (or expired).
    if (!currentOnChainDIDDocument) {
      // Null? This means there is no published document yet, so we need to publish.
      Logger.log("identity",
        "DID needs to be published (no did document on chain)"
      );
      this.didNeedsToBePublishedStatus.next(true);
      return true;
    } else {
      Logger.log("Identity", "DID is published");
      this.didNeedsToBePublishedStatus.next(false);
      return false;
    }

    // Compare modification dates
    /* let locallyUpdatedDate = await did.getDIDDocument().getUpdated();
    if (
      locallyUpdatedDate >
      currentOnChainDIDDocument.pluginDidDocument.getUpdated()
    ) {
      // User document is more recent than chain document. Need to publish.
      Logger.log("identity",
        "DID " +
          did.getDIDString() +
          " needs to be published (more recent than the on chain one)."
      );
      this.setPublicationStatus(did, true);
      return;
    } else {
      // User document has not been modified recently. Nothing to do.
      Logger.log("identity",
        "DID " + did.getDIDString() + " doesn't need to be published."
      );
      this.needToPublishStatuses.set(did, false);
      this.setPublicationStatus(did, false);
      return;
    } */
  }

  private resolveDIDWithoutDIDStore(
    didString: string,
    forceRemote: boolean
  ): Promise<DIDDocument> {
    Logger.log("Identity", "Resolving DID without DID store", didString, forceRemote);
    return new Promise((resolve, reject) => {
      didManager.resolveDidDocument(
        didString,
        forceRemote,
        (didDocument: DIDPlugin.DIDDocument) => {
          if (!didDocument) resolve(null);
          else resolve(new DIDDocument(didDocument));
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  /**
   * Gets the online DID Dociment for a given DID string.
   * This can be active user's DID, or another one.
   * If forceRemote is false, a cached document will be returned if there is one.
   */
  public async getDIDDocumentFromDID(didString: string, forceRemote = false): Promise<DIDDocument> {
    let cachedDocument = this.onlineDIDDocumentsStatus.get(didString).value;
    if (!cachedDocument || forceRemote) {
      let resolvedDocument = await this.resolveDIDWithoutDIDStore(didString, forceRemote);
      this.onlineDIDDocumentsStatus.set(didString, true, resolvedDocument);
      return resolvedDocument;
    }
    else {
      return cachedDocument.document;
    }
  }
}
