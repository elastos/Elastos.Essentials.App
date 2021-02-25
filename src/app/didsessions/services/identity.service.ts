
import { Injectable, NgZone } from '@angular/core';
import { Router, Params } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
import { DIDStore } from '../model/didstore.model';
import { NewIdentity } from '../model/newidentity';
import { identity } from 'rxjs';
import { DID, CredentialAvatar } from '../model/did.model';
import { resolve } from 'url';
import { DIDHelper } from '../helpers/did.helper';
import { PasswordManagerCancellationException } from '../model/exceptions/passwordmanagercancellationexception';
import { PopupProvider } from './popup';
import { connectableObservableDescriptor } from 'rxjs/internal/observable/ConnectableObservable';
import { timingSafeEqual } from 'crypto';
import { TranslateService } from '@ngx-translate/core';
import { WrongPasswordException } from '../model/exceptions/wrongpasswordexception.exception';
import { LanguageService } from './language.service';
import { BiometricAuthenticationFailedException } from '../model/exceptions/biometricauthenticationfailed.exception';
import { BiometricLockedoutException } from '../model/exceptions/biometriclockedout.exception';
import { UXService } from './ux.service';
import { Events } from './events.service';
import { DIDSessionsService, IdentityEntry, SignInOptions } from 'src/app/services/didsessions.service';
import { TemporaryAppManagerPlugin, TemporaryPasswordManagerPlugin } from 'src/app/TMP_STUBS';

declare let didManager: DIDPlugin.DIDManager;

export type IdentityGroup = {
    didStoreId: string;
    entries: IdentityEntry[];
}

export type stepCompletionCallback = (data: any)=>void;

export type NextStep = {
    id: number;
    route: string;
    completionCb: stepCompletionCallback
};

export type NavigateWithCompletionEnterData = {
    stepId: number;
    data?: any;
}

@Injectable({
    providedIn: 'root'
})
export class IdentityService {

    private mnemonicLang: DIDPlugin.MnemonicLanguage = DIDPlugin.MnemonicLanguage.ENGLISH;
    public identityBeingCreated: NewIdentity = null;
    private nextSteps = new Array<NextStep>();
    public signedIdentity: IdentityEntry;

    public popup = false;

    constructor(
        public zone: NgZone,
        private events: Events,
        private navCtrl: NavController,
        private popupProvider: PopupProvider,
        private language: LanguageService,
        private translate: TranslateService,
        private alertCtrl: AlertController,
        private uxService: UXService,
        private appManager: TemporaryAppManagerPlugin,
        private passwordManager: TemporaryPasswordManagerPlugin.PasswordManager,
        private didSessions: DIDSessionsService
    ) {
      this.events.subscribe('signIn', (identity) => {
        this.zone.run(() => {
          this.signIn(identity);
        });
      });
      this.events.subscribe('deleteIdentity', (identity) => {
        this.zone.run(() => {
          this.deleteIdentity(identity);
        });
      });
    }

    async init() {
        this.appManager.setListener((msg) => {
            if (msg.message == "navback") {
                this.navCtrl.back();
            }
        });

        this.translate.onLangChange.subscribe(data => {
            let lang = data.lang;
            console.log("Setting current mnemonic language to "+lang);

            // Settings DID SDK language
            if (lang === 'zh') {
                this.setMnemonicLang(DIDPlugin.MnemonicLanguage.CHINESE_SIMPLIFIED);
            } else if (lang === 'fr') {
                this.setMnemonicLang(DIDPlugin.MnemonicLanguage.FRENCH);
            } else {
                this.setMnemonicLang(DIDPlugin.MnemonicLanguage.ENGLISH);
            }
        });
    }

    generateMnemonic(): Promise<string> {
        return new Promise((resolve, reject)=>{
            didManager.generateMnemonic(
                this.getMnemonicLang(),
                (ret) => {resolve(ret)}, (err) => {reject(err)},
            );
        });
    }

    isMnemonicValid(language, mnemonic): Promise<any> {
        return new Promise((resolve, reject)=>{
            didManager.isMnemonicValid(
                language, mnemonic,
                (ret) => {
                    console.log("Is mnemonic valid? (lang = "+language+"): "+ ret);
                    resolve(ret)
                }, (err) => {reject(err)},
            );
        });
    }

