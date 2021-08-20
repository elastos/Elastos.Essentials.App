import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { BehaviorSubject, Subject } from "rxjs";
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Events } from 'src/app/services/events.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalConfig } from '../config/globalconfig';
import { resolve } from 'path';
import { rawImageToBase64DataUrl } from '../helpers/picture.helpers';
import { JSONObject } from '../model/json';
import { runDelayed } from '../helpers/sleep.helper';

declare let didManager: DIDPlugin.DIDManager;
declare let hiveManager: HivePlugin.HiveManager;

const availableHideNodeProviders: string[] = [
  "https://hive1.trinity-tech.io",
  "https://hive2.trinity-tech.io",
  "https://hive1.trinity-tech.cn"
];

export enum VaultLinkStatusCheckState {
  NOT_CHECKED, // Not checked yet
  SUCCESSFULLY_RETRIEVED, // Vault status was fetched without error
  NETWORK_ERROR, // Network error while fetching the vault status
  UNKNOWN_ERROR // Unknown error while fetching the vault status
}

export type VaultLinkStatus = {
  checkState: VaultLinkStatusCheckState,
  // There is already a vault provider info on chain about a vault provider attacher to this user.
  publishedInfo?: {
    vaultName: string,
    vaultAddress: string,
    vaultVersion: string,
    activePricingPlan: HivePlugin.Payment.ActivePricingPlan
  };
}

@Injectable({
  providedIn: 'root'
})
export class GlobalHiveService extends GlobalService {
  public static instance: GlobalHiveService = null;

  public client = new BehaviorSubject<HivePlugin.Client>(null);
  private vaultLinkStatus: VaultLinkStatus = null; // Current user's vault status.
  private activeVault: HivePlugin.Vault = null;
  private pricingInfo: HivePlugin.Payment.PricingInfo = null; // Cached pricing info for user's current vault provider after been fetched.

  public vaultStatus = new BehaviorSubject<VaultLinkStatus>(null); // Latest known vault status for active user
  private clientCreationSubject: Subject<HivePlugin.Client> = null;

  constructor(
    private router: Router,
    private storage: GlobalStorageService,
    private events: Events,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    private didSessions: GlobalDIDSessionsService
  ) {
    super();

    GlobalHiveService.instance = this;
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  stop() {
    this.vaultLinkStatus = null;
    this.activeVault = null;

    this.clientCreationSubject = null;
    if (this.client) {
      this.client.next(null);
    }

    this.vaultStatus.next(this.vaultLinkStatus);
  }

  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    // New user is signing in: initialize a global hive client and try to get his hive vault status.
    // Not a blocking call
    //Logger.log("GlobalHiveService", "Getting a global hive client instance");
    /* void this.getHiveClient().then((client) => {
      if (!client) {
        Logger.error("GlobalHiveService", "Fatal error in hive manager: Unable to get a global hive client instance.");
      }
      else {
        this.client.next(client);
        Logger.log("GlobalHiveService", "Global hive client instance was created", this.client);
        void this.retrieveVaultLinkStatus();
      }
    }); */

    runDelayed(() => {
      Logger.log("GlobalHiveService", "Global hive client instance was created", this.client);
      void this.retrieveVaultLinkStatus();
    }, 3000);

    return;
  }

  async onUserSignOut(): Promise<void> {
    await this.stop();
    return;
  }

  public async getHiveClient(): Promise<HivePlugin.Client> {
    Logger.log("GlobalHiveService", "Getting hive client");

    // Create only one client instance overall
    if (this.client.value) {
      Logger.log("GlobalHiveService", "Existing client returned", this.client);
      return this.client.value;
    }

    // Avoid double creation - use a subject to have multiple listeners waiting for this hive client creation
    if (!this.clientCreationSubject) {
      Logger.log("GlobalHiveService", "Creating a new subject and get a real client");

      this.clientCreationSubject = new Subject();

      // First call, create the subject and the client
      const hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper();
      if (!hiveAuthHelper) {
        throw new Error("Hive auth helper failed to create");
      }

      // This process takes like 1-2 seconds
      this.client.next(await hiveAuthHelper.getClientWithAuth((e) => {
        // Auth error
        Logger.error("GlobalHiveService", "Hive authentication error", e);
      }));

      Logger.log("GlobalHiveService", "Emitting client created");
      this.clientCreationSubject.next(this.client.value);
      //this.clientCreationSubject = null; // NOTE: don't set the subject to null otherwise observers don't receive the event from the next() above. Weird - Maybe some garbage collection?

      return this.client.value;
    }
    else {
      Logger.log("GlobalHiveService", "Waiting for another client creation request to complete");

      // Not the first call, just wait for client creation completion
      return new Promise(resolve => {
        let tempSub = this.clientCreationSubject.subscribe(pendingClient => {
          Logger.log("GlobalHiveService", "Got pending hive client, now informing the listeners", pendingClient);
          tempSub.unsubscribe();
          this.client.next(pendingClient);
          resolve(pendingClient);
        });
      });
    }
  }

