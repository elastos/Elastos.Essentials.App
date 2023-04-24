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

import { Injectable, NgZone } from '@angular/core';
import { LoadingController, PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';

@Injectable({
    providedIn: 'root'
})
export class Native {
    public static instance: Native;

    private loader: HTMLIonLoadingElement = null;
    public popup: any = null;
    private loadingCtrlCreating = false;

    constructor(
        private loadingCtrl: LoadingController,
        public popoverCtrl: PopoverController,
        private zone: NgZone,
        private globalNative: GlobalNativeService,
        private globalNav: GlobalNavService,
    ) {
        Native.instance = this;
    }

    public toast(msg = '', duration = 2000): void {
        this.globalNative.genericToast(msg, duration);
    }

    public toast_trans(msg = '', duration = 2000): void {
        this.globalNative.genericToast(msg, duration);
    }

    copyClipboard(text: string) {
        return this.globalNative.copyClipboard(text);
    }

    pasteFromClipboard() {
        return this.globalNative.pasteFromClipboard();
    }

    public go(page: string, options: any = {}) {
        Logger.log("wallet", "Navigating to:", page);
        this.zone.run(() => {
            void this.hideLoading();
            void this.globalNav.navigateTo(App.WALLET, page, { state: options });
        });
    }

    public pop() {
        void this.globalNav.navigateBack();
    }

    public openUrl(url: string) {
        Logger.warn("wallet", "openUrl(): Not implemented any more");
    }

    public setRootRouter(page: any, options: any = {}) {
        Logger.log("wallet", "Setting root router path to:", page);
        this.zone.run(() => {
            void this.hideLoading();
            void this.globalNav.navigateRoot(App.WALLET, page, { state: options });
        });
    }

    public async showLoading(content = ''): Promise<void> {
        if (this.loadingCtrlCreating) {// Just in case.
            Logger.log("wallet", 'loadingCtrl is preparing, skip')
            return;
        }

        this.loadingCtrlCreating = true;

        // Hide a previous loader in case there was one already.
        await this.hideLoading();
        this.loader = await this.loadingCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-loader',
            message: content
        });
        void this.loader.onWillDismiss().then(() => {
            this.loader = null;
        });

        this.loadingCtrlCreating = false;
        return await this.loader.present();
    }

    public async hideLoading(): Promise<void> {
        if (this.loader) {
            await this.loader.dismiss();
            this.loader = null;
        }
    }
}


