import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DIDHelper } from 'src/app/helpers/did.helper';
import { Logger } from 'src/app/logger';
import { PasswordManagerCancellationException } from 'src/app/model/exceptions/passwordmanagercancellationexception';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPasswordService } from 'src/app/services/global.password.service';
import { DIDService } from './did.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    public static instance: AuthService = null;
    private unlockedDidStorePassword: string = null;

    constructor(public modalCtrl: ModalController,
        private didService: DIDService,
        private globalPasswordService: GlobalPasswordService) {
        AuthService.instance = this;
    }

    getCurrentUserPassword(): string {
        return this.unlockedDidStorePassword;
    }

    /**
     * Gets DID store password then execute the given code.
     *
     * Resolves when the target write action was fully executed, or when cancelled.
     *
     * @param showMasterPromptIfDatabaseLocked If false, this function will silently fail and return a cancellation, in case the master password was locked.
     */
    public checkPasswordThenExecute(writeActionCb: () => Promise<void>, onCancelled: () => void, showMasterPromptIfDatabaseLocked = true, forceShowMasterPrompt = false, did = this.didService.getActiveDidStore().getId()): Promise<void> {
        // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
        return new Promise<void>(async (resolve, reject) => {
            try {
                let options: PasswordManagerPlugin.GetPasswordInfoOptions = {
                    promptPasswordIfLocked: showMasterPromptIfDatabaseLocked,
                    forceMasterPasswordPrompt: forceShowMasterPrompt
                };

                let passwordInfo = await this.globalPasswordService.getPasswordInfo("didstore-" + did, options) as PasswordManagerPlugin.GenericPasswordInfo;
                if (!passwordInfo) {
                    // Master password is right, but no data for the requested key...
                    Logger.error('identity', "Master password was right, but no password found for the requested key")

                    // TODO - COMMENTED OUT TEMPORARILY AS IT SHOWS TOO OFTEN - @zhiming TO CHECK WHAT IS HAPPENING - this.popupProvider.ionicAlert("Password error", "Impossible to retrieve your identity store password from your master password. Please try to import your identity again.");
                    onCancelled();
                    resolve();
                }
                else {
                    // Master password was unlocked and found
                    this.unlockedDidStorePassword = passwordInfo.password;
                    await writeActionCb();
                    resolve();
                }
            }
            catch (e) {
                let reworkedError = DIDHelper.reworkedPluginException(e);
                if (reworkedError instanceof PasswordManagerCancellationException) {
                    // Nothing to do, just stop the flow here.
                    onCancelled();
                    resolve();
                }
                else {
                    if (e && e.message) {
                        GlobalNativeService.instance.genericToast(e.message, 3000);
                    }
                    onCancelled();
                    resolve();
                    // reject(reworkedError);
                }
            }
        });
    }
}

export type ChooseIdentityOptions = {
    redirectPath: string;
}
