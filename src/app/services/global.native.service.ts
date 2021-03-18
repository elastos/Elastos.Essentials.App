import { Injectable } from '@angular/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { GlobalThemeService, AppTheme } from 'src/app/services/global.theme.service';

@Injectable({
  providedIn: 'root'
})

export class GlobalNativeService {
    public loader: HTMLIonLoadingElement = null;
    public alert = null;

    constructor(
      private toastCtrl: ToastController,
      private alertCtrl: AlertController,
      private loadingCtrl: LoadingController,
      private translate: TranslateService,
      private theme: GlobalThemeService,
      private clipboard: Clipboard,
    ) { }

    copyClipboard(text) {
        return this.clipboard.copy(text);
    }

    errToast(msg: string, duration: number = 3000) {
        const msgTranslated = this.translate.instant(msg);
        this.toastCtrl.create({
            mode: 'ios',
            header: msgTranslated,
            duration: duration,
            position: 'bottom',
            color: 'danger'
        }).then(toast => toast.present());
    }

    genericToast(msg: string, duration: number = 2000) {
      const translation = this.translate.instant(msg);
      this.toastCtrl.create({
          mode: 'ios',
          header: translation,
          duration: duration,
          position: 'bottom',
          color: 'primary'
      }).then(toast => toast.present());
    }

    toastWithTitle(header: string, msg: string, duration: number = 2000) {
        const translatedHeader = this.translate.instant(header)
        const translatedMsg = this.translate.instant(msg);
        this.toastCtrl.create({
            mode: 'ios',
            header: translatedHeader,
            message: translatedMsg,
            duration: duration,
            position: 'bottom',
            color: 'primary'
        }).then(toast => toast.present());
    }

    async genericAlert(msg: string, title?: string) {
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

        return await this.alert.present();
    }

    public async hideAlert() {
        if (this.alert) {
            await this.alert.dismiss();
            this.alert = null;
        }
    }

    public async showLoading(message: string = 'please-wait') {
        let isDarkMode = this.theme.activeTheme.value == AppTheme.DARK;
        await this.hideLoading();
        this.loader = await this.loadingCtrl.create({
            mode: 'ios',
            cssClass: !isDarkMode ? 'custom-loader-wrapper' : 'dark-custom-loader-wrapper',
            spinner: null,
            message: !isDarkMode ? '<div class="custom-loader"><div class="lds-dual-ring"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + this.translate.instant(message) + '</ion-label></div>' : '<div class="dark-custom-loader"><div class="dark-lds-dual-ring"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + this.translate.instant(message) + '</ion-label></div>',
            translucent: false,
        });
        this.loader.onWillDismiss().then(() => {
            this.loader = null;
        });

        return await this.loader.present();
    }

    public async hideLoading() {
        if (this.loader) {
            await this.loader.dismiss();
            this.loader = null;
        }
    }
}
