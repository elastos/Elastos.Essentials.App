import { Component, ViewChild } from '@angular/core';
import { DAppService } from '../../services/dapp.service';
import { CreatedDApp } from '../../model/customtypes';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem, TitleBarIconSlot, BuiltInIcon, TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { TranslateService } from '@ngx-translate/core';
import { GlobalNativeService } from 'src/app/services/global.native.service';

@Component({
  selector: 'page-createapp',
  templateUrl: 'createapp.html',
  styleUrls: ['createapp.scss']
})
export class CreateAppPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  appName: string = "";
  mnemonicToImport: string = "";
  mnemonicToImportPassphrase: string = "";

  createdDApp: CreatedDApp = null;
  importDID = false;

  passwordToggle: string = 'eye';
  showPassword = false;

  helpMessage: string = this.translate.instant('developertools.help-message');
  helpMessage2: string = this.translate.instant('developertools.help-message2');
  helpMessage3: string = this.translate.instant('developertools.help-message3');

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem)=>void;

  constructor(
    public dAppService: DAppService,
    private nav: GlobalNavService,
    private native: GlobalNativeService,
    public translate: TranslateService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('developertools.new-app'));
    this.titleBar.setBackgroundColor("#181d20");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: "createapp-back",
      iconPath: BuiltInIcon.BACK
    });

    this.titleBarIconClickedListener = (clickedIcon)=>{
      switch (clickedIcon.key) {
        case "createapp-back":
          this.nav.navigateBack();
          break;
      }
    }
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener);
  }

  ionViewWillLeave() {
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async createApp() {
    if(this.appName) {
      if (!this.importDID) {
        this.createdDApp = await this.dAppService.createDApp(this.appName);
      } else {
        if(this.mnemonicToImport) {
          this.createdDApp = await this.dAppService.createDAppUsingMnemonic(
            this.appName,
            this.mnemonicToImport,
            this.mnemonicToImportPassphrase
          );
        } else {
          this.native.genericToast('developertools.provide-mnemonic', 4000, 'dark');
        }
      }
    } else {
      this.native.genericToast('developertools.provide-name', 2000, 'dark');
    }

  }

  endAppCreation() {
    this.nav.navigateBack();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    if(this.passwordToggle === 'eye') {
      this.passwordToggle = 'eye-off'
    } else {
      this.passwordToggle = 'eye';
    }
  }
}
