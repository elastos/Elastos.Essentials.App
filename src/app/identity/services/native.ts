import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { isString } from 'lodash-es';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';

@Injectable({
  providedIn: 'root'
})
export class Native {
  private mnemonicLang: DIDPlugin.MnemonicLanguage = "ENGLISH";
  private loader: any = null;

  constructor(
    private translate: TranslateService,
    private native: GlobalNativeService,
    private nav: GlobalNavService
  ) {
  }

  public log(message: any, type: string): void {
    // if (Config.isDebug) {
    let msg = type + ": " + (isString(message) ? message : JSON.stringify(message));
    Logger.log('Identity', msg);
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

  public toast(msg = '操作完成', duration = 2000): void {
    this.native.genericToast(msg, duration);
  }

  public toast_trans(msg = '', duration = 2000): void {
    this.native.genericToast(msg, duration);
  }

  copyClipboard(text) {
    return this.native.copyClipboard(text);
  }

  // Sensitive data should not be passed through queryParams
  public async go(page: any, options: any = {}) {
    Logger.log('Identity', "NAV - Going to " + page);
    await this.hideLoading();
    await this.nav.navigateTo(App.IDENTITY, page, { state: options });
  }

  public pop() {
    void this.nav.navigateBack();
  }

  public async setRootRouter(page: any, options: any = {}) {
    Logger.log('Identity', "NAV - Setting root to " + page);
    await this.hideLoading();
    await this.nav.navigateRoot(App.IDENTITY, page, { state: options });
  }

  public getMnemonicLang(): DIDPlugin.MnemonicLanguage {
    return this.mnemonicLang;
  }

  public setMnemonicLang(lang: DIDPlugin.MnemonicLanguage) {
    this.mnemonicLang = lang;
  }

  public async showLoading(content = 'common.please-wait') {
    await this.native.showLoading(content);
  }

  public async hideLoading() {
    await this.native.hideLoading();
  }
}