    public async signIn(identityEntry: IdentityEntry) {
        // Security check: ask user to enter the master password for the target did.
        // Allow signing in only if the password database could be opened.

        // Set virtual did context
        await this.passwordManager.setVirtualDIDContext(identityEntry.didString);

        // Try to retrieve the did store password. If we can retrieve it, this means the master password database
        // could be successfully unlocked
        try {
            let passwordInfo = await this.passwordManager.getPasswordInfo("didstore-"+identityEntry.didStoreId);
            if (passwordInfo) {
                console.log("Password manager could unlock database for DID "+identityEntry.didString+". Signing in");
                await this.passwordManager.setVirtualDIDContext(null);

                // Force signing out, in case we were not already (but we should be)
                await this.didSessions.signOut()

                let signInOptions: SignInOptions = null;
                if (this.language.languageWasChangedByUser()) {
                    console.log("Language changed by user. Passing session language to be: "+this.language.selectLang);
                    signInOptions = {
                        sessionLanguage: this.language.selectLang
                    }
                }

                await this.didSessions.signIn(identityEntry, signInOptions);
                this.navCtrl.navigateRoot("/launcher/home");
            }
            else {
                console.warn("Failed to authentify using master password. Sign in not permitted.");
            }
        }
        catch (e) {
          console.log('passwordManager.getPasswordInfo :', e)
            e = DIDHelper.reworkedPluginException(e);
            if (e instanceof PasswordManagerCancellationException || e instanceof WrongPasswordException
                  || e instanceof BiometricAuthenticationFailedException || e instanceof BiometricLockedoutException) {
                // Nothing to do, just stop the flow here.
            }
            else {
                throw e;
            }
        }
    }

    signOut() {
      this.didSessions.signOut();
    }

    getSignedIdentity() {
      this.didSessions.getSignedInIdentity().then((id: IdentityEntry) => {
        console.log('Signed ID', id);
        this.signedIdentity = id;
      });
    }

    /**
     * Flow:
     * - User sets a profile name
     * - Generate a mnemonic (backupdid screen) + display to user (backupdid screen)  + verify it (verifymnemonic screen)
     * - Create a new DID store (shared with did app) + automatic did store password
     * - Create a new DID in store + add credential with the name
     * - Set a virtual did context to the password manager (using the created did string)
     *        (so the password manager can save the did store password in the DID session password sandbox,
     *         without being signed in yet)
     * - Save the did store password to the password manager (will ask to create a master password)
     * - If master password created, add a did session identity entry with did string, user name
     * - Sign in with the new DID in did session plugin. DID session app is closed and launcher is started.
     */
    async startCreatingNewDIDWithNewMnemonic() {
        this.identityBeingCreated = new NewIdentity();

        console.log("Navigating to profile edition");
        this.navigateWithCompletion("editprofile", (name)=>{
            this.identityBeingCreated.name = name;
            this.navCtrl.navigateForward(["/backupdid"], { state: { create: true } });
        });
    }

    async createNewDIDWithNewMnemonic() {
        console.log("Creating new did with new mnemonic");

        let didStore = await DIDStore.create();

        // Generate a random password
        let storePassword = await this.passwordManager.generateRandomPassword();
        let mnemonicLanguage = this.getMnemonicLang();
        let mnemonic = this.identityBeingCreated.mnemonic;

        // Initialize the new DID store with a mnemonic and store password
        // TODO: ASK USER IF HE WANTS A MNEMONIC PASSWORD ?
        await didStore.createPrivateIdentity(null, storePassword, mnemonicLanguage, mnemonic);

        // Add a first (and only) identity to the store.
        console.log("Adding DID with info name:", this.identityBeingCreated.name);
        let createdDID = await didStore.addDID(this.identityBeingCreated, storePassword);

        await this.finalizeIdentityCreation(didStore, storePassword, createdDID, this.identityBeingCreated.name);
    }

