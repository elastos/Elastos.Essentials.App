
import { Injectable, NgZone } from '@angular/core';
import { ToastController, LoadingController, NavController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';

import * as _ from 'lodash';
import { AppActionSheetController } from '../components/action-sheet/action-sheet.controller';
import { IActionSheetButtonConfig } from '../components/action-sheet/action-sheet.config';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Injectable({
    providedIn: 'root'
})
export class Native {
  private mnemonicLang: DIDPlugin.MnemonicLanguage = DIDPlugin.MnemonicLanguage.ENGLISH;
  private loader: any = null;

  constructor(
      private toastCtrl: ToastController,
      private alertCtrl: AlertController,
      private clipboard: Clipboard,
      private translate: TranslateService,
      private loadingCtrl: LoadingController,
      private navCtrl: NavController,
      private actionSheetCtrl: AppActionSheetController,
      private zone: NgZone,
      private router: Router,
      private theme: GlobalThemeService
  ) {
  }

  public log(message: any, type: string): void {
    // if (Config.isDebug) {
      let msg = type +  ": " + (_.isString(message) ? message : JSON.stringify(message));
      console.log(msg);
    // }
  }

  public info(message) {
      this.log(message, "Info");
  }

  public error(message) {
      this.log(message, "Error");
  }

  public warnning(message) {
      this.log(message, "Warnning");
  }

  public toast(_message: string = '操作完成', duration: number = 2000): void {
      this.toastCtrl.create({
          mode: 'ios',
          header: _message,
          duration: duration,
          position: 'top',
          color: 'success'
      }).then(toast => toast.present());
  }

  public toast_trans(_message: string = '', duration: number = 2000): void {
      _message = this.translate.instant(_message);
      this.toastCtrl.create({
          mode: 'ios',
          header: _message,
          duration: duration,
          position: 'top',
          color: 'success'
      }).then(toast => toast.present());
  }

  copyClipboard(text) {
      return this.clipboard.copy(text);
  }

  // Sensitive data should not be passed through queryParams
  public go(page: any, options: any = {}) {
    console.log("NAV - Going to "+page);
    this.zone.run(()=>{
        this.hideLoading();
        this.navCtrl.navigateForward([page], { state: options });
    });
  }

  public pop() {
      this.navCtrl.pop();
  }

  public setRootRouter(page: any,  options: any = {}) {
    console.log("NAV - Setting root to "+page);
      this.zone.run(()=>{
        this.hideLoading();
        this.navCtrl.navigateRoot([page], { state: options });
      });
  }

  public getMnemonicLang(): DIDPlugin.MnemonicLanguage {
      return this.mnemonicLang;
  }

  public setMnemonicLang(lang: DIDPlugin.MnemonicLanguage) {
      this.mnemonicLang = lang;
  }

  public clone(Obj) {
      if (typeof (Obj) != 'object') return Obj;
      if (Obj == null) return Obj;

      let newObj;

      if (Obj instanceof (Array)) {
          newObj = new Array();
      } else {
          newObj = new Object();
      }

      for (let i in Obj)
          newObj[i] = this.clone(Obj[i]);

      return newObj;
  }

  public async showActionSheet(
    buttons: IActionSheetButtonConfig[],
    showCancelButton: boolean = true,
    callbackCancel: () => void = () => {})
  {
    console.log("Show action sheet")
    await this.actionSheetCtrl.create({
      buttons: buttons,
      showCancelButton: showCancelButton,
      cancelCallback: callbackCancel
    }).show();
  }

  public async showLoading(content: string = 'please-wait') {
    content = this.translate.instant(content);
    this.loader = await this.loadingCtrl.create({
      mode: 'ios',
      spinner: 'crescent',
      cssClass: !this.theme.darkMode ? 'loader' : 'darkLoader',
      message: content,
      duration: 10000
    });
    this.loader.onWillDismiss().then(() => {
      this.loader = null;
    })
    return await this.loader.present();
  };

  public hideLoading(): void {
    if(this.loader) {
      this.loader.dismiss();
    }
  };

  public getTimestamp() {
      return new Date().getTime().toString();
  }
}


