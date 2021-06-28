import { Injectable, NgZone } from "@angular/core";
import { ModalController, Platform, ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { LocalStorage } from "./localstorage";
import { PopupProvider } from "./popup";
import { Native } from "./native";
import { DID } from "../model/did.model";
import {
  DIDDocumentPublishEvent
} from "../model/eventtypes.model";
import { DIDService } from "./did.service";
import { DIDDocument } from "../model/diddocument.model";
import { AuthService } from "./auth.service";
import { Logger } from "src/app/logger";
import { Events } from "src/app/services/events.service";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { PublicationStatus, GlobalPublicationService, DIDPublicationStatus } from "src/app/services/global.publication.service";
import { BehaviorSubject } from "rxjs";
import { GlobalService, GlobalServiceManager } from "src/app/services/global.service.manager";
import { IdentityEntry } from "src/app/services/global.didsessions.service";

declare let didManager: DIDPlugin.DIDManager;

type OnlineDIDDocumentStatus = {
  checked: boolean; // Whether the DID Document online status was checked at least once
  publishedDocument: DIDDocument; // Published DID document it any, or null
}

@Injectable({
  providedIn: "root",
})
export class DIDSyncService implements GlobalService {
  public static instance: DIDSyncService = null;

  /**
   * Subject that notifies about user's online DID Document availability.
   */
  public onlineDIDDocumentStatus = new BehaviorSubject<OnlineDIDDocumentStatus>({
    checked: false,
    publishedDocument: null
  });

  /**
   * Whether the active DID needs to be published or not (happens when local changes are made).
   */
  public didNeedsToBePublishedStatus = new BehaviorSubject<boolean>(false);

  constructor(
    public zone: NgZone,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public events: Events,
    public popupProvider: PopupProvider,
    public localStorage: LocalStorage,
    private didService: DIDService,
    public native: Native,
    private globalNav: GlobalNavService,
    private authService: AuthService,
    private theme: GlobalThemeService,
    private globalPublicationService: GlobalPublicationService,
    private globalIntentService: GlobalIntentService
  ) {
    DIDSyncService.instance = this;
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
    this.subscribeEvents();
  }

  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // Reset the status to 0 as a new user is signing in.
    this.onlineDIDDocumentStatus.next({
      checked: false,
      publishedDocument: null
    });

    // Fetch online DID document for this user.
    void this.fetchOnlineDIDDocument();

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
      if (status.didString === this.didService.getActiveDid().getDIDString() && status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
        Logger.log("identity", "DID publication complete, fetching the latest document online to refresh the UI");
        // DID published ? Fetch the latest DID Document to let the UI refresh its status (published or not, modified, etc)
        void this.fetchOnlineDIDDocument();
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
  private async fetchOnlineDIDDocument() {
    let currentOnChainDIDDocument = await this.resolveDIDWithoutDIDStore(
      this.didService.getActiveDid().getDIDString(),
      false
    );
    Logger.log("Identity", "Resolved on chain document: ", currentOnChainDIDDocument);

    // Tell listeners that the document has been fetched.
    this.onlineDIDDocumentStatus.next({
      checked: true,
      publishedDocument: currentOnChainDIDDocument
    });

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
   * When a change in the DID Document is done in the app, we can force-set the "needs publish" value.
   */
  public getDIDDocumentFromDID(did: string): Promise<DIDDocument> {
    Logger.log("identity", "getDIDDocumentFromDID")
    return this.resolveDIDWithoutDIDStore(did, true);
  }
}
