import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { DIDHelper } from 'src/app/helpers/did.helper';
import { Logger } from 'src/app/logger';
import { GlobalApplicationDidService } from 'src/app/services/global.applicationdid.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { HelpComponent } from '../components/help/help.component';
import { CreatedDApp } from '../model/customtypes';
import { StorageDApp } from '../model/storagedapp.model';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

declare let didManager: DIDPlugin.DIDManager;
declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
    providedIn: 'root'
})
export class DAppService {
    dapps: StorageDApp[] = [];

    constructor(
        private popoverController: PopoverController,
        public zone: NgZone,
        private router: Router,
        private storage: GlobalStorageService,
        private native: GlobalNativeService,
        private globalApplicationDidService: GlobalApplicationDidService
    ) {
    }

    public async init(): Promise<any> {
        await this.loadDApps();
    }

    private async loadDApps(): Promise<void> {
        Logger.log("developertools", "Loading local dapps list");

        let dappsJson = await this.storage.getSetting<any[]>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "developertools", "dapps", null);
        //Logger.log("developertools", "Loaded dapps json:", dappsJson);
        this.dapps = [];
        if (dappsJson) {
            for (let dappJson of dappsJson) {
                //Logger.log("developertools", "Adding Dapp from json:", dappJson);
                this.dapps.push(StorageDApp.fromJson(dappJson))
            }
        }
        //Logger.log("developertools", "Loaded dapps after conversion:", this.dapps);
    }

    public getDApps(): StorageDApp[] {
        //Logger.log("developertools", "GET DAPPS", this.dapps);
        return this.dapps;
    }

    private async storeDApp(dapp: StorageDApp): Promise<void> {
        this.dapps.push(dapp);
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "developertools", "dapps", this.dapps);
    }

    public async updateDapp(dapp: StorageDApp): Promise<void> {
        // Delete from the model
        this.dapps.splice(this.dapps.findIndex(app => app.didStoreId === dapp.didStoreId && app.didString === dapp.didString), 1);

        // Re-add to the model
        await this.storeDApp(dapp);
    }

    public async getStorePassword(didStoreId: string): Promise<string> {
        let passwordKey = "store-" + didStoreId;
        let passwordInfo = await passwordManager.getPasswordInfo(passwordKey) as PasswordManagerPlugin.GenericPasswordInfo;
        if (!passwordInfo) {
            Logger.error("developertools", "DID store password could not be retrieved from the password manager");
            return null;
        }

        return passwordInfo.password;
    }

    public async createDApp(appName: string): Promise<CreatedDApp> {
        try {
            let app = await this.createDAppInternal(appName, null, "");
            return app;
        }
        catch (e) {
            this.handleCreateDAppError(e);
            return null;
        }
    }

    public async createDAppUsingMnemonic(appName: string, mnemonic: string, passphrase: string): Promise<CreatedDApp> {
        try {
            let app = await this.createDAppInternal(appName, mnemonic, passphrase);
            return app;
        }
        catch (e) {
            this.handleCreateDAppError(e);
            return null;
        }
    }

    private handleCreateDAppError(e: Error) {
        console.log('e', e);

        if (e.message && e.message.includes('Invalid mnemonic')) {
            this.native.errToast('Invalid mnemonic');
        }
    }

    private createDAppInternal(appName: string, mnemonic: string, passphrase: string): Promise<CreatedDApp> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            Logger.log("developertools", "Creating DApp with name " + appName);

            // Create a mnemonic and display it
            // Save app to local storage (app name, did store id)
            // Display the did string

            try {
              // We create a new DID store with a single DID for every dapp because we want totally
              // separate dapps (they should not share the same mnemonic in case of ownership transfer).
              let didStore = await this.createDIDStore();

              if (typeof didManager != 'undefined') {
                  // Generate a mnemonic string that we will display to the user, if none is provided.
                  // Otherwise, use the provided one (imported).
                  if (!mnemonic) {
                      mnemonic = await this.generateMnemonic();
                      Logger.log("developertools", "Mnemonic generated successfully");
                  }

                  let storePassword = await this.getStorePassword(didStore.getId());

                  // Create the root key to be able to create a DID right after
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  didStore.initPrivateIdentity("ENGLISH", mnemonic, passphrase, storePassword, true, async () => {
                      Logger.log("developertools", "Private identity created successfully");

                      // Synchronize potentially published DID document on chain
                      await this.syncStore(didStore, storePassword);

                      // Check if there are imported DIDs from chain. If so, use the first one in the list.
                      // Otherwise, create a new DID.
                      let existingDIDs = await this.listDIDs(didStore);

                      if (!existingDIDs || existingDIDs.length === 0) {
                          // eslint-disable-next-line @typescript-eslint/no-misused-promises
                          didStore.newDid(storePassword, "", async (did) => {
                              Logger.log("developertools", "DID created successfully", did);

                              let dapp = new StorageDApp();
                              dapp.name = appName;
                              dapp.didStoreId = didStore.getId();
                              dapp.didString = did.getDIDString();

                              // Store app info to permanent storage
                              await this.storeDApp(dapp);

                              resolve({
                                  dapp: dapp,
                                  mnemonic: mnemonic
                              });
                          }, (err) => {
                              Logger.error("developertools", err);
                          });
                      }
                      else {
                          // Existing DID - we handle only the first one in the list
                          let appDid = existingDIDs[0].getDIDString();

                          // Fetch the app did document to get its name
                          let publishedAppInfo = await this.globalApplicationDidService.fetchPublishedAppInfo(appDid);

                          let dapp = new StorageDApp();
                          dapp.name = publishedAppInfo ? publishedAppInfo.name : "Unnamed";
                          dapp.didStoreId = didStore.getId();
                          dapp.didString = appDid;

                          // Store app info to permanent storage
                          await this.storeDApp(dapp);

                          resolve({
                              dapp: dapp,
                              mnemonic: mnemonic
                          });
                      }
                  }, (err) => {
                      reject(err);
                  });
              }
            } catch (err) {
              reject(err);
            }
        });
    }

    private generateMnemonic(): Promise<string> {
        return new Promise((resolve, reject) => {
            didManager.generateMnemonic("ENGLISH", (mnemonic) => {
                resolve(mnemonic);
            }, err => {
                reject(err);
            });
        });
    }

    private createDIDStore(): Promise<DIDPlugin.DIDStore> {
        return new Promise((resolve, reject) => {
            // Create an arbitrary DID store ID
            let didStoreId = this.generateRandomUUID(8, 16);

            Logger.log("developertools", "Creating a new DID store", didStoreId);
            didManager.initDidStore(didStoreId, (payload, memo) => {
                // No transaction to publish in this ID transaction callback, it should never be called.
                // Another callback is used when publishing the app.
                Logger.warn("developertools", "Create ID transaction callback called but we do not handle it!");
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
            }, async (didStore) => {
                Logger.log("developertools", "DID store created");

                // Generate and save a random DID store password
                let storePassword = await passwordManager.generateRandomPassword();
                let passwordKey = "store-" + didStoreId;
                let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
                    type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
                    displayName: "DID Store password",
                    key: passwordKey,
                    password: storePassword
                };

                let passwordResult = null;
                try {
                  passwordResult = await passwordManager.setPasswordInfo(passwordInfo);
                } catch (err) {
                  let ex = DIDHelper.reworkedPluginException(err)
                  Logger.error("developertools", ex);
                }

                if (passwordResult && passwordResult.value)
                    resolve(didStore);
                else {
                    didManager.deleteDidStore(didStoreId);
                    reject("Password storage was cancelled or something wrong happened. Can't save the DID store password to password manager.")
                }
            }, (err) => {
                reject(err);
            })
        });
    }

    private generateRandomUUID(len, radix): string {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
        } else {
            // rfc4122, version 4 form
            var r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data. At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random() * 16;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }

        return uuid.join('');
    }

    /**
     * Used to import existing DIDs. synchronizes published documents to get a local copy.
     */
    private syncStore(didStore: DIDPlugin.DIDStore, storePassword: string): Promise<void> {
        return new Promise((resolve, reject) => {
            void didStore.synchronize(storePassword, () => {
                resolve();
            }, (e) => {
                reject(e);
            });
        });
    }

    private listDIDs(didStore: DIDPlugin.DIDStore): Promise<DIDPlugin.DID[]> {
        return new Promise((resolve, reject) => {
            void didStore.listDids(null, (dids) => {
                resolve(dids);
            }, (e) => {
                reject(e);
            });
        });
    }

    public async showHelp(ev: any, helpMessage: string) {
        const popover = await this.popoverController.create({
            mode: 'ios',
            component: HelpComponent,
            cssClass: 'developertools-help-component',
            event: ev,
            componentProps: {
                message: helpMessage
            },
            translucent: false
        });
        return await popover.present();
    }

    async deleteApp(app: StorageDApp): Promise<void> {
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "developertools", "dapps", this.dapps = this.dapps.filter(dapp => dapp.didStoreId !== app.didStoreId));
    }

    public deleteApps(): Promise<void> {
        return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "developertools", "dapps", []);
    }
}
