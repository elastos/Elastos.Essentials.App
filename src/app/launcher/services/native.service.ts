import { Injectable } from '@angular/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService, AppTheme } from 'src/app/services/global.theme.service';

@Injectable({
  providedIn: 'root'
})
export class NativeService {
  public loader = null;
  public alert = null;

  constructor(
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
    private theme: GlobalThemeService
  ) { }

  appStartErrToast() {
    this.toastCtrl.create({
        mode: 'ios',
        header: 'Something went wrong',
        message: 'Can\'t start app at this time, please try again',
        color: 'success',
        duration: 4000,
        position: 'bottom'
    }).then(toast => toast.present());
  }

  genericToast(msg: string, duration: number = 1000) {
    const translation = this.translate.instant(msg);
    this.toastCtrl.create({
        mode: 'ios',
        header: translation,
        color: 'success',
        duration: duration,
        position: 'bottom'
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

  public async hideAlert() {
    if (this.alert) {
      await this.alert.dismiss();
      this.alert = null;
    }
  }

  print_err(err: string) {
    console.log("ElastosJS  Error: " + err);
  }
}
