import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { GlobalNativeService } from 'src/app/services/global.native.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Injectable({
  providedIn: 'root'
})
export class NativeService {

  constructor(
    private translate: TranslateService,
    private alertController: AlertController,
    private zone: NgZone,
    private essentialsIntent: TemporaryAppManagerPlugin,
    private globalNative: GlobalNativeService
  ) { }

  /********* Toasts *********/
  async genericToast(msg: string, duration: number = 3000) {
    this.globalNative.genericToast(msg, duration)
  }

  async shareToast() {
    this.globalNative.genericToast(this.translate.instant('contact-copied'), 3000);
  }

  async didResolveErr(err: string) {
    this.globalNative.errToast(this.translate.instant('resolve-error-header'), 6000);
  }

  /********* Loader *********/
  public async showLoading(content: string = ''): Promise<void> {
    await this.globalNative.hideLoading();
    this.globalNative.showLoading(content);
  }

  public async hideLoading() {
    await this.globalNative.hideLoading();
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
                essentialsIntent.sendIntentResponse({}, intentId);
            });
          }
        }
      ]
    });
    alert.present();
  }
}
