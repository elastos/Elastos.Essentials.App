import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WidgetChooserComponent } from '../base/widget-chooser/widget-chooser.component';
import { WidgetState } from '../base/widgetcontainerstate';

@Injectable({
    providedIn: 'root'
})
export class WidgetsUIService {
    constructor(
        private modalCtrl: ModalController,
        private theme: GlobalThemeService
    ) {
    }

    /**
     * Lets user pick a widget in the list of all available widgets
     */
    public async selectWidget(): Promise<WidgetState> {
        let modal = await this.modalCtrl.create({
            component: WidgetChooserComponent,
            componentProps: {},
        });

        return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
            modal.onWillDismiss().then(async (params) => {
                Logger.log('launcher', 'Widget picked:', params);
                if (params.data && params.data.widgetState) {
                    resolve(params.data.widgetState);
                }
                else
                    resolve(null);
            });
            void modal.present();
        });
    }
}