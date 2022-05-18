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
import { LedgerGetAddressComponent, LedgerGetAddressComponentOptions } from '../components/ledger-getaddress/ledger-getaddress.component';
import { LedgerSignComponent, LedgerSignComponentOptions } from '../components/ledger-sign/ledger-sign.component';
import { ChooserWalletFilter, WalletChooserComponent, WalletChooserComponentOptions } from '../components/wallet-chooser/wallet-chooser.component';
import { LeddgerAccountType } from '../model/ledger.types';
import { MasterWallet } from '../model/masterwallets/masterwallet';
import { LedgerAccountOptions } from '../model/masterwallets/wallet.types';
import { AnyNetworkWallet } from '../model/networks/base/networkwallets/networkwallet';
import { Safe } from '../model/safes/safe';
import { WalletService } from './wallet.service';

export type PriorityNetworkChangeCallback = (newNetwork) => Promise<void>;

@Injectable({
    providedIn: 'root'
})
export class WalletUIService {
    public static instance: WalletUIService = null;

    constructor(
        private modalCtrl: ModalController,
        private walletService: WalletService,
        private theme: GlobalThemeService) {
        WalletUIService.instance = this;
    }

    /**
     * Lets user pick a wallet in the list of all available wallets.
     * Promise resolves after the wallet is chosen, or on cancellation
     */
    async chooseActiveWallet(): Promise<boolean> {
        let options: WalletChooserComponentOptions = {
            currentNetworkWallet: this.walletService.activeNetworkWallet.value,
            showActiveWallet: true
        };

        let modal = await this.modalCtrl.create({
            component: WalletChooserComponent,
            componentProps: options
        });

        return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
            modal.onWillDismiss().then(async (params) => {
                Logger.log('wallet', 'New wallet selected:', params);
                if (params.data && params.data.selectedMasterWalletId) {
                    let wallet = this.walletService.getNetworkWalletFromMasterWalletId(params.data.selectedMasterWalletId);

                    let masterWallet: MasterWallet;
                    if (!wallet)
                        masterWallet = this.walletService.getMasterWallet(params.data.selectedMasterWalletId);

                    void this.walletService.setActiveNetworkWallet(wallet, masterWallet);
                    resolve(true);
                }
                else
                    resolve(false);
            });
            void modal.present();
        });
    }

    /**
     * Lets the user choose a wallet from the list but without further action.
     * The selected wallet does not become the active wallet.
     */
    async pickWallet(filter?: ChooserWalletFilter): Promise<AnyNetworkWallet> {
        let options: WalletChooserComponentOptions = {
            currentNetworkWallet: this.walletService.activeNetworkWallet.value,
            filter,
            showActiveWallet: false
        };

        let modal = await this.modalCtrl.create({
            component: WalletChooserComponent,
            componentProps: options,
        });

        return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
            modal.onWillDismiss().then(async (params) => {
                Logger.log('wallet', 'Wallet selected:', params);
                if (params.data && params.data.selectedMasterWalletId) {
                    let wallet = this.walletService.getNetworkWalletFromMasterWalletId(params.data.selectedMasterWalletId);
                    resolve(wallet);
                }
                else
                    resolve(null);
            });
            void modal.present();
        });
    }

    /**
     *
     */
    async connectLedgerAndSignTransaction(deviceId: string, safe: Safe): Promise<boolean> {
        let options: LedgerSignComponentOptions = {
            deviceId: deviceId,
            safe: safe,
        };

        let modal = await this.modalCtrl.create({
            component: LedgerSignComponent,
            componentProps: options,
            backdropDismiss: false,
        });

        return new Promise(resolve => {
            void modal.onWillDismiss().then((params) => {
                if (params.data) {
                    resolve(params.data);
                }
                else
                    resolve(null);
            });
            void modal.present();
        });
    }

    async connectLedgerAndGetAddress(deviceId: string, accounType: LeddgerAccountType): Promise<LedgerAccountOptions> {
        let options: LedgerGetAddressComponentOptions = {
            deviceId: deviceId,
            accounType: accounType
        };

        let modal = await this.modalCtrl.create({
            component: LedgerGetAddressComponent,
            componentProps: options,
            backdropDismiss: false,
        });

        return new Promise(resolve => {
            void modal.onWillDismiss().then((params) => {
                if (params.data) {
                    resolve(params.data);
                }
                else
                    resolve(null);
            });
            void modal.present();
        });
    }
}


