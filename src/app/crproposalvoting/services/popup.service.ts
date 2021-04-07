import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable()
export class PopupService {
    constructor(public alertCtrl: AlertController) {}

    public alert(title: string, message: string, okText: string): Promise<void> {
        return new Promise(async (resolve) => {
            let alert = await this.alertCtrl.create({
                header : title,
                subHeader: message,
                backdropDismiss: false,
                buttons: [{
                    text: okText,
                    handler: () => {
                        resolve();
                    }
                }]
            });
            alert.present();
        });
    };
}
