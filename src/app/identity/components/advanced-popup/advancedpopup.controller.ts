
import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AdvancedPopupComponent } from './advancedpopup.component';
import { AdvancedPopupConfig } from './advancedpopupconfig.model';

class AdvancedPopup {
    constructor(public config: AdvancedPopupConfig, private modalCtrl: ModalController) {
    }
    
    async show() {
        let modal = await this.modalCtrl.create({
            component: AdvancedPopupComponent,
            componentProps: {
                config: this.config
            },
            animated: false,
            cssClass:"no-background"
        })

        modal.present();
    }
}

@Injectable({
    providedIn: 'root'
})
export class AdvancedPopupController {
    constructor(public modalCtrl: ModalController) {
    }

    create(config: AdvancedPopupConfig): AdvancedPopup {
        return new AdvancedPopup(config, this.modalCtrl);
    }
}