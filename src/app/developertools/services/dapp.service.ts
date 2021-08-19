import { Injectable, NgZone } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { StorageDApp } from '../model/storagedapp.model';
import { CreatedDApp } from '../model/customtypes';
import { Router } from '@angular/router';
import { HelpComponent } from '../components/help/help.component';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';

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
    ) {
    }

    public async init(): Promise<any> {
        await this.loadDApps();
    }

    private async loadDApps(): Promise<void> {
        Logger.log("developertools", "Loading local dapps list");

        let dappsJson = await this.storage.getSetting<any[]>(GlobalDIDSessionsService.signedInDIDString, "developertools", "dapps", null);
        Logger.log("developertools", "Loaded dapps json:", dappsJson);
        this.dapps = [];
        if (dappsJson) {
            for (let dappJson of dappsJson) {
                Logger.log("developertools", "Adding Dapp from json:", dappJson);
                this.dapps.push(StorageDApp.fromJson(dappJson))
            }
        }
        Logger.log("developertools", "Loaded dapps after conversion:", this.dapps);
    }

    public getDApps(): StorageDApp[] {
        Logger.log("developertools", "GET DAPPS", this.dapps);
        return this.dapps;
    }

    private async storeDApp(dapp: StorageDApp): Promise<void> {
        this.dapps.push(dapp);
        await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "developertools", "dapps", this.dapps);
    }

    public async getStorePassword(didStoreId: string): Promise<string> {
        let passwordKey = "store-"+didStoreId;
        let passwordInfo = await passwordManager.getPasswordInfo(passwordKey) as PasswordManagerPlugin.GenericPasswordInfo;
        if (!passwordInfo) {
            Logger.error("developertools", "DID store password could not be retrieved from the password manager");
            return null;
        }

        return passwordInfo.password;
    }

    public createDApp(appName: string): Promise<CreatedDApp> {
        return this.createDAppInternal(appName, null, "");
    }

    public createDAppUsingMnemonic(appName: string, mnemonic: string, passphrase: string): Promise<CreatedDApp> {
        return this.createDAppInternal(appName, mnemonic, passphrase);
    }

    private createDAppInternal(appName: string, mnemonic: string, passphrase: string): Promise<CreatedDApp> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            Logger.log("developertools", "Creating DApp with name " + appName);

            // Create a mnemonic and display it
            // Save app to local storage (app name, did store id)
            // Display the did string

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
                didStore.initPrivateIdentity("ENGLISH", mnemonic, passphrase, storePassword, true, () => {
                    Logger.log("developertools", "Private identity created successfully");

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
                        })
                    }, (err) => {
                        Logger.error("developertools", err);
                    })
                }, (err) => {
                    reject(err);
                });
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

            Logger.log("developertools", "Creating a new DID store");
            didManager.initDidStore(didStoreId, (payload, memo) => {
                // No transaction to publish in this ID transaction callback, it should never be called.
                // Another callback is used when publishing the app.
                Logger.warn("developertools", "Create ID transaction callback called but we do not handle it!");
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            }, async (didStore) => {
                Logger.log("developertools", "DID store created");

                // Generate and save a random DID store password
                let storePassword = await passwordManager.generateRandomPassword();
                let passwordKey = "store-"+didStoreId;
                let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
                    type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
                    displayName: "DID Store password",
                    key: passwordKey,
                    password: storePassword
                };
                let passwordResult = await passwordManager.setPasswordInfo(passwordInfo);

                if (passwordResult.value)
                    resolve(didStore);
                else
                    reject("Password storage was cancelled or something wrong happened. Can't save the DID store password to password manager.")
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
      await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "developertools", "dapps", this.dapps = this.dapps.filter(dapp => dapp.didStoreId !== app.didStoreId));
      void this.popoverController.dismiss();
      void this.router.navigate(['/developertools/home']);
    }

    public deleteApps(): Promise<void> {
      return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "developertools", "dapps", []);
    }
}
