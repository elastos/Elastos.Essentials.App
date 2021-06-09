import { Injectable, NgZone } from "@angular/core";
import { ToastController } from "@ionic/angular";

import { TranslateService } from "@ngx-translate/core";
import { LocalStorage } from "./localstorage";
import { PopupProvider } from "./popup";
import { Native } from "./native";
import { DIDStore } from "../model/didstore.model";
import { DID } from "../model/did.model";
import { ApiNoAuthorityException } from "../model/exceptions/apinoauthorityexception.exception";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { Logger } from "src/app/logger";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { Events } from "src/app/services/events.service";

declare let didManager: DIDPlugin.DIDManager;

@Injectable({
  providedIn: "root",
})
export class DIDService {
  public static instance: DIDService = null;
  public activeDidStore: DIDStore;

  constructor(
    public zone: NgZone,
    private translate: TranslateService,
    public toastCtrl: ToastController,
    public events: Events,
    public localStorage: LocalStorage,
    private popupProvider: PopupProvider,
    public native: Native,
    private didSessions: GlobalDIDSessionsService,
    private globalIntentService: GlobalIntentService
  ) {
    DIDService.instance = this;
  }

  handleNull() {
    return this.native.setRootRouter("/notsignedin");
  }

  public displayDefaultScreen() {
    return this.native.setRootRouter("/identity/myprofile/home");
  }

  /**
   * Loads the global system identity.
   *
   * @param noRouting Don't navigate to screens from this method. Used when initializing identity from the background service.
   */
  public async loadGlobalIdentity(noRouting = false): Promise<boolean> {
    Logger.log("Identity", "Loading global identity");
    let signedInIdentity = await this.didSessions.getSignedInIdentity();
    if (!signedInIdentity) {
      if (!noRouting) 
        await this.native.setRootRouter("/identity/notsignedin");
      return false;
    } else {
      // Activate the DID store, and the DID
      let couldActivate = await this.activateDid(
        signedInIdentity.didStoreId,
        signedInIdentity.didString
      );
      if (!couldActivate) {
        if (!noRouting) 
          await this.handleNull();
        return false;
      }
    }

    return true;
  }

  public activateDidStore(storeId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (storeId == null) {
        Logger.error('identity', "Impossible to activate a null store id!");
        resolve(false);
        return;
      }

      if (storeId == this.getCurDidStoreId()) {
        Logger.log('identity', "DID Store ID hasn't changed - not loading the DID Store");
        resolve(true); // Nothing changed but considered as successful.
        return;
      }

      let didStore = await DIDStore.loadFromDidStoreId(storeId, this.events, this.didSessions, this.globalIntentService);
      if (!didStore) {
        this.popupProvider.ionicAlert(
          "Store load error",
          "Sorry, we were unable to load your DID store..."
        );
        resolve(false);
        return;
      }

      Logger.log("Identity", "Setting active DID store", didStore);
      this.activeDidStore = didStore;

      this.events.publish("did:didchanged");

      resolve(true);
    });
  }

  /**
   * Make the given DID store becoming the active one for all further operations.
   * Redirects to the right screen after activation, if a switch is required.
   */
  public activateDid(storeId: string, didString: string): Promise<boolean> {
    Logger.log("Identity",
      "Activating DID using DID store ID " + storeId + " and DID " + didString
    );

    return new Promise(async (resolve, reject) => {
      if (didString == null) {
        Logger.error('identity', "Impossible to activate a null did string!");
        resolve(false);
        return;
      }

      let couldActivateStore = await this.activateDidStore(storeId);
      if (!couldActivateStore) {
        resolve(false);
        return;
      }

      try {
        let did = this.getActiveDidStore().findDidByString(didString);
        if (!did) {
          // Just in case, should not happen but for robustness...
          Logger.error('identity', "No DID found! Failed to activate DID");
          resolve(false);
          return;
        }
        await this.getActiveDidStore().setActiveDid(did);

        this.events.publish("did:didchanged");

        resolve(true);
      } catch (e) {
        // Failed to load this full DID content
        Logger.error('identity', e);
        resolve(false);
      }
    });
  }

  public async showDid(storeId: string, didString: string) {
    Logger.log('identity', "Showing DID Store " + storeId + " with DID " + didString);
    let couldEnableStore = await this.activateDid(storeId, didString);
    if (!couldEnableStore) {
      Logger.error('identity', "Unable to load the previously selected DID store");
      this.handleNull(); // TODO: go to DID list instead
    } else {
      if (this.getActiveDid() !== null) this.native.setRootRouter("/identity/myprofile/home");
      // this.native.setRootRouter('/noidentity');
      else {
        // Oops, no active DID...
        Logger.warn('identity', "No active DID in this store!");
        throw Error("No active DID in this store!");
      }
    }
  }

  public async newDidStore() {
    let didStore = new DIDStore(this.events, this.didSessions, this.globalIntentService);
    try {
      await didStore.initNewDidStore();
    } catch (e) {
      if (e instanceof ApiNoAuthorityException) {
        await this.popupProvider.ionicAlert(
          "Init Store error",
          'Sorry, this application can not run without the "Create a DID Store" feature'
        );
      }
    }
    return didStore;
  }

  public getCurDidStoreId() {
    if (!this.activeDidStore) return null;

    return this.activeDidStore.pluginDidStore.getId();
  }

  public getActiveDidStore(): DIDStore {
    return this.activeDidStore;
  }

  public getActiveDid(): DID {
    return this.activeDidStore.getActiveDid();
  }

  async deleteDid(did: DID) {
    let storeId = this.getActiveDidStore().getId();
    await this.getActiveDidStore().deleteDid(did);

    // Sign out and go back to the DID session app
    await this.didSessions.signOut();
  }

  generateMnemonic(language): Promise<any> {
    return new Promise((resolve, reject) => {
      didManager.generateMnemonic(
        language,
        (ret) => {
          resolve(ret);
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  isMnemonicValid(language, mnemonic): Promise<any> {
    return new Promise((resolve, reject) => {
      didManager.isMnemonicValid(
        language,
        mnemonic,
        (ret) => {
          resolve(ret);
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  //Credential
  credentialToJSON(
    credential: DIDPlugin.VerifiableCredential
  ): Promise<string> {
    return credential.toString();
  }

  /**
   * We maintain a list of hardcoded basic profile keys=>user friendly string, to avoid
   * always displaying credential keys to user, and instead, show him something nicer.
   */
  getUserFriendlyBasicProfileKeyName(key: string): string {
    let translationKey = "identity.credential-info-type-" + key;
    let translated = this.translate.instant(translationKey);
    if (!translated || translated == "" || translated == translationKey)
      return key;

    return translated;
  }
}
