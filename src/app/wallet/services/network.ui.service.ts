/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NetworkChooserComponent, NetworkChooserComponentOptions } from '../components/network-chooser/network-chooser.component';
import { WalletNetworkService } from './network.service';

export type PriorityNetworkChangeCallback = (newNetwork) => Promise<void>;

@Injectable({
    providedIn: 'root'
})
export class WalletNetworkUIService {
    public static instance: WalletNetworkUIService = null;

    constructor(
        private modalCtrl: ModalController,
        private networkService: WalletNetworkService,
        private theme: GlobalThemeService) {
        WalletNetworkUIService.instance = this;
    }

    /**
     * Lets user pick a network in the list of all available networks.
     * Promise resolves when a new network is chosen or when cancelled.
     */
    async chooseActiveNetwork(): Promise<boolean> {
        let options: NetworkChooserComponentOptions = {
            currentNetwork: this.networkService.activeNetwork.value
        };

        let modal = await this.modalCtrl.create({
            component: NetworkChooserComponent,
            componentProps: options,
        });

        return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
            modal.onWillDismiss().then(async (params) => {
                Logger.log('wallet', 'New network selected:', params);
                if (params.data && params.data.selectedNetworkKey) {
                    void this.networkService.setActiveNetwork(this.networkService.getNetworkByKey(params.data.selectedNetworkKey));
                    resolve(true);
                }
                else
                    resolve(false);
            });
            void modal.present();
        });
    }
}


