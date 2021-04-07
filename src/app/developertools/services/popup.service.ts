import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class PopupService {
  private loader;

  constructor(private loadingController: LoadingController) {}

  public async showLoading(message: string): Promise<void> {
    this.loader = await this.loadingController.create({
      mode: 'ios',
      cssClass: 'custom-loader-wrapper',
      spinner: null,
      message: '<div class="custom-loader"><div class="lds-dual-ring"><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + message +' </ion-label></div>'
    });
    this.loader.onWillDismiss().then(() => {
      this.loader = null;
    })
    await this.loader.present();
    return this.loader;
  }

  public hideLoading(): void {
    if(this.loader) {
      this.loader.dismiss();
    }
  }
}