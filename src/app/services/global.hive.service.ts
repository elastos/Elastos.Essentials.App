import { Injectable } from '@angular/core';
import { AppContext, SubscriptionInfo, Vault, VaultInfo, VaultSubscription } from '@elastosfoundation/hive-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subscription } from "rxjs";
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { InternalHiveAuthHelper } from '../helpers/hive.authhelper';
import { rawImageToBase64DataUrl } from '../helpers/picture.helpers';
import { runDelayed } from '../helpers/sleep.helper';
import { IdentityEntry } from '../model/didsessions/identityentry';
import { JSONObject } from '../model/json';
import { GlobalNetworksService, MAINNET_TEMPLATE, TESTNET_TEMPLATE } from './global.networks.service';
import { GlobalPopupService } from './global.popup.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';
import { GlobalStorageService } from './global.storage.service';
import { DIDSessionsStore } from './stores/didsessions.store';
import { NetworkTemplateStore } from './stores/networktemplate.store';

declare let didManager: DIDPlugin.DIDManager;

const availableHiveNodeProviders = {
  MainNet: [
    "https://hive1.trinity-tech.io",
    "https://hive2.trinity-tech.io",
    "https://hive3.trinity-tech.io"
  ],
  TestNet: [
    "https://hive-testnet1.trinity-tech.io",
    "https://hive-testnet2.trinity-tech.io"
  ]
};

export enum VaultStatusState {
  NOT_CHECKED, // Not checked yet
  SUCCESSFULLY_RETRIEVED, // Vault status was fetched without error
  NETWORK_ERROR, // Network error while fetching the vault status
  UNKNOWN_ERROR // Unknown error while fetching the vault status
}

export type VaultStatus = {
  checkState: VaultStatusState;
  // There is already info on chain about a vault provider attached to this user.
  publishedInfo?: {
    vaultName: string;
    vaultAddress: string;
    vaultVersion: string;
  };
  vaultInfo?: SubscriptionInfo; // Current user's subscription info (used storage, etc) - retrieved by the subscription service
  vaultServices?: Vault; // Current user's vault services instance, if any
}

@Injectable({
  providedIn: 'root'
})
export class GlobalHiveService extends GlobalService {
  public static instance: GlobalHiveService = null;

  private hiveAuthHelper: InternalHiveAuthHelper = null;
  public vaultStatus = new BehaviorSubject<VaultStatus>(null); // Latest known vault status for active user

  private subscription: Subscription = null;
  private availableHiveNodeProviders: string[] = null;

  constructor(
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    private didSessions: GlobalDIDSessionsService,
    private globalNetworksService: GlobalNetworksService,
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService,
    private popup: GlobalPopupService
  ) {
    super();

    GlobalHiveService.instance = this;
  }

  init() {
    GlobalServiceManager.getInstance().registerService(this);

    this.subscription = this.globalNetworksService.activeNetworkTemplate.subscribe(template => {
      switch (template) {
        case MAINNET_TEMPLATE:
          this.availableHiveNodeProviders = availableHiveNodeProviders.MainNet;
          break;
        case TESTNET_TEMPLATE:
          this.availableHiveNodeProviders = availableHiveNodeProviders.TestNet;
          break;
        default:
          this.availableHiveNodeProviders = [];
      }
    })

    this.hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper();
    if (!this.hiveAuthHelper) {
      throw new Error("Hive auth helper failed to create");
    }
  }

  stop() {
    this.vaultStatus?.next(null);

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    this.vaultStatus.next({
      checkState: VaultStatusState.NOT_CHECKED,
      vaultInfo: null,
      publishedInfo: null
    });

    // Wait a moment then check active user's vault status and get things ready to use.
    runDelayed(() => {
      void this.retrieveVaultStatus();
    }, 3000);

    return;
  }

  async onUserSignOut(): Promise<void> {
    await this.stop();
    return;
  }

  /**
   * Convenience method to get a shared vault services instance for the active user.
   */
  public getActiveUserVaultServices(): Promise<Vault> {
    return this.getVaultServicesFor(this.didSessions.getSignedInIdentity().didString);
  }

  /**
   * Helper to get a vaults services instance for any DID.
   */
  public async getVaultServicesFor(targetDid: string): Promise<Vault> {
    Logger.log("GlobalHiveService", "Getting vault services for", targetDid);

    let vaultServices = await this.hiveAuthHelper.getVaultServices(targetDid, (e) => {
      // Auth error
      Logger.error("GlobalHiveService", "Hive authentication error", e);
      throw e;
    });

    return vaultServices;
  }

  /**
   * Checks the current vault status for the active user and updates the RxSubject accordingly.
   */
  private async checkActiveUserVaultServices(): Promise<void> {

  }

