import { Injectable, NgZone } from "@angular/core";
import { Platform, ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { LocalStorage } from "./localstorage";
import { PopupProvider } from "./popup";
import { Native } from "./native";
import { DIDStore } from "../model/didstore.model";
import { Config } from "./config";
import { DIDEntry } from "../model/didentry.model";
import { DID } from "../model/did.model";
import { NewDID } from "../model/newdid.model";
import {
  DIDDocumentPublishEvent,
  DIDPublicationStatusEvent,
} from "../model/eventtypes.model";
import { DIDService } from "./did.service";
import { DIDDocument } from "../model/diddocument.model";
import { Events } from "./events.service";
import { AuthService } from "./auth.service";
import { Logger } from "src/app/logger";

declare let didManager: DIDPlugin.DIDManager;

@Injectable({
  providedIn: "root",
})
export class DIDSyncService {
  public static instance: DIDSyncService = null;

  // Latest know status for each did, about whether it needs to be published or not (fresh changes not yet on chain)
  public needToPublishStatuses: Map<DID, boolean> = new Map();

  constructor(
    private platform: Platform,
    public zone: NgZone,
    private translate: TranslateService,
    public toastCtrl: ToastController,
    public events: Events,
    public popupProvider: PopupProvider,
    public localStorage: LocalStorage,
    private didService: DIDService,
    public native: Native,
    private authService: AuthService
  ) {
    DIDSyncService.instance = this;

    this.subscribeEvents();
  }

  private subscribeEvents() {
    this.events.subscribe(
      "diddocument:publishresult",
      (result: DIDDocumentPublishEvent) => {
        Logger.log("identity", "diddocument:publishresult event received", result);
        this.onDIDDocumentPublishResponse(result);
      }
    );

    this.events.subscribe("did:didchanged", () => {
      Logger.log("Identity", "DID Sync service got did changed event");
      // Every time a DID has changed we check its publish status
      let did = this.didService.getActiveDid();
      if (did) this.checkIfDIDDocumentNeedsToBePublished(did);
    });

    this.events.subscribe(
      "diddocument:locallymodified",
      (didString: DIDPlugin.DIDString) => {
        // Assume the modified did is the active one.
        let did = this.didService.getActiveDid();

        this.setDidDocumentNeedsToBePublished(did);
      }
    );
  }

  /**
   * Ask the wallet application to publish the currently active DID document for us, on the DID
   * sidechain.
   */
  public async publishActiveDIDDIDDocument(password: string) {
    try {
      await this.native.showLoading("please-wait");
      await this.didService
        .getActiveDidStore()
        .getActiveDid()
        .getDIDDocument()
        .publish(password);
      this.native.hideLoading();
    } catch (err) {
      await this.native.hideLoading();
      Logger.log("identity", JSON.stringify(err));
      await this.popupProvider.ionicAlert("publish-error-title", err.message);
    }
  }

  private onDIDDocumentPublishResponse(result: DIDDocumentPublishEvent) {
    if (result.published) {
      Logger.log("identity", "PUBLISHED !");
      this.popupProvider.ionicAlert("publish-success").then(() => {
        this.events.publish("diddocument:publishresultpopupclosed", result);
      });
    } else if (result.cancelled) {
      Logger.log("identity", "CANCELLED");
    } else if (result.error) {
      Logger.error('identity', "ERROR");
      this.popupProvider.ionicAlert("publish-error").then(() => {
        this.events.publish("diddocument:publishresultpopupclosed", result);
      });
    }

    // TODO: user feedback + update UI status (no need to sync any more)
  }

  /**
   * Checks if the active did's DID document needs to be uploaded to the sidechain.
   * This mostly happens when some changes have been made but user hasn't published them yet.
   *
   * NOTE: this method can reply quickly if checks can be done locally, but can also take networking
   * time when resolving is required.
   */
  public async checkIfDIDDocumentNeedsToBePublished(
    did: DID
  ): Promise<boolean> {
    Logger.log("Identity", "Checking if DID document needs to be published", did);
    let didString = did.getDIDString();

    // Check locally resolved DIDDocument modification date, or on chain one if notthing found locally (or expired).
    let currentOnChainDIDDocument: DIDDocument = null;
    try {
      currentOnChainDIDDocument = await this.resolveDIDWithoutDIDStore(
        didString,
        false
      );
      Logger.log("Identity", "Resolved on chain document: ", currentOnChainDIDDocument);

      if (!currentOnChainDIDDocument) {
        // Null? This means there is no published document yet, so we need to publish.
        Logger.log("identity",
          "DID " +
            did.getDIDString() +
            " needs to be published (no did document on chain)"
        );
        this.setPublicationStatus(did, true);
        return true;
      } else {
        Logger.log("Identity", "DID " + did.getDIDString() + " is published");
        this.setPublicationStatus(did, false);
        return false;
      }
    } catch (e) {
      // Exception: maybe network error while resolving. So we consider there is no need (or no way)
      // to publish the document for now.
      Logger.warn('identity', "Exception while resolving DID", e);
      this.setPublicationStatus(did, false);
      return false;
    }

    // Compare modification dates
    let locallyUpdatedDate = await did.getDIDDocument().getUpdated();
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
    }
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

  private setPublicationStatus(did: DID, shouldPublish: boolean) {
    this.needToPublishStatuses.set(did, shouldPublish);

    let event: DIDPublicationStatusEvent = {
      did: did,
      shouldPublish: shouldPublish,
    };
    this.events.publish("did:publicationstatus", event);
  }

  /**
   * Synchronous call that returns the latest status about DID document's publication requirement.
   * This status has been fetched asynchronously by checkIfDIDDocumentNeedsToBePublished().
   */
  public didDocumentNeedsToBePublished(did: DID): boolean {
    return this.needToPublishStatuses.get(did);
  }

  /**
   * When a change in the DID Document is done in the app, we can force-set the "needs publish" value.
   */
  public setDidDocumentNeedsToBePublished(did: DID) {
    this.setPublicationStatus(did, true);
  }

  /**
   * When a change in the DID Document is done in the app, we can force-set the "needs publish" value.
   */
  public getDIDDocumentFromDID(did: string): Promise<DIDDocument> {
    Logger.log("identity", "getDIDDocumentFromDID")
    return this.resolveDIDWithoutDIDStore(did, true);
  }
}
