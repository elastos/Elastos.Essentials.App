import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';


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
  async genericToast(msg: string, duration: number = 3000) {
    this.globalNative.genericToast(msg, duration, "success");
  }

  async shareToast() {
    this.globalNative.genericToast('contacts.contact-copied-to-clipboard', 3000, "success");
  }

  async didResolveErr(err: string) {
    this.globalNative.errToast('contacts.resolve-error-header', 6000);
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
          text: this.translate.instant('common.ok'),
          handler: () => {
            this.zone.run(() => {
                this.globalIntentService.sendIntentResponse({}, intentId);
            });
          }
        }
      ]
    });
    alert.present();
  }
}
