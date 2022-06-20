import { Injectable } from '@angular/core';
import { DID, DIDStore } from '@elastosfoundation/did-js-sdk';
import { DID as ConnDID } from "@elastosfoundation/elastos-connectivity-sdk-js";
import { TranslateService } from '@ngx-translate/core';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPublicationService } from 'src/app/services/global.publication.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { ManagedProvider } from '../model/managedprovider';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

//declare let didManager: DIDPlugin.DIDManager;
declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(
    private storage: GlobalStorageService,
    private globalPublicationService: GlobalPublicationService,
    private translate: TranslateService,
    public native: GlobalNativeService,
  ) { }

  async init() {
  }

  public async getManagedProviders(): Promise<ManagedProvider[]> {
    let providers = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, 'hivemanager', "admin-managedproviders", []) as ManagedProvider[];
    if (!providers)
      providers = [];

      return providers.sort((p1, p2) => {
      if (p1.creationTime > p2.creationTime) return 1;
      else return -1;
    });
  }

  public async saveManagedProviders(providers: ManagedProvider[]): Promise<void> {
    Logger.log('HiveManager', "Saving all providers:", providers);
    return await this.storage.setSetting(DIDSessionsStore.signedInDIDString, 'hivemanager', "admin-managedproviders", providers);
  }

  public async getManagedProviderById(id: string): Promise<ManagedProvider> {
    let providers = await this.getManagedProviders();
    return providers.find((p) => {
      return p.id == id;
    });
  }

  public async updateAndSaveProvider(provider: ManagedProvider, insertAfterRemoving = true) {
    let currentProviders = await this.getManagedProviders() || [];

    // First remove the given provider from the currently saved list, if existing.
    let existingIndex = currentProviders.findIndex((p) => {
      return p.id == provider.id;
    });
    if (existingIndex != -1) {
      currentProviders.splice(existingIndex, 1);
    }

    // insertAfterRemoving is used by the deletion mechanism.
    if (insertAfterRemoving) {
      // Push the updated content
      currentProviders.push(provider);
    }

    // Save everything back to local storage
    await this.saveManagedProviders(currentProviders);
  }

  public async createProvider(): Promise<ManagedProvider> {
    let provider = {
      id: (Math.random() * 10000000).toFixed(0),
      name: "",
      did: null,
      creationTime: Math.round(new Date().getTime() / 1000)
    }

    await this.updateAndSaveProvider(provider);

    return provider;
  }

  public async deleteProvider(provider: ManagedProvider): Promise<void> {
    await this.updateAndSaveProvider(provider, false);
  }

  /**
   * Created a new Administration DID for a given vault provider configuration
   */
  public async createAdminDID(provider: ManagedProvider): Promise<ConnDID.FastDIDCreationResult> {
    let didHelper = new ElastosSDKHelper().newDIDHelper();
    let createdDIDInfo = await didHelper.fastCreateDID("english");

    // Save the password to the password manager
    let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
      key: "vaultprovideradmindid-" + provider.id,
      type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
      displayName: "Vault provider admin DID",
      password: createdDIDInfo.storePassword
    };
    let passwordSetResult = await passwordManager.setPasswordInfo(passwordInfo);

    if (!passwordSetResult.value) {
      // Failed to save the password. Cancel DID creation
      Logger.error('HiveManager', "createAdminDID Failed to save the password. Cancel DID creation");
      return null;
    }

    provider.did = {
      storeId: createdDIDInfo.didStoreId,
      didString: createdDIDInfo.did.toString()
    }

    await this.updateAndSaveProvider(provider);

    Logger.log('HiveManager', "Updated provider after DID creation:", provider);

    return createdDIDInfo;
  }

  public async getAdminDIDMnemonic(provider: ManagedProvider): Promise<string> {
    let didStore = await DIDStore.open(provider.did.storeId);

    let passwordInfo = await passwordManager.getPasswordInfo("vaultprovideradmindid-" + provider.id) as PasswordManagerPlugin.GenericPasswordInfo;
    return (await didStore.loadRootIdentity()).exportMnemonic(passwordInfo.password);
  }

  /**
   * Check on chain if the administration DID for the given vault provider has been published or not.
   * We are not looking for anything special in the did document. Just the document itself is enough.
   */
  public async retrieveAdminDIDPublicationStatus(provider: ManagedProvider): Promise<boolean> {
    // No DID created? Then it's of course not published.
    if (!provider.did) {
      return false;
    }

    let didDocument = await new DID(provider.did.didString).resolve(true);
    return (!!didDocument);
  }

  /**
   * Initiate a DID publication.
   */
  public async publishAdminDID(provider: ManagedProvider): Promise<void> {
    let passwordInfo = await passwordManager.getPasswordInfo("vaultprovideradmindid-" + provider.id) as PasswordManagerPlugin.GenericPasswordInfo;
    await this.native.showLoading(this.translate.instant('common.please-wait'));
    try {
      await this.globalPublicationService.publishJSDIDFromStore(
        provider.did.storeId,
        passwordInfo.password,
        provider.did.didString,
        true);
    } catch (e) {
      Logger.warn('HiveManager', "publishJSDIDFromStore exception:", e);
    }
    await this.native.hideLoading();
  }
}
