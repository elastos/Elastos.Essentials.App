import { Injectable } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { MenuSheetComponent, MenuSheetMenu } from '../components/menu-sheet/menu-sheet.component';

@Injectable({
    providedIn: 'root'
})

export class GlobalNativeService {
    public static instance: GlobalNativeService;

    public loader: HTMLIonLoadingElement = null;
    public alert = null;
    private alertCtrlCreating = false;
    private loadingCtrlCreating = false;

    constructor(
        private toastCtrl: ToastController,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController,
        private translate: TranslateService,
        private theme: GlobalThemeService,
        private modalCtrl: ModalController,
        private clipboard: Clipboard,
    ) {
        GlobalNativeService.instance = this;
    }

    copyClipboard(text) {
        return this.clipboard.copy(text);
    }

    pasteFromClipboard() {
        return this.clipboard.paste();
    }

    errToast(msg: string, duration = 3000) {
        const msgTranslated = this.translate.instant(msg);
        void this.toastCtrl.create({
            mode: 'ios',
            header: msgTranslated,
            duration: duration,
            position: 'bottom',
            color: 'danger'
        }).then(toast => toast.present());
    }

    genericToast(msg: string, duration = 2000, color = "primary") {
        const translation = this.translate.instant(msg);
        void this.toastCtrl.create({
            mode: 'ios',
            header: translation,
            duration: duration,
            position: 'bottom',
            color: color
        }).then(toast => toast.present());
    }

    toastWithTitle(header: string, msg: string, duration = 2000, color = "primary") {
        const translatedHeader = this.translate.instant(header)
        const translatedMsg = this.translate.instant(msg);
        void this.toastCtrl.create({
            mode: 'ios',
            header: translatedHeader,
            message: translatedMsg,
            duration: duration,
            position: 'bottom',
            color: color
        }).then(toast => toast.present());
    }

    async genericAlert(msg: string, title?: string, skipIfAlreadyPopup = false) {
        if (skipIfAlreadyPopup && (this.alert || this.alertCtrlCreating)) {
            return;
        }

        this.alertCtrlCreating = true;
        await this.hideAlert();
        this.alert = await this.alertCtrl.create({
            mode: 'ios',
            header: title ? this.translate.instant(title) : null,
            message: this.translate.instant(msg),
            cssClass: 'custom-alert',
            buttons: ['OK'],
        });
        this.alert.onWillDismiss().then(() => {
            this.alert = null;
        });
        this.alertCtrlCreating = false;
        return await this.alert.present();
    }

    public async hideAlert() {
        if (this.alert) {
            await this.alert.dismiss();
            this.alert = null;
        }
    }

    public async showLoading(message = 'common.please-wait') {
        let isDarkMode = this.theme.activeTheme.value == AppTheme.DARK;
        if (this.loadingCtrlCreating) { // Just in case.
            return;
        }
        await this.hideLoading();
        this.loadingCtrlCreating = true;
        this.loader = await this.loadingCtrl.create({
            mode: 'ios',
            translucent: false,
            spinner: 'crescent',
            cssClass: !isDarkMode ? 'custom-loader' : 'dark-custom-loader',
            message: this.translate.instant(message)
            // cssClass: !isDarkMode ? 'custom-loader-wrapper' : 'dark-custom-loader-wrapper',
            // message: !isDarkMode ? '<div class="custom-loader"><div class="lds-dual-ring"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + this.translate.instant(message) + '</ion-label></div>' : '<div class="dark-custom-loader"><div class="dark-lds-dual-ring"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + this.translate.instant(message) + '</ion-label></div>',
        });
        void this.loader.onWillDismiss().then(() => {
            this.loader = null;
        });
        this.loadingCtrlCreating = false;
        return await this.loader.present();
    }

    public async hideLoading() {
        if (this.loader) {
            await this.loader.dismiss();
            this.loader = null;
        }
    }

    /**
     * Shows a generic bottom sheet component that can display menus and sub-menus to finally
     * pick one option in the menus.
     */
    public async showGenericBottomSheetMenuChooser(menu: MenuSheetMenu): Promise<void> {
        const modal = await this.modalCtrl.create({
            component: MenuSheetComponent,
            componentProps: {
                menu
            },
            backdropDismiss: true, // Closeable
            cssClass: !this.theme.darkMode ? "switch-network-component switch-network-component-base" : 'switch-network-component-dark switch-network-component-base'
        });

        void modal.onDidDismiss().then((response: { data?: boolean }) => {
        });

        void modal.present();
    }
}