  /**
   * Returns a random hive node address among the nodes that we can choose as default quick start
   * vault provider for new users.
   */
  private getRandomQuickStartHiveNodeAddress(): string {
    let randomIndex = Math.floor(Math.random() * availableHideNodeProviders.length);
    return availableHideNodeProviders[randomIndex];
  }

  public addRandomHiveToDIDDocument(localDIDDocument: DIDPlugin.DIDDocument, storePassword: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let randomHideNodeAddress = this.getRandomQuickStartHiveNodeAddress();
      if (randomHideNodeAddress) {
        let service = didManager.ServiceBuilder.createService('#hivevault', 'HiveVault', randomHideNodeAddress);
        await this.removeHiveVaultServiceFromDIDDocument(localDIDDocument, storePassword);
        localDIDDocument.addService(service, storePassword, () => {
          // Success
          resolve(randomHideNodeAddress);
        }, (err) => {
          reject(err);
        });
      }
      else {
        reject("Hive node address cannot be null");
      }
    });
  }

  private removeHiveVaultServiceFromDIDDocument(localDIDDocument: DIDPlugin.DIDDocument, storePassword: string): Promise<void> {
    return new Promise((resolve) => {
      localDIDDocument.removeService("#hivevault", storePassword, () => {
        resolve();
      }, (err) => {
        // Resolve normally in case of error, as this may be a "service does not exist" error which is fine.
        resolve();
      });
    });
  }

  /**
   * Tells if a given DIDDocument already contains a hive vault or not.
   */
  public documentHasVault(doc: DIDPlugin.DIDDocument): boolean {
    let hiveService = doc.getService("#hivevault");
    return hiveService != null;
  }

  public getDocumentVaultProviderUrl(doc: DIDPlugin.DIDDocument): string {
    let hiveService = doc.getService("#hivevault");
    return hiveService.getEndpoint();
  }

  /**
   * Makes hive vault ready for the current user.
   */
  public async prepareHiveVault(vaultProviderAddress: string): Promise<boolean> {
    Logger.log("GlobalHiveService", "Preparing hive vault");

    let didString = GlobalDIDSessionsService.signedInDIDString;

    let hiveClient = await this.getHiveClient();
    Logger.log("GlobalHiveService", "Got hive client", hiveClient);

    let vault = await hiveClient.createVault(didString, vaultProviderAddress);
    // We don't check if the vault is null or not. NULL without exception means the vault already exists, so that's ok.

    vault = await hiveClient.getVault(didString);
    if (!vault) {
      Logger.error("GlobalHiveService", "NULL vault returned, unable to get the vault for this DID.");
    }
    else {
      // Now try to call an API to see if everything is ok. This will initiate a authentication flow.
      try {
        Logger.log("GlobalHiveService", "Calling an api on the hive vault to make sure everything is fine");

        let pricingPlan = await vault.getPayment().getActivePricingPlan();
        if (!pricingPlan) {
          Logger.error("GlobalHiveService", "Error while calling a test hive vault API. No data returned");
        }
        else {
          Logger.log("GlobalHiveService", "Vault API could be called, all good!");

          // Everything is all right, now we can consider the hive setup as successfully completed.
          return true;
        }
      }
      catch (e) {
        Logger.error("GlobalHiveService", "Exception while calling a test vault API:", e);
      }
    }

    return false;
  }

  /**
   *
   */
  async retrieveVaultLinkStatus(): Promise<VaultLinkStatus> {
    Logger.log("GlobalHiveService", "Looking for vault link status");

    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    let hiveClient = await this.getHiveClient();

    let status: VaultLinkStatus = {
      checkState: VaultLinkStatusCheckState.NOT_CHECKED,
      publishedInfo: null
    };

    // Check if we can find an existing vault provider address on DID chain for this user.
    Logger.log("GlobalHiveService", "Retrieving vault of current user's DID " + signedInDID);
    try {
      this.activeVault = await hiveClient.getVault(signedInDID);
    }
    catch (e) {
      if (hiveManager.errorOfType(e, "VAULT_NOT_FOUND")) {
        // Vault not created on this hive provider yet (old DIDs?) - force user to pick a provider, that will
        // create the vault at the same time.
        Logger.log("GlobalHiveService", "Vault does not exist on this provider. It has to be created again.");
        this.emitUnknownErrorStatus();
        return null;
      }
      else {
        Logger.error("GlobalHiveService", "Exception while calling getVault() in retrieveVaultLinkStatus():", e);
        this.emitUnknownErrorStatus();
        return null;
      }
    }

    if (this.activeVault === null) {
      Logger.log("GlobalHiveService", "No vault found for this DID");
      // Null vault returned, so this either means we are not on ID chain yet, or we didn't
      // call create vault. So the user will have to do it.
    }
    else {
      Logger.log("GlobalHiveService", "Got user vault", this.activeVault);

      // Ensure the vault was created by calling the createVault() API. We can make sure of this by getting the active
      // payment plan. If none or if a vault not found exception is returned, this means the vault was not yet created.
      let activePricingPlan: HivePlugin.Payment.ActivePricingPlan = null;
      try {
        activePricingPlan = await this.activeVault.getPayment().getActivePricingPlan();
        if (!activePricingPlan) {
          Logger.log("GlobalHiveService", "Call to getActivePricingPlan() returned null. Vault was probably not created correctly earlier and needs to be registered again.");
          this.emitUnknownErrorStatus();
          return null;
        }
        Logger.log("GlobalHiveService", "Got active payment plan from retrieveVaultLinkStatus():", activePricingPlan);
      }
      catch (e) {
        if (hiveManager.errorOfType(e, "VAULT_NOT_FOUND")) {
          Logger.log("GlobalHiveService", "Call to getActivePricingPlan() returned a vault not found exception. Vault was probably not created correctly earlier and needs to be registered again.");
          this.emitUnknownErrorStatus();
          return null;
        }
        else {
          Logger.error("GlobalHiveService", "Exception while calling getActivePricingPlan() in retrieveVaultLinkStatus():", e);
          this.emitUnknownErrorStatus();
          return null;
        }
      }

      status.checkState = VaultLinkStatusCheckState.SUCCESSFULLY_RETRIEVED;

      let currentlyPublishedVaultAddress = this.activeVault.getVaultProviderAddress();
      Logger.log("GlobalHiveService", "Currently published vault address: ", currentlyPublishedVaultAddress);

      if (currentlyPublishedVaultAddress) {
        status.publishedInfo = {
          vaultAddress: currentlyPublishedVaultAddress,
          vaultName: "Unknown Vault Name",
          vaultVersion: await this.activeVault.getNodeVersion(),
          activePricingPlan
        };
      }
    }

    Logger.log("GlobalHiveService", "Link status retrieval completed");

    this.vaultLinkStatus = status;
    this.vaultStatus.next(this.vaultLinkStatus);

    return status;
  }

  private emitUnknownErrorStatus() {
    Logger.log("GlobalHiveService", "Emiting unknown error status");
    this.vaultLinkStatus = {
      checkState: VaultLinkStatusCheckState.UNKNOWN_ERROR
    };
    this.vaultStatus.next(this.vaultLinkStatus);
  }

  public getActiveVault(): HivePlugin.Vault {
    return this.activeVault;
  }

  public hiveUserVaultCanBeUsed(): boolean {
    return this.activeVault !== null;
  }

  /**
   * Sets and saves a NEW vault provider for the active DID, without any transfer of data.
   */
  public async publishVaultProvider(providerName: string, vaultAddress: string): Promise<boolean> {
    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    // First try to create the vault on the provider
    try {
      let createdVault = await this.client.value.createVault(signedInDID, vaultAddress);
      if (createdVault) {
        Logger.log("GlobalHiveService", "Vault was newly created on the provider. Now updating vault address on user's DID");

        // Vault creation succeeded, we can now save the provider address on ID chain.
        this.activeVault = createdVault;
      }
      else {
        // Vault already exists on this provider. Nothing to do
        Logger.log("GlobalHiveService", "The vault already exists on the vault provider.");
      }

      let publicationStarted = await this.publishVaultProviderToIDChain(providerName, vaultAddress);
      return publicationStarted;
    }
    catch (err) {
      Logger.error('HiveManager', "Failed to create vault on the vault provider for DID " + signedInDID + " at address " + vaultAddress, err);
      return false;
    }
  }

  private async publishVaultProviderToIDChain(providerName: string, vaultAddress: string): Promise<boolean> {
    Logger.log("GlobalHiveService", "Requesting identity app to update the hive provider");

    try {
      let result: { result: { status: string } } = await this.globalIntentService.sendIntent("https://did.elastos.net/sethiveprovider", {
        name: providerName,
        address: vaultAddress
      });

      Logger.log("GlobalHiveService", "Got sethiveprovider intent result:", result);

      if (result && result.result && result.result.status && result.result.status == "published") {
        // Vault address was added to user's DID document and publication is on going.
        // Now wait a moment
        return true; // Publishing
      }
      else {
        // Publication was cancelled or errored. Do nothing more. Maybe user will retry.
        Logger.log("GlobalHiveService", "Publication cancelled or errored");
        return false;
      }
    }
    catch (err) {
      Logger.error("GlobalHiveService", "Error while trying to call the sethiveprovider intent: ", err);
      return false;
    }
  }

  public async getPricingInfo(): Promise<HivePlugin.Payment.PricingInfo> {
    if (this.pricingInfo)
      return this.pricingInfo;

    this.pricingInfo = await this.getActiveVault().getPayment().getPricingInfo();

    return this.pricingInfo;
  }

  /**
   * Calls a hive script that contains a downloadable picture file, for instance a identity avatar.
   * The fetched picture is returned as a raw buffer.
   *
   * Ex: hive://user_did@app_did/getMainIdentityAvatar ---> âPNG   IHDR...
   */
  public fetchHiveScriptPicture(hiveScriptUrl: string): Promise<Buffer> {
    // DIRTY HACK START - delete this after a while. Reason: Essentials 2.1 android generates invalid script urls such as
    // ...&params={empty:0} // invalid json. - should be &params={\"empty\"":0}. DELETE this hack after a while.
    hiveScriptUrl = hiveScriptUrl.replace("params={empty:0}", "params={\"empty\":0}");
    // DIRTY HACK END

    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise<Buffer>(async (resolve) => {
      try {
        let hiveClient = await this.getHiveClient();
        Logger.log("GlobalHiveService", "Calling script url to download file", hiveScriptUrl);
        let reader = await hiveClient.downloadFileByScriptUrl(hiveScriptUrl); // Broken in Hive Java SDK 2.0.29

        let rawData: Uint8Array = await reader.readAll();

        if (!rawData || rawData.length == 0) {
          Logger.warn("GlobalHiveService", "Got empty data while fetching hive script picture", hiveScriptUrl);
          resolve(null);
        }
        else {
          Logger.log("GlobalHiveService", "Got data after fetching hive script picture", hiveScriptUrl, "data length:", rawData.length);
          resolve(Buffer.from(rawData));
        }
      }
      catch (e) {
        // Can't download the asset
        Logger.warn("GlobalHiveService", "Failed to download hive asset at "+hiveScriptUrl, e);
        resolve(null);
      }
    });
  }

  /**
   * Calls a hive script that contains a downloadable picture file, for instance a identity avatar.
   * The fetched picture is returned as a data URL "data:xxx" directly usable with Img HTML elements.
   *
   * Ex: hive://user_did@app_did/getMainIdentityAvatar ---> "data:image/png;base64,iVe89...."
   */
  public fetchHiveScriptPictureToDataUrl(hiveScriptUrl: string): Promise<string> {
    return new Promise(resolve => {
      void this.fetchHiveScriptPicture(hiveScriptUrl).then(rawPicture => {
        resolve(rawImageToBase64DataUrl(rawPicture));
      });
    });
  }

  /**
   * From a DID Credential subject payload, tries to extract a avatar hive url.
   * Returns this url if possible, or null otherwise.
   */
  public getHiveAvatarUrlFromDIDAvatarCredential(avatarCredentialSubject: JSONObject): string {
    if (avatarCredentialSubject.type && avatarCredentialSubject.type == "elastoshive") {
      if (avatarCredentialSubject.data && avatarCredentialSubject["content-type"]) {
          let hiveUrl = avatarCredentialSubject.data as string;
          return hiveUrl;
      }
    }
    // Other cases: return nothing.
    return null;
  }
}
