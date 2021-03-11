import { Injectable } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';

import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'modal-page',
  template: `
    <ion-app><ion-router-outlet [swipeGesture]="false"></ion-router-outlet></ion-app>
  `
})
export class ModalPage {
  constructor() {}
}


@Injectable({
  providedIn: 'root'
})
export class GlobalNavService {
    public loader: HTMLIonLoadingElement = null;
    public alert = null;

    constructor(
      private navCtrl: NavController,
      public modalController: ModalController,
      private router: Router
    ) { }

    async sendIntent() {
        // TODO: try to launch
       // this.navCtrl.navigateForward(route, options);

       const modal = await this.modalController.create({
            component: ModalPage,
            cssClass: 'my-custom-class'
        });
        await modal.present();

        setTimeout(() => {
            /*this.navCtrl.navigateRoot("/wallet/launcher", {

            });*/
            this.router.navigate([], {})
        }, 2000);

    }

    go(route: string, options?: any) {
       this.navCtrl.navigateForward(route, options);
    }
}
