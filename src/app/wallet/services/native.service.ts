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
import { HelpComponent } from '../components/help/help.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum"

@Injectable()
export class Native {

    private loader: HTMLIonLoadingElement = null;
    public popup: any = null;
    private loadingCtrlCreating = false;

    constructor(
        private loadingCtrl: LoadingController,
        public popoverCtrl: PopoverController,
        private zone: NgZone,
        private globalNative: GlobalNativeService,
        private globalNav: GlobalNavService,
    ) {}

    public toast(msg: string = '操作完成', duration: number = 2000): void {
        this.globalNative.genericToast(msg, duration);
    }

    public toast_trans(msg: string = '', duration: number = 2000): void {
        this.globalNative.genericToast(msg, duration);
    }

    copyClipboard(text) {
        return this.globalNative.copyClipboard(text);
    }

    pasteFromClipboard() {
      return this.globalNative.pasteFromClipboard();
    }

    public go(page: string, options: any = {}) {
        Logger.log("wallet", "Navigating to:", page);
        this.zone.run(() => {
            this.hideLoading();
            this.globalNav.navigateTo(App.WALLET, page, { state: options });
        });
    }

    public pop() {
        this.globalNav.navigateBack();
    }

    public openUrl(url: string) {
      Logger.warn("wallet", "openUrl(): Not implemented any more");
    }

    public setRootRouter(page: any,  options: any = {}) {
        Logger.log("wallet", "Setting root router path to:", page);
        this.zone.run(() => {
            this.hideLoading();
            this.globalNav.navigateRoot(App.WALLET, page, { state: options });
        });
    }

    public clone(myObj) {
        if (typeof (myObj) != 'object') return myObj;
        if (myObj == null) return myObj;

        let myNewObj;

        if (myObj instanceof (Array)) {
            myNewObj = new Array();
        } else {
            myNewObj = new Object();
        }

        for (let i in myObj)
            myNewObj[i] = this.clone(myObj[i]);

        return myNewObj;
    }

    public async showLoading(content: string = ''): Promise<void> {
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
        this.loader.onWillDismiss().then(() => {
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

    public async showHelp(ev: any, helpMessage: string) {
        this.popup = await this.popoverCtrl.create({
          mode: 'ios',
          component: HelpComponent,
          cssClass: 'wallet-help-component',
          event: ev,
          componentProps: {
            message: helpMessage
          },
          translucent: false
        });
        this.popup.onWillDismiss().then(() => {
            this.popup = null;
        });
        return await this.popup.present();
    }
}


