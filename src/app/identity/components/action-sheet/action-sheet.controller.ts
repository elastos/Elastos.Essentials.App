import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ActionSheetComponent } from './action-sheet.component';
import { IActionSheetConfig } from './action-sheet.config';


class ModalDialog {
  constructor(
    public config: IActionSheetConfig,
    private modalCtrl: ModalController
  ) {}

  async show() {
    const modal = await this.modalCtrl.create({
      component: ActionSheetComponent,
      componentProps: {
        config: this.config,
      },
      animated: false,
      cssClass: 'no-background',
    });
    modal.present();
  }
}

@Injectable({
  providedIn: 'root',
})
export class AppActionSheetController {
  constructor(public modalCtrl: ModalController) {}

  create(config: IActionSheetConfig): ModalDialog {
    return new ModalDialog(config, this.modalCtrl);
  }
}
