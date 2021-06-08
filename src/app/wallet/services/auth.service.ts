
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { LocalStorage } from './storage.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';

declare let passwordManager: PasswordManagerPlugin.PasswordManager;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    public static instance: AuthService = null;

    constructor(private storage: LocalStorage, private native: GlobalNativeService) {
        AuthService.instance = this;
    }

    public async createAndSaveWalletPassword(walletId: string): Promise<string> {
        const passwordKey = "wallet-"+walletId;
        let oldPassword = await passwordManager.getPasswordInfo(passwordKey) as PasswordManagerPlugin.GenericPasswordInfo;
        if (oldPassword) { // In case of user click 'createMasterwallet' too quickly.
          return oldPassword.password;
        }

        let password = await passwordManager.generateRandomPassword();

        // Save the did store password with a master password
        let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
            type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
            key: passwordKey,
            displayName: "Wallet password",
            password: password,
            // TODO: visible: false
        }
        let result = await passwordManager.setPasswordInfo(passwordInfo);
        if (result.value) {
            // Master password was created and wallet password could be saved
            return password;
        }
        else {
            // Cancellation, or failure
            return null;
        }
    }

    public async getWalletPassword(walletId: string, showMasterPromptIfDatabaseLocked = true, forceShowMasterPrompt = false): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                let options: PasswordManagerPlugin.GetPasswordInfoOptions = {
                    promptPasswordIfLocked: showMasterPromptIfDatabaseLocked,
                    forceMasterPasswordPrompt: forceShowMasterPrompt
                };
                let passwordInfo = await passwordManager.getPasswordInfo("wallet-"+walletId, options) as PasswordManagerPlugin.GenericPasswordInfo;
                if (!passwordInfo) {
                    // Master password is right, but no data for the requested key...
                    Logger.log('wallet', "Master password was right, but no password found for the requested key")

                    resolve(null);
                }
                else {
                    // Master password was unlocked and found
                    resolve(passwordInfo.password);
                }
            }
            catch (e) {
                Logger.error('wallet', e);
                // TODO: better handle various kind of errors
                resolve(null);
            }
        });
    }

    public deleteWalletPassword(walletId: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            try {
                const resultInfo = await passwordManager.deletePasswordInfo("wallet-"+walletId) as PasswordManagerPlugin.BooleanWithReason;
                if (resultInfo) {
                    if (resultInfo.value) {
                        resolve(null);
                    } else {
                        Logger.error('wallet', 'deletePasswordInfo error:', resultInfo.reason);
                        reject(resultInfo.reason);
                    }
                } else {
                    resolve(null);
                }
            } catch (e) {
                Logger.error('wallet', e);
                // TODO: better handle various kind of errors
                reject();
            }
        });
    }

    /**
     * Activates fingerprint authentication instead of using a password.
     */
    /*async activateFingerprintAuthentication(walletID: string, password: string): Promise<boolean> {
        Logger.log('wallet', 'Activating fingerprint authentication for did store id ' + walletID);

        // Ask the fingerprint plugin to save user's password
        try {
            await fingerprintManager.authenticateAndSavePassword(walletID, password);
            // Password was securely saved. Now remember this user's choice in settings.
            await this.storage.set('useFingerprintAuthentication-' + walletID, true);
            return true;
        } catch (e) {
            Logger.log('wallet', 'authenticateAndSavePassword eror ', e);
            return false;
        }
    }

    async deactivateFingerprintAuthentication(walletID: string) {
        await this.storage.set('useFingerprintAuthentication-' + walletID, false);
    }

    async authenticateByFingerprintAndGetPassword(didStoreId: string) {
        // Ask the fingerprint plugin to authenticate and retrieve the password
        try {
            const password = await fingerprintManager.authenticateAndGetPassword(didStoreId);
            return password;
        } catch (e) {
            return null;
        }
    }

    async fingerprintAuthenticationEnabled(walletID: string): Promise<boolean> {
        return this.storage.get('useFingerprintAuthentication-' + walletID) || false;
    }

    async fingerprintIsAvailable() {
        try {
            let isAvailable = await fingerprintManager.isBiometricAuthenticationMethodAvailable();
            return isAvailable;
        } catch (e) {
            return false;
        }
    }*/
}
