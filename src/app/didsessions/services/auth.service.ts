
import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CreatePasswordComponent } from '../components/createpassword/createpassword.component';
import { MnemonicPassCheckComponent } from '../components/mnemonicpasscheck/mnemonicpasscheck.component';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    public static instance: AuthService = null;

    constructor(public modalCtrl: ModalController) {
        AuthService.instance = this;
    }

    public promptNewPassword(changePassword = false): Promise<string> {
        console.log("Asking for new user password ");

        return new Promise(async (resolve, reject) => {
            const modal = await this.modalCtrl.create({
                component: CreatePasswordComponent,
                componentProps: {
                    changePassword: changePassword
                },
            });
            modal.onDidDismiss().then((params) => {
                console.log("AuthService got new password");

                if (!params.data)
                    resolve(null);
                else
                    resolve(params.data.password);
            });
            modal.present();
        })
    }

    /**
     * Asks user if he needs to use a mnemonic passphrase. If so, returns the input passphrase.
     * If none, returns null.
     */
    public promptMnemonicPassphrase(): Promise<string> {
        console.log("Asking for mnemonic passphrase");

        return new Promise(async (resolve, reject) => {
            const modal = await this.modalCtrl.create({
                component: MnemonicPassCheckComponent,
                componentProps: {
                },
                cssClass: "create-password-modal"
            });
            modal.onDidDismiss().then((params) => {
                if (!params.data)
                    resolve(null);
                else
                    resolve(params.data.password);
            });
            modal.present();
        })
    }
}
