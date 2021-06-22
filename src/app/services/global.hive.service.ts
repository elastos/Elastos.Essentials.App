import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subject } from "rxjs";
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Events } from 'src/app/services/events.service';

declare let didManager: DIDPlugin.DIDManager;
declare let hiveManager: HivePlugin.HiveManager;

const availableHideNodeProviders: string[] = [
  "https://hive1.trinity-tech.io",
  "https://hive2.trinity-tech.io"
];

export type VaultLinkStatus = {
  // There is already a vault provider info on chain about a vault provider attacher to this user.
  publishedInfo: {
    vaultName: string,
    vaultAddress: string,
    vaultVersion: string
  };
  // The app locally thinks that we are waiting for a publication during a few minutes. This could be true
  // no matter if there is already a published provider info on chain (updating provider) or not (first time
  // selection of a provider)
  publishingInfo: {
    vaultName: string,
    vaultAddress: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GlobalHiveService {
  private vaultLinkStatus: VaultLinkStatus = null;
  private client: HivePlugin.Client;
  private activeVault: HivePlugin.Vault = null;
  private activePaymentPlan: HivePlugin.Payment.ActivePricingPlan;
  private pricingInfo: HivePlugin.Payment.PricingInfo = null; // Cached pricing info for user's current vault provider after been fetched.

  private publicationCheckTimer: NodeJS.Timer = null;
  public publicationSubject: Subject<boolean> = new Subject();

  constructor(
    private router: Router,
    private storage: GlobalStorageService,
    private events: Events,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    private didSessions: GlobalDIDSessionsService
  ) { }

  async init() {
    /* let hiveAuthHelper = await new ElastosSDKHelper().newHiveAuthHelper();
    this.client = await hiveAuthHelper.getClientWithAuth((err)=>{
      Logger.error("GlobalHiveService", "Authentication error:", err);
    });

    if (!this.client) {
      Logger.error("GlobalHiveService", "Fatal error in hive manager: Unable to get a hive client instance in init().");
    }
    else {
      Logger.log("GlobalHiveService", "Hive client instance was created");
    } */
  }

  stop() {
    this.vaultLinkStatus = null;
    this.activeVault = null;
    // TODO stop hive
  }

  private async createHiveClient(): Promise<HivePlugin.Client> {
    return new Promise(async (resolve, reject) => {
      const hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper();
      if (!hiveAuthHelper) {
        reject("Hive auth helper failed to create");
        return;
      }

      let hiveClient = await hiveAuthHelper.getClientWithAuth((e) => {
        // Auth error
        Logger.error("GlobalHiveService", "Hive authentication error");
        reject(e);
      });
      resolve(hiveClient);
    });
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
    return new Promise(async (resolve, reject) => {
      let randomHideNodeAddress = this.getRandomQuickStartHiveNodeAddress();
      if (randomHideNodeAddress) {
        let service = didManager.ServiceBuilder.createService('#hivevault', 'HiveVault', randomHideNodeAddress);
        await this.removeHiveVaultServiceFromDIDDocument(localDIDDocument, storePassword);
        localDIDDocument.addService(service, storePassword, async () => {
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

  /**
   * Makes hive vault ready for the current user.
   */
  public async prepareHiveVault(vaultProviderAddress: string): Promise<boolean> {
    Logger.log("GlobalHiveService", "Preparing hive vault");

    let didString = GlobalDIDSessionsService.signedInDIDString;

    let hiveClient = await this.createHiveClient();
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
   * Check vault phase:
   * - Get address vault DID (did document)
   *    - If no vault address -> full creation =
   *      - Create vault api + register on DID
   *    - If vault address:
   *      - Check if vault is created at this address (get pricing plan?)
   *    - If not created, call createVault()
   */
  async retrieveVaultLinkStatus(): Promise<VaultLinkStatus> {
    Logger.log("GlobalHiveService", "Looking for vault link status");

    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    if (!this.client) {
      // Should not happen, but just in case.
      Logger.error("GlobalHiveService", "Fatal error in hive manager: Hive client not initialized.");
      return null;
    }

    if (this.vaultLinkStatus) {
      Logger.log("GlobalHiveService", "Reusing existing status:", this.vaultLinkStatus);
      return Promise.resolve(this.vaultLinkStatus);
    }

    let status: VaultLinkStatus = {
      publishedInfo: null,
      publishingInfo: null
    };

    // Check if any on going publication.
    let lastPublishedTime = await this.getLastPublishedTime();
    if (lastPublishedTime) {
      if (moment(lastPublishedTime).add(10, "minute") > moment()) {
        // Publication on going
        status.publishingInfo = {
          vaultAddress: "todo-unsaved-yet",
          vaultName: "todo-unsaved-yet"
        }

        // Publication is on going, so we start an internal polling loop to know when this is ready, so that
        // listeners can know when data is really ready on chain.
        this.startAwaitingPublicationResult(signedInDID);
      }
      else {
        // No publication on going
        status.publishingInfo = null;
      }
    }

    // Check if we can find an existing vault provider address on DID chain for this user.
    Logger.log("GlobalHiveService", "Asking hive manager to give us the vault address for current user's DID " + signedInDID);
    try {
      this.activeVault = await this.client.getVault(signedInDID);
    }
    catch (e) {
      if (hiveManager.errorOfType(e, "VAULT_NOT_FOUND")) {
        // Vault not created on this hive provider yet (old DIDs?) - force user to pick a provider, that will
        // create the vault at the same time.
        Logger.log("GlobalHiveService", "Vault does not exist on this provider. It has to be created again.");
        return null;
      }
      else {
        Logger.error("GlobalHiveService", "Exception while calling getVault() in retrieveVaultLinkStatus():", e);
        throw e;
      }
    }

    if (this.activeVault === null) {
      Logger.log("GlobalHiveService", "No vault found for this DID");
      // Null vault returned, so this either means we are not on ID chain yet,c or we didn't
      // call create vault. So the user will have to do it.
      return status;
    }

    // Ensure the vault was created by claling the createVault() API. We can make sure of this by getting the active
    // payment plan. If none or if a vault not found exception is returned, this means the vault was not yet created.
    try {
      let activePricingPlan = await this.activeVault.getPayment().getActivePricingPlan();
      if (!activePricingPlan) {
        Logger.log("GlobalHiveService", "Call to getActivePricingPlan() returned null. Vault was probably not created correctly earlier and needs to be registered again.");
        return null;
      }
      Logger.log("GlobalHiveService", "Got active payment plan from retrieveVaultLinkStatus():", activePricingPlan);
    }
    catch (e) {
      if (hiveManager.errorOfType(e, "VAULT_NOT_FOUND")) {
        Logger.log("GlobalHiveService", "Call to getActivePricingPlan() returned a vault not found exception. Vault was probably not created correctly earlier and needs to be registered again.");
        return null;
      }
      else {
        Logger.error("GlobalHiveService", "Exception while calling getActivePricingPlan() in retrieveVaultLinkStatus():", e);
        throw e;
      }
    }

    let currentlyPublishedVaultAddress = this.activeVault.getVaultProviderAddress();
    Logger.log("GlobalHiveService", "Currently published vault address: ", currentlyPublishedVaultAddress);

    if (currentlyPublishedVaultAddress) {
      status.publishedInfo = {
        vaultAddress: currentlyPublishedVaultAddress,
        vaultName: "todo-no-way-to-get-this-yet",
        vaultVersion: await this.activeVault.getNodeVersion()
      };
    }

    Logger.log("GlobalHiveService", "Link status retrieval completed");

    this.vaultLinkStatus = status;

    return status;
  }

  /**
   * Polling that tries to get the publication result for a previously published vault address.
   */
  private startAwaitingPublicationResult(ownerDid: string) {
    let intervalDuration = 30 * 1000; // 30 seconds
    this.publicationCheckTimer = setInterval(async () => {
      /*  let currentlyPublishedVaultAddress = await hiveManager.getVaultAddress(ownerDid);
       if (currentlyPublishedVaultAddress) {
         // Finally we could find the vault address
         this.vaultLinkStatus.publishingInfo = null;
         this.vaultLinkStatus.publishedInfo = {
           vaultAddress: currentlyPublishedVaultAddress,
           vaultName: "todo-unsaved-yet"
         };

         // Let listeners know
         this.publicationSubject.next(true);
       } */
    }, intervalDuration);
  }

  public getActiveVault(): HivePlugin.Vault {
    return this.activeVault;
  }

  private async getLastPublishedTime(): Promise<Date> {
    let lastPublishedTime = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "publicationrequesttime", 0);
    return new Date(lastPublishedTime);
  }

  private async saveLastPublishedTime(): Promise<void> {
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "publicationrequesttime", Date.now());
  }

  /**
   * Sets and saves a NEW vault provider for the active DID, without any transfer of data.
   */
  public async publishVaultProvider(providerName: string, vaultAddress: string): Promise<boolean> {
    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    // First try to create the vault on the provider
    try {
      let createdVault = await this.client.createVault(signedInDID, vaultAddress);
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
    return new Promise(async (resolve) => {
      Logger.log("GlobalHiveService", "Requesting identity app to update the hive provider");

      try {
        let result: { result: { status: string } } = await this.globalIntentService.sendIntent("https://did.elastos.net/sethiveprovider", {
          name: providerName,
          address: vaultAddress
        });

        Logger.log("GlobalHiveService", "Got sethiveprovider intent result:", result);

        if (result && result.result && result.result.status && result.result.status == "published") {
          // Save local timestamp - We will not allow to pick another provider before a few minutes
          this.saveLastPublishedTime();

          // Vault address was added to user's DID document and publication is on going.
          // Now wait a moment
          resolve(true); // Publishing
        }
        else {
          // Publication was cancelled or errored. Do nothing more. Maybe user will retry.
          Logger.log("GlobalHiveService", "Publication cancelled or errored");
          resolve(false);
        }
      }
      catch (err) {
        Logger.error("GlobalHiveService", "Error while trying to call the sethiveprovider intent: ", err);
        resolve(false);
      }
    });
  }

  public async getPricingInfo(): Promise<HivePlugin.Payment.PricingInfo> {
    if (this.pricingInfo)
      return this.pricingInfo;

    this.pricingInfo = await this.getActiveVault().getPayment().getPricingInfo();

    return this.pricingInfo;
  }
}