  /**
   * Convenience method to get a shared subscription services instance for the active user.
   */
  public getActiveUserSubscriptionServices(): Promise<VaultSubscription> {
    return this.getSubscriptionServicesFor(this.didSessions.getSignedInIdentity().didString);
  }

  /**
   * Helper to get a subscription services instance for any DID.
   */
  public async getSubscriptionServicesFor(targetDid: string): Promise<VaultSubscription> {
    Logger.log("GlobalHiveService", "Getting subscription services for", targetDid);

    let subscriptionServices = await this.hiveAuthHelper.getSubscriptionService(targetDid);

    return subscriptionServices;
  }

  /**
   * Returns a random hive node address among the nodes that we can choose as default quick start
   * vault provider for new users.
   */
  private getRandomQuickStartHiveNodeAddress(): string {
    let randomIndex = Math.floor(Math.random() * this.availableHiveNodeProviders.length);
    return this.availableHiveNodeProviders[randomIndex];
  }

  public addRandomHiveToDIDDocument(localDIDDocument: DIDPlugin.DIDDocument, storePassword: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let randomHiveNodeAddress = this.getRandomQuickStartHiveNodeAddress();
      if (randomHiveNodeAddress) {
        let service = didManager.ServiceBuilder.createService('#hivevault', 'HiveVault', randomHiveNodeAddress);
        await this.removeHiveVaultServiceFromDIDDocument(localDIDDocument, storePassword);
        localDIDDocument.addService(service, storePassword, () => {
          // Success
          resolve(randomHiveNodeAddress);
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
   * Returns the hive vault status for a given DID.
   */
  private async getVaultInfo(targetDid: string): Promise<VaultInfo> {
    let subscriptionService = await this.hiveAuthHelper.getSubscriptionService(targetDid);
    return subscriptionService.checkSubscription();
  }

  /**
   * Subscribes (= sign up with the vault provider, free tier) active user to the target hive vault provider.
   */
  public async subscribeToHiveProvider(vaultProviderAddress: string): Promise<boolean> {
    Logger.log("GlobalHiveService", "Subscribing to hive provider", vaultProviderAddress);

    let didString = DIDSessionsStore.signedInDIDString;

    let vaultInfo: VaultInfo = null;
    try {
      vaultInfo = await this.getVaultInfo(didString);
      console.log("subscribeToHiveProvider vaultInfo", vaultInfo);
    }
    catch (e) {
      // Silent catch, probably not authorized because not subscribed, so we will try to subscribe to the vault.
    }

    if (vaultInfo) {
      // The hive vault is already subscribed, so we have nothing to do.
      return true;
    }
    else {
      // No subscription - subscribe
      Logger.log("GlobalHiveService", "subscribeToHiveProvider(): no vault info, subscribing");
      let subscriptionService = await this.hiveAuthHelper.getSubscriptionService(didString);
      vaultInfo = await subscriptionService.subscribe();
      if (!vaultInfo) {
        // TO CHECK - Failure ?
        Logger.error("GlobalHiveService", "Failed to create vault on the hive node");
        return false;
      }
    }

    let vaultServices = await this.hiveAuthHelper.getVaultServices(didString);
    if (!vaultServices) {
      Logger.error("GlobalHiveService", "NULL vault returned, unable to get the vault for this DID.");
    }
    else {
      // Now try to call an API to see if everything is ok. This will initiate a authentication flow.
      try {
        Logger.log("GlobalHiveService", "Calling an api on the hive vault to make sure everything is fine");

        vaultServices = await this.hiveAuthHelper.getVaultServices(didString);
        let nodeInfo = await vaultServices.getNodeInfo();

        if (!nodeInfo) {
          Logger.error("GlobalHiveService", "Error while calling a test hive vault API. No data returned");
        }
        else {
          Logger.log("GlobalHiveService", "Vault API could be called, all good!");

          // Update the vault status for listeners to start using it
          void this.retrieveVaultStatus();

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
   * Initial check of active user's hive vault status
   */
  private async retrieveVaultStatus(): Promise<void> {
    Logger.log("GlobalHiveService", "Looking for vault status");

    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    // Check if we can find an existing vault provider address on DID chain for this user.
    Logger.log("GlobalHiveService", "Retrieving vault of current user's DID " + signedInDID);
    try {
      let vaultInfo = await (await this.hiveAuthHelper.getSubscriptionService(signedInDID)).checkSubscription();
      let activeUserVaultServices = await this.hiveAuthHelper.getVaultServices(signedInDID);
      // Normally, if no exception thrown, activeUserVaultServices is never null
      this.vaultStatus.next({
        checkState: VaultStatusState.NOT_CHECKED,
        vaultInfo,
        publishedInfo: {
          vaultAddress: await activeUserVaultServices.getProviderAddress(),
          vaultName: "Unknown Vault Name",
          vaultVersion: await (await activeUserVaultServices.getNodeVersion()).toString()
        },
        vaultServices: activeUserVaultServices
      });
    }
    catch (e) {
      /* TODO if (hiveManager.errorOfType(e, "VAULT_NOT_FOUND")) {
        // Vault not created on this hive provider yet (old DIDs?) - force user to pick a provider, that will
        // create the vault at the same time.
        Logger.log("GlobalHiveService", "Vault does not exist on this provider. It has to be created again.");
        this.emitUnknownErrorStatus();
        return null;
      }
      else { */
      Logger.error("GlobalHiveService", "Exception while calling getVault() in retrieveVaultLinkStatus():", e);
      this.emitUnknownErrorStatus();
      return null;
      //}
    }

    Logger.log("GlobalHiveService", "Vault status retrieval completed");
  }

  private emitUnknownErrorStatus() {
    Logger.log("GlobalHiveService", "Emiting unknown error status");
    this.vaultStatus.next({
      checkState: VaultStatusState.UNKNOWN_ERROR
    });
  }

  public getActiveVaultServices(): Vault {
    return this.vaultStatus.value.vaultServices;
  }

  public hiveUserVaultCanBeUsed(): boolean {
    return !!this.getActiveVaultServices();
  }

  /**
   * Sets and saves a NEW vault provider for the active DID, WITHOUT any transfer of data.
   */
  public async publishVaultProvider(providerName: string, vaultAddress: string): Promise<boolean> {
    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    let subscriptionServices = await this.hiveAuthHelper.getSubscriptionService(signedInDID, vaultAddress);
    if (!subscriptionServices) {
      Logger.error('HiveManager', "Failed to create vault on the vault provider for DID " + signedInDID + " at address " + vaultAddress + " because there is no active vault services instance.");
      return false;
    }

    // First try to create the vault on the provider
    try {
      let createdVaultInfo = null;
      try {
        createdVaultInfo = await subscriptionServices.subscribe();
      }
      catch (e) {
        // Maybe already exist. Ignore this exception.
      }

      if (createdVaultInfo) {
        Logger.log("GlobalHiveService", "Vault was newly created on the provider. Now updating vault address on user's DID");
        // Vault creation succeeded, we can now save the provider address on ID chain.
      }
      else {
        // Vault already exists on this provider. Nothing to do
        Logger.log("GlobalHiveService", "The vault already exists on the vault provider.");
      }

      let publicationStarted = await this.publishVaultProviderToIDChain(providerName, vaultAddress);
      if (publicationStarted) {
        // Force update the provider address.
        await AppContext.getProviderAddress(this.didSessions.getSignedInIdentity().didString, null, true);
        void this.retrieveVaultStatus();
      }

      return publicationStarted;
    }
    catch (err) {
      Logger.error('GlobalHiveService', "Failed to create vault on the vault provider for DID " + signedInDID + " at address " + vaultAddress, err);
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
        Logger.log("GlobalHiveService", "Calling script url to download file", hiveScriptUrl);
        let pictureBuffer = await (await this.getActiveUserVaultServices()).getScriptingService().downloadFileByHiveUrl(hiveScriptUrl);

        if (!pictureBuffer || pictureBuffer.length == 0) {
          Logger.warn("GlobalHiveService", "Got empty data while fetching hive script picture", hiveScriptUrl);
          resolve(null);
        }
        else {
          Logger.log("GlobalHiveService", "Got data after fetching hive script picture", hiveScriptUrl, "data length:", pictureBuffer.length);
          resolve(pictureBuffer);
        }
      }
      catch (e) {
        // Can't download the asset
        Logger.warn("GlobalHiveService", "Failed to download hive asset at " + hiveScriptUrl, e);
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
    if (!hiveScriptUrl)
      return null;

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

  /**
   * Tells whether we have already asked user if he wants to sync his data (credentials, contacts) to hi
   * hive vault.
   */
  public getSyncDataToHiveWasPrompted(): Promise<boolean> {
    return this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "hiveservice", "syncdataprompted", false);
  }

  public setSyncDataToHiveWasPrompted() {
    return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "hiveservice", "syncdataprompted", true);
  }

  /**
   * Shows a popup with more information about what it means to activate hive data synchronization.
   * Including the fact that personal data is stored on the chosen vault provider.
   */
  public async showHiveSyncInfoPopup(): Promise<boolean> {
    let confirmed = await this.popup.showConfirmationPopup(
      this.translate.instant('launcher.hive-sync-popup-title'),
      this.translate.instant('launcher.hive-sync-popup-info'),
      this.translate.instant('common.activate'));

    if (confirmed) {
      await this.setSyncDataToHiveWasPrompted();
      await this.prefs.setUseHiveSync(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, true);
    }

    return confirmed;
  }
}
