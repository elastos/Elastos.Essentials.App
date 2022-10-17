import { Injectable, NgZone } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';


@Injectable({
  providedIn: 'root'
})
export class NativeService {

  constructor(
    private translate: TranslateService,
    private alertController: AlertController,
    private zone: NgZone,
    private globalIntentService: GlobalIntentService,
    private globalNative: GlobalNativeService
  ) { }

  /********* Toasts *********/
  genericToast(msg: string, duration = 3000) {
    this.globalNative.genericToast(msg, duration);
  }

  shareToast() {
    this.globalNative.genericToast('contacts.contact-copied-to-clipboard', 3000);
  }

  didResolveErr(err: string) {
    this.globalNative.errToast('contacts.resolve-error-header', 6000);
  }

  /********* Loader *********/
  public async showLoading(content = ''): Promise<void> {
    await this.globalNative.hideLoading();
    await this.globalNative.showLoading(content);
  }

  public async hideLoading() {
    await this.globalNative.hideLoading();
  }

  /********* Alerts *********/
  async alertNoContactsAndSendIntentResponse(intentId: any, msg: string) {
    const alert = await this.alertController.create({
      mode: 'ios',
      header: msg,
      buttons: [
        {
          text: this.translate.instant('common.ok'),
          handler: () => {
            this.zone.run(() => {
              void this.globalIntentService.sendIntentResponse({}, intentId);
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