    private async finalizeIdentityCreation(didStore: DIDStore, storePassword: string, createdDID: DID, identityName: string): Promise<boolean> {
        // Set a virtual did context to the password manager, so we can save the generated did store password
        await this.passwordManager.setVirtualDIDContext(createdDID.getDIDString());

        try {
            // Save the did store password with a master password
            let passwordInfo: TemporaryPasswordManagerPlugin.GenericPasswordInfo = {
                type: TemporaryPasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
                key: "didstore-"+didStore.getId(),
                displayName: "DID store password",
                password: storePassword,
                // TODO: visible: false
            }
            let result = await this.passwordManager.setPasswordInfo(passwordInfo);
            if (result.value) {
                // Master password was created and did store password could be saved
                // Save the identity entry in the did session plugin
                let avatar = createdDID.getAvatarCredentialValue();
                await this.addIdentity(didStore.getId(), createdDID.getDIDString(), identityName, avatar);
                await this.passwordManager.setVirtualDIDContext(null);
            }
            else {
                // Go back to the default screen, creating the new DID is cancelled.
                console.log("Master password input failed. Aborting identity creation.");
                await this.passwordManager.setVirtualDIDContext(null);
            }
        }
        catch (e) {
            e = DIDHelper.reworkedPluginException(e);
            if (e instanceof PasswordManagerCancellationException || e instanceof WrongPasswordException
                || e instanceof BiometricAuthenticationFailedException || e instanceof BiometricLockedoutException) {
                // Nothing to do, just stop the flow here.
                console.log("Master password input cancelled. Stopping identity creation.");

                // Delete the did store
                await this.deleteDIDStore(didStore.getId());
                return false;
            }
            else {
                throw e;
            }
        }

        this.uxService.navigateRoot();
    }

    /**
     * Flow:
     * - User types his 12 mnemonic words
     * - Create a new DID store (shared with did app - based on the given mnemonic) + automatic did store password
     * - Synchronize the created store with chain
     * - IMPORTANT: we support only 1 DID STORE = 1 DID. If several DIDs are derived from the same mnemonic (hdkey),
     *   we take only the FIRST one. Other DIDs are NOT supported.
     * - If there is a synchronized DID:
     *      - Try to extract a name from credentials.
     *          - If no credential, prompt name to user
     * - If no DID in the mnemonic:
     *      - Tell user that no identity was found, and that he can create a new one
     *      - Ask name to user
     *      - Create a new DID in store + add credential with the name
     * - Then:
     *      - Set a virtual did context to the password manager (using the created did string)
     *        (so the password manager can save the did store password in the DID session password sandbox,
     *         without being signed in yet)
     *      - Save the did store password to the password manager (will ask to create a master password)
     *      - If master password created, add a did session identity entry with did string, user name
     *      - Sign in with the new DID in did session plugin. DID session app is closed and launcher is started.
     */
    async startImportingMnemonic(existingMnemonic?: string) {
        this.identityBeingCreated = new NewIdentity();

        if (!existingMnemonic) {
            console.log("Navigating to import DID");
            this.navigateWithCompletion("importdid", async (mnemonic)=>{
                this.identityBeingCreated.mnemonic = mnemonic;
                await this.createStoreAfterImport();
            });
        }
        else {
            this.identityBeingCreated.mnemonic = existingMnemonic;
            await this.createStoreAfterImport();
        }
    }

    private async createStoreAfterImport() {
        console.log("Create store after import");

        let didStore = await DIDStore.create();
        console.log('Getting didStore', didStore);

        // Generate a random password
        let storePassword = await this.passwordManager.generateRandomPassword();
        let mnemonicLanguage = this.getMnemonicLang();
        let mnemonic = this.identityBeingCreated.mnemonic;

        // Initialize the new DID store with a mnemonic and store password
        await didStore.createPrivateIdentity(this.identityBeingCreated.mnemonicPassphrase, storePassword, mnemonicLanguage, mnemonic);

        // Synchronize the store with chain
        console.log("Synchronizing identities");
        await this.uxService.showLoading("retrieve-prompt");

        try {
            await didStore.synchronize(storePassword);
            this.uxService.hideLoading();

            // Check if we could retrieve a DID or not.
            if (didStore.dids.length > 0) {
              // We could sync at least one DID from chain
              console.log(didStore.dids.length+" DIDs could be retrieved on chain");

              if (didStore.dids.length === 1) {
                console.log("Exactly one DID was synced. Using this one directly.");

                // Exactly one DID was synced, so we directly use this one
                let createdDID = didStore.dids[0];
                this.continueImportAfterCreatedDID(didStore, storePassword, createdDID);
              }
              else {
                console.log("More than one DID was synced, asking user to pick one");

                // More than one did was synced. Ask user which one he wants to keep during this import,
                // as for now we only allow one import at a time.
                this.navigateWithCompletion("chooseimporteddid", (createdDID)=>{
                    this.continueImportAfterCreatedDID(didStore, storePassword, createdDID);
                }, {
                    dids: didStore.dids
                });
              }
            }
            else {
                // No DID could be retrieved, so we need to create one.
                console.log("No DID found on chain. Creating a new one.");

                // TODO: show popup to user to tell him that no identity could be retrieved on chain, and that he can
                // create a new profile
                this.navigateWithCompletion("editprofile", async (returnedName) => {
                    this.identityBeingCreated.name = returnedName as string;
                    if (this.identityBeingCreated.name) {
                        console.log("Adding DID with info name:", this.identityBeingCreated.name);
                        let createdDID = await didStore.addDID(this.identityBeingCreated, storePassword);
                        await this.finalizeIdentityCreation(didStore, storePassword, createdDID, this.identityBeingCreated.name);
                    }
                });
            }
        }
        catch (e) {
            this.uxService.hideLoading();
            e = e ? e : "Not specific information";
            console.log('createStoreAfterImport error', e);
            await this.popupProvider.ionicAlert("Synchronization error", e, "Close");

        }
    }

