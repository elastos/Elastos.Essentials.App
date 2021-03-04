import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController, NavParams, IonInput } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Config } from '../../config/Config';
import { Native } from '../../services/native.service';
import { PopupProvider} from '../../services/popup.service';
import { WalletManager } from '../../services/wallet.service';

@Component({
    selector: 'app-paymentbox',
    templateUrl: './paymentbox.component.html',
    styleUrls: ['./paymentbox.component.scss'],
})
export class PaymentboxComponent implements OnInit {
    @ViewChild('pwd', { static: true }) pwd: IonInput;

    public SELA = Config.SELA;
    public toAddress = '';
    public walltype = false;
    public transfer: any = {
        toAddress: '',
        amount: '',
        memo: '',
        fee: 0,
        rate: ''
    };

    private walletId = '';
    /*public useFingerprintAuthentication = false;
    public fingerprintPluginAuthenticationOnGoing = false;
    public fingerprintAuthenticationIsAvailable = false;*/

    constructor(
        public route: ActivatedRoute,
        public modalCtrl: ModalController,
        public navParams: NavParams,
        private authService: AuthService,
        public popupProvider: PopupProvider,
        private walletManager: WalletManager,
        public native: Native
    ) {
        // TODO delete this?
        // this.walletId = this.walletManager.getCurMasterWalletId();
        const accountObj = this.walletManager.getMasterWallet(this.walletId).account.Type;
        if (accountObj["Type"] === "Multi-Sign" && accountObj["InnerType"] === "Readonly") {
            this.walltype = false;
        } else {
            this.walltype = true;
        }

        this.transfer = this.navParams.data;
        if (this.transfer["rate"]) {
            this.toAddress = this.transfer["accounts"];
        } else {
            this.toAddress = this.transfer["toAddress"] ? this.transfer["toAddress"] : '';
        }
    }

    ngOnInit() {
    }

    async ionViewWillEnter() {
        this.transfer.payPassword = '';
        /*this.fingerprintAuthenticationIsAvailable = await this.authService.fingerprintIsAvailable();
        if (this.fingerprintAuthenticationIsAvailable) {
            this.useFingerprintAuthentication = await this.authService.fingerprintAuthenticationEnabled(this.walletId);
        } else {
            this.useFingerprintAuthentication = false;
        }*/
    }

    ionViewDidEnter() {
    }

    click_close() {
        this.modalCtrl.dismiss(null);
    }

    async click_button() {
        if (!this.walltype) {
            this.modalCtrl.dismiss(this.transfer);
            return;
        }

        try {
            // Force password prompt for payments
            let password = await this.authService.getWalletPassword(this.walletId, true, true);
            if (password) {
                this.modalCtrl.dismiss(password);
            }
            else {
                // TODO: show "wrong password" / or cancelled or set password?
                // let passwordInfo: PasswordManagerPlugin.GenericPasswordInfo = {
                //     type: PasswordManagerPlugin.PasswordType.GENERIC_PASSWORD,
                //     key: "wallet-"+this.walletId,
                //     displayName: "Wallet password",
                //     password: '12345678',
                //     // TODO: visible: false
                // }
                // let result = await passwordManager.setPasswordInfo(passwordInfo);
            }
        }
        catch (e) {
            console.error('PaymentboxComponent getWalletPassword error:' + e);
        }
    }

    /*promptFingerprintActivation() {
        this.popupProvider.ionicConfirm('confirmTitle', 'activate-fingerprint-popup-content').then(async (data) => {
            if (data) {
                this.fingerprintPluginAuthenticationOnGoing = true;

                // User agreed to activate fingerprint authentication. We ask the auth service to
                // save the typed password securely using the fingerprint.
                const couldActivate = await this.authService.activateFingerprintAuthentication(this.walletId, this.transfer.payPassword);
                this.useFingerprintAuthentication = couldActivate;
                this.fingerprintPluginAuthenticationOnGoing = false;
                if (couldActivate) {
                    this.click_button();
                } else {
                    // Failed to activate
                    console.log('activateFingerprintAuthentication  error');
                }
            }
        });
    }

    async promptFingerprintAuthentication() {
        this.fingerprintPluginAuthenticationOnGoing = true;
        this.transfer.payPassword = await this.authService.authenticateByFingerprintAndGetPassword(this.walletId);
        this.fingerprintPluginAuthenticationOnGoing = false;
        if (this.transfer.payPassword) {
            this.click_button();
        } else {
            console.log('authenticateByFingerprintAndGetPassword  error');
        }
    }

    async disableFingerprintAuthentication() {
        this.useFingerprintAuthentication = false;
        await this.authService.deactivateFingerprintAuthentication(this.walletId);
    }

    canPromptFingerprint() {
        return (this.transfer.payPassword !== '') && this.fingerprintAuthenticationIsAvailable;
    }*/
}
