import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';

declare let appManager: AppManagerPlugin.AppManager;

@Injectable({
  providedIn: 'root'
})
export class NativeService {

  private loader: HTMLIonLoadingElement = null;

  constructor(
    private translate: TranslateService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingCtrl: LoadingController,
    private zone: NgZone,
    private appManager: TemporaryAppManagerPlugin
  ) { }

  /********* Toasts *********/
  async genericToast(msg: string, duration: number = 3000) {
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'success',
      header: this.translate.instant(msg),
      duration: duration,
    });
    toast.present();
  }

  async shareToast() {
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'success',
      header: this.translate.instant('contact-copied'),
      duration: 3000,
      position: 'top'
    });
    toast.present();
  }

  async didResolveErr(err: string) {
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'success',
      header: this.translate.instant('resolve-error-header'),
      message: err,
      duration: 6000,
    });
    toast.present();
  }

  /********* Alerts *********/
  async alertNoContacts(intent: string, intentId: any, msg: string) {
    const alert = await this.alertController.create({
      mode: 'ios',
      header: msg,
      buttons: [
        {
          text: this.translate.instant('ok'),
          handler: () => {
            this.zone.run(() => {
                appManager.sendIntentResponse({}, intentId);
            });
          }
        }
      ]
    });
    alert.present();
  }

  public async showLoading(content: string = ''): Promise<void> {
    // Hide a previous loader in case there was one already.
    await this.hideLoading();
    const translatation = this.translate.instant(content);

    this.loader = await this.loadingCtrl.create({
      mode: 'ios',
      cssClass: 'loader',
      message: translatation
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
