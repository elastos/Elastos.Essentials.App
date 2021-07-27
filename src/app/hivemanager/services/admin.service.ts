import { Injectable } from '@angular/core';
import { ManagedProvider } from '../model/managedprovider';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DID } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPublicationService } from 'src/app/services/global.publication.service';

declare let didManager: DIDPlugin.DIDManager;
declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private client: HivePlugin.Client;

  constructor(
    private storage: GlobalStorageService,
    private globalIntentService: GlobalIntentService,
    private globalPublicationService: GlobalPublicationService
  ) {}

  async init() {
  }

  public async getManagedProviders(): Promise<ManagedProvider[]> {
    let providers = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "admin-managedproviders", []) as ManagedProvider[];
    if (!providers)
      providers = [];

    return providers.sort((p1, p2)=>{
      if (p1.creationTime > p2.creationTime) return 1;
      else return -1;
    });
  }

  public async saveManagedProviders(providers: ManagedProvider[]): Promise<void> {
    Logger.log('HiveManager', "Saving all providers:", providers);
    return await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "admin-managedproviders", providers);
  }

  public async getManagedProviderById(id: string): Promise<ManagedProvider> {
    let providers = await this.getManagedProviders();
    return providers.find((p)=>{
      return p.id == id;
    });
  }

  public async updateAndSaveProvider(provider: ManagedProvider, insertAfterRemoving = true) {
    let currentProviders = await this.getManagedProviders() || [];

    // First remove the given provider from the currently saved list, if existing.
    let existingIndex = currentProviders.findIndex((p)=>{
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
      id: (Math.random()*10000000).toFixed(0),
      name: "",
      did: null,
      creationTime: Math.round(new Date().getTime()/1000)
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
  public async createAdminDID(provider: ManagedProvider): Promise<DID.FastDIDCreationResult> {
    let didHelper = new ElastosSDKHelper().newDIDHelper();
    let createdDIDInfo = await didHelper.fastCreateDID("ENGLISH");

    // Save the password to the password manager
    let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
      key: "vaultprovideradmindid-"+provider.id,
      type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
      displayName:"Vault provider admin DID",
      password: createdDIDInfo.storePassword
    };
    let passwordSetResult = await passwordManager.setPasswordInfo(passwordInfo);

    if (!passwordSetResult.value) {
      // Failed to save the password. Cancel DID creation
      return null;
    }

    provider.did = {
      storeId: createdDIDInfo.didStore.getId(),
      didString: createdDIDInfo.did.getDIDString()
    }

    await this.updateAndSaveProvider(provider);

    Logger.log('HiveManager', "Updated provider after DID creation:", provider);

    return createdDIDInfo;
  }

  public getAdminDIDMnemonic(provider: ManagedProvider): Promise<string> {
    return new Promise((resolve)=>{
      didManager.initDidStore(provider.did.storeId, ()=>{
        Logger.warn("hivemanager", "Create ID transaction callback called but we do not handle it!");
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      }, async (didStore)=>{
        let passwordInfo = await passwordManager.getPasswordInfo("vaultprovideradmindid-"+provider.id) as PasswordManagerPlugin.GenericPasswordInfo;
        didStore.exportMnemonic(passwordInfo.password, (mnemonic)=>{
          resolve(mnemonic);
        })
      });
    });
  }

  /**
   * Check on chain if the administration DID for the given vault provider has been published or not.
   * We are not looking for anything special in the did document. Just the document itself is enough.
   */
  public retrieveAdminDIDPublicationStatus(provider: ManagedProvider): Promise<boolean> {
    // No DID created? Then it's of course not published.
    if (!provider.did) {
      return Promise.resolve(false);
    }

    return new Promise((resolve)=>{
      didManager.resolveDidDocument(provider.did.didString, true, (didDocument)=>{
        if (didDocument)
          resolve(true);
        else
          resolve(false);
      })
    });
  }

  /**
   * Initiate a DID publication.
   */
  public async publishAdminDID(provider: ManagedProvider): Promise<void> {
    let passwordInfo = await passwordManager.getPasswordInfo("vaultprovideradmindid-"+provider.id) as PasswordManagerPlugin.GenericPasswordInfo;
    await this.globalPublicationService.publishDIDFromStore(
      provider.did.storeId,
      passwordInfo.password,
      provider.did.didString,
      true);
  }
}
