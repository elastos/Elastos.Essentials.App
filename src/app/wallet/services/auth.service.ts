
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPasswordService } from 'src/app/services/global.password.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    public static instance: AuthService = null;

    constructor(private globalPasswordService: GlobalPasswordService) {
        AuthService.instance = this;
    }

    public async createAndSaveWalletPassword(walletId: string): Promise<string> {
        const passwordKey = "wallet-" + walletId;
        let oldPassword = await this.globalPasswordService.getPasswordInfo(passwordKey) as PasswordManagerPlugin.GenericPasswordInfo;
        if (oldPassword) { // In case of user click 'createMasterwallet' too quickly.
            return oldPassword.password;
        }

        let password = await this.globalPasswordService.generateRandomPassword();

        return this.saveWalletPassword(walletId, password);
    }

    public async saveWalletPassword(walletId: string, payPassword: string): Promise<string> {
        const passwordKey = "wallet-" + walletId;

        // Save the did store password with a master password
        let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
            type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
            key: passwordKey,
            displayName: "Wallet password",
            password: payPassword,
            // TODO: visible: false
        }
        let result = await this.globalPasswordService.setPasswordInfo(passwordInfo);
        if (result.value) {
            // Master password was created and wallet password could be saved
            return payPassword;
        }
        else {
            // Cancellation, or failure
            return null;
        }
    }

    // eslint-disable-next-line require-await
    public async getWalletPassword(walletId: string, showMasterPromptIfDatabaseLocked = true, forceShowMasterPrompt = false): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                let options: PasswordManagerPlugin.GetPasswordInfoOptions = {
                    promptPasswordIfLocked: showMasterPromptIfDatabaseLocked,
                    forceMasterPasswordPrompt: forceShowMasterPrompt
                };
                let key = "wallet-" + walletId;
                let passwordInfo = await this.globalPasswordService.getPasswordInfo(key, options) as PasswordManagerPlugin.GenericPasswordInfo;
                if (!passwordInfo) {
                    // Master password is right, but no data for the requested key...
                    Logger.log('wallet', "Master password was right, but no password found for the requested key", key);
                    // In case of: return undefined if the password is missing. so user can delete the useless wallet.
                    resolve(undefined);
                }
                else {
                    // Master password was unlocked and found
                    resolve(passwordInfo.password);
                }
            }
            catch (e) {
                Logger.error('wallet', 'getWalletPassword error ', e);
                if (e && e.message) {
                    if (!e.message.includes('MasterPasswordCancellation') && !e.message.includes('BIOMETRIC_PIN_OR_PATTERN_DISMISSED')) {
                        GlobalNativeService.instance.genericToast(e.message, 3000);
                    }
                }
                resolve(null);
            }
        });
    }

    public deleteWalletPassword(walletId: string): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise<string>(async (resolve, reject) => {
            try {
                const resultInfo = await this.globalPasswordService.deletePasswordInfo("wallet-" + walletId) as PasswordManagerPlugin.BooleanWithReason;
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
