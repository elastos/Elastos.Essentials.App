import { Injectable, NgZone } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { BehaviorSubject } from "rxjs";
import { Logger } from "src/app/logger";
import { Events } from "src/app/services/events.service";
import { GlobalPublicationService } from "src/app/services/global.publication.service";
import { DIDDocument } from "../model/diddocument.model";
import { DIDService } from "./did.service";
import { LocalStorage } from "./localstorage";
import { Native } from "./native";
import { PopupProvider } from "./popup";

declare let didManager: DIDPlugin.DIDManager;

class OnlineDIDDocumentCache {
  private publishedDocuments: Map<string, DIDDocument | null>; // Published DID documents

  public get(didString: string) {

  }

  public set(didString: string, document: DIDDocument) {

  }
}

type OnlineDIDDocumentStatus = {
  checking: boolean;
  checked: boolean;
  document: DIDDocument;
}

class OnlineDIDDocumentsStatus {
  private documentsSubjects = new Map<string, BehaviorSubject<OnlineDIDDocumentStatus>>();

  public get(didString: string): BehaviorSubject<OnlineDIDDocumentStatus> {
    if (!this.documentsSubjects.has(didString)) {
      // Document subject not cached yet, so we create one for it, with a null document (not yet fetched)
      let subject = new BehaviorSubject<OnlineDIDDocumentStatus>({
        checking: false,
        checked: false,
        document: null
      });
      this.documentsSubjects.set(didString, subject);
    }
    return this.documentsSubjects.get(didString);
  }

  public set(didString: string, checking: boolean, checked: boolean, document: DIDDocument) {
    // Create the subject if needed, and emit an update event.
    this.documentsSubjects.get(didString).next({ checking, checked, document });
  }
}

@Injectable({
  providedIn: "root",
})
export class DIDDocumentsService {
  public static instance: DIDDocumentsService = null;

  /**
   * Subjects that notifiy about online DID Document availabilities.
   */
  public onlineDIDDocumentsStatus = new OnlineDIDDocumentsStatus();

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
    DIDDocumentsService.instance = this;
  }

  /**
   * Fetches the DID Document and notifies listeners when this is ready
   */
  public async fetchActiveUserOnlineDIDDocument(forceRemote = false): Promise<DIDDocument> {
    let didString = this.didService.getActiveDid().getDIDString();
    let currentOnChainDIDDocument = await this.resolveDIDWithoutDIDStore(
      didString,
      forceRemote
    );
    Logger.log("Identity", "Resolved on chain document: ", currentOnChainDIDDocument);

    // Tell listeners that the document has been fetched.
    this.onlineDIDDocumentsStatus.set(didString, false, true, currentOnChainDIDDocument);

    return currentOnChainDIDDocument;
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
   * Gets the online DID Document for a given DID string.
   * This can be active user's DID, or another one.
   *
   * If the same document is already being fetched, we await until a response is received, but
   * without fetching again.
   */
  public fetchOrAwaitDIDDocumentWithStatus(didString: string, forceRemote = false): Promise<OnlineDIDDocumentStatus> {
    let cachedDocumentSubject = this.onlineDIDDocumentsStatus.get(didString);

    /**
     * If checking: subscribe -> resolve when checked is true
     * if not checking:
     *  if !checked || force:
     *    check again
     *  else: resolve current doc
     */

    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async resolve => {
      if (cachedDocumentSubject.value.checking) {
        let subscription = cachedDocumentSubject.subscribe(status => {
          if (status.checked) {
            subscription.unsubscribe();
            resolve(status)
          }
        });
      }
      else {
        if (!cachedDocumentSubject.value.checked || forceRemote) {
          // Not checked yet, or force remote: fetched for real
          this.onlineDIDDocumentsStatus.set(didString, true, false, null);
          let resolvedDocument = await this.resolveDIDWithoutDIDStore(didString, forceRemote);
          this.onlineDIDDocumentsStatus.set(didString, false, true, resolvedDocument);

          resolve(cachedDocumentSubject.value);
        }
        else {
          // checked and not forcing remote: return cached
          resolve(cachedDocumentSubject.value);
        }
      }
    });
  }
}
