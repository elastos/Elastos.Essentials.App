import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { WidgetState } from '../base/widgetcontainerstate';

@Injectable({
    providedIn: 'root'
})
export class WidgetsUIService {
    constructor(
        private modalCtrl: ModalController,
        private globalIntentService: GlobalIntentService
    ) {
    }

    /**
     * Lets user pick a widget in the list of all available widgets
     */
    public async selectWidget(): Promise<WidgetState> {
        let res: { result: { widgetState: WidgetState } } = await this.globalIntentService.sendIntent("https://essentials.elastos.net/picklauncherwidget", {});
        return res.result.widgetState;
    }
}