    private async continueImportAfterCreatedDID(didStore: DIDStore, storePassword: string, createdDID: DID) {
        let identityEntries = await this.didSessions.getIdentityEntries();
        let duplicate = identityEntries.find((identityEntry) => identityEntry.didString === createdDID.getDIDString());
        console.log('Checking all identities if import is already added', identityEntries, duplicate);

        if(!duplicate) {
          let profileName = createdDID.getNameCredentialValue();
          if (profileName) {
              console.log("Name credential found in the DID. Using it.");
              await this.finalizeIdentityCreation(didStore, storePassword, createdDID, profileName);
          }
          else {
              // No existing name credential found in the DID, so we need to ask user to give us one
              console.log("No name credential found in the DID. Asking user to provide one.");
              this.navigateWithCompletion("editprofile", async (profileName)=>{
                // Add the name credential in the DID
                await createdDID.addNameCredential(profileName, storePassword);

                // Finalize
                await this.finalizeIdentityCreation(didStore, storePassword, createdDID, profileName);
              });
          }
        } else {
          console.log('New DID is already added');
          this.navCtrl.navigateForward("/pickidentity");
          this.alertDuplicateImport();
        }
    }

    /**
     * Delete an identity
     */
    async deleteIdentity(identity: IdentityEntry): Promise<boolean> {
        console.log("Deleting identity", identity);

        // Set a virtual did context to the password manager, so we can get the did store password
        await this.passwordManager.setVirtualDIDContext(identity.didString);

        // Get did store password from the password manager
        try {

          // Prompt password
          /*   const passwordInfo = await passwordManager.getPasswordInfo("didstore-"+identity.didStoreId) as PasswordManagerPlugin.GenericPasswordInfo;
            if (!passwordInfo) {
                console.log("Unable to retrieve DID store password from password manager");
                return false;
            } */

            // Delete the did store, as for now, 1 DID = 1 DID store
            await this.deleteDIDStore(identity.didStoreId);

            // Delete entry from the did session plugin
            await this.didSessions.deleteIdentityEntry(identity.didString);

            // Cleanup the password manager content
            await this.passwordManager.deleteAll();

            // Notify listeners of this deletion
            this.zone.run(() => {
                this.events.publish("identityremoved", identity);
            })

            return true;
        }
        catch (e) {
            e = DIDHelper.reworkedPluginException(e);
            if (e instanceof PasswordManagerCancellationException || e instanceof WrongPasswordException
                || e instanceof BiometricAuthenticationFailedException || e instanceof BiometricLockedoutException) {
                // Nothing to do, just stop the flow here.
            }
            else {
                throw e;
            }
        }
    }

    deleteDIDStore(didStoreId: string) : Promise<void> {
        return new Promise((resolve, reject)=>{
            didManager.deleteDidStore(didStoreId, ()=>{
                resolve();
            }, (err)=>{
                console.error(err);
                resolve();
            });
        });
    }

    private async addIdentity(didStoreId: string, didString: string, name: string, avatar: CredentialAvatar) {
        /*
         // Special handler for the special "avatar" field
                    if (entry.key == "avatar") {
                        let avatar: Avatar = entry.value as Avatar;
                        console.log("Saving avatar info to signed in identity", avatar)

                        // For now we only know how to save base64 avatars. Other formats are unsupported
                        if (avatar.type === "base64") {
                            // Save this new avatar in the did session plugin.
                            let signedInEntry = await didSessionManager.getSignedInIdentity();
                            signedInEntry.avatar = {
                                contentType: avatar["content-type"],
                                base64ImageData: avatar.data
                            }
                            await didSessionManager.addIdentityEntry(signedInEntry);

                            // Let listeners know
                            DIDEvents.instance.events.publish("did:avatarchanged");
                        }
                    }
                    */

        let newIdentity: IdentityEntry = {
            didStoreId: didStoreId,
            didString: didString,
            name: name
        };

        // Restore the avatar profile picture on the DID session manager, if any
        if (avatar) {
            console.log("Found an avatar in the created DID. Now applying it to the DID session manager entry.", avatar);

            if (avatar.type && avatar.type == "base64") {
                if (avatar.data && avatar["content-type"]) {
                    newIdentity.avatar = {
                        base64ImageData: avatar.data,
                        contentType: avatar["content-type"]
                    }
                }
            }
        }

        console.log("Adding identity entry to DID session manager:", newIdentity);

        await this.didSessions.addIdentityEntry(newIdentity);

        this.zone.run(() => {
            this.events.publish("identityadded", newIdentity);
        })
    }

    async loadGroupedIdentities(): Promise<IdentityGroup[]> {
        console.log("Loading DID Session identities");

        let identityEntries = await this.didSessions.getIdentityEntries();
        //console.log(identityEntries);

        let didStores: IdentityGroup[] = [];
        for (let idEntry of identityEntries) {
            let identityGroup: IdentityGroup = this.getIdentityGroupByStoreId(didStores, idEntry.didStoreId);
            let isDuplicate: boolean = this.checkForDuplicateId(didStores, idEntry.didString);

            // If identity group does not exist, create one
            if (!identityGroup) {
                identityGroup = {
                    didStoreId: idEntry.didStoreId,
                    entries: []
                }
                // If didStores doesn't have DID, add it
                if(!isDuplicate) {
                  didStores.push(identityGroup);
                }
            }

            identityGroup.entries.push(idEntry);
        }

        return Promise.resolve(didStores);
    }

    private getIdentityGroupByStoreId(didStores: IdentityGroup[], storeId: string): IdentityGroup {
        return didStores.find(store => store.didStoreId == storeId);
    }

    checkForDuplicateId(didStores: IdentityGroup[], id: string): boolean {
      let duplicate = didStores.find((idGroup) => idGroup.entries[0].didString === id);
      if(duplicate) {
        console.log('DID is already added', id);
        return true;
      } else {
        return false;
      }
    }

    public getMnemonicLang(): DIDPlugin.MnemonicLanguage {
        return this.mnemonicLang;
    }

    public setMnemonicLang(lang: DIDPlugin.MnemonicLanguage) {
        this.mnemonicLang = lang;
    }

    nextStepId: number = 0;
    private navigateWithCompletion(route: string, completionCb: stepCompletionCallback, enterEventData?: any) {
        this.nextStepId++;

        let nextStep: NextStep = {
            id: this.nextStepId++,
            route: route,
            completionCb: completionCb
        };
        this.nextSteps.push(nextStep);

        let enterEvent: NavigateWithCompletionEnterData = {
            stepId: nextStep.id,
            data: enterEventData
        }

        this.navCtrl.navigateForward(route, {queryParams: {
            enterEvent: enterEvent
        }, state: {"toto":1}});
    }

    public runNextStep(nextStepId: number, data?: any) {
        let nextStep = this.nextSteps.find((step)=> step.id === nextStepId);
        if (nextStep) {
            console.log("Running next step, route:", nextStep.route);
            nextStep.completionCb(data);
        }
    }

    public isSignedInIdentity(identityEntry: IdentityEntry): boolean {
        if (!this.signedIdentity)
          return false;

        return this.signedIdentity.didString == identityEntry.didString
    }

    public async alertDuplicateImport() {
      const alert = await this.alertCtrl.create({
        mode: 'ios',
        header: this.translate.instant('id-already-added'),
        message: this.translate.instant('import-again'),
        buttons: [
          {
            text: this.translate.instant('import-again-cancel'),
            role: 'cancel',
            cssClass: 'secondary',
          }, {
            text: this.translate.instant('import-again-yes'),
            handler: () => {
              this.startImportingMnemonic(null);
            }
          }
        ]
      });

      await alert.present();
    }
}
