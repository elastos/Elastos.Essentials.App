import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { CreatedDApp } from '../../model/customtypes';
import { DAppService } from '../../services/dapp.service';

@Component({
  selector: 'page-createapp',
  templateUrl: 'createapp.html',
  styleUrls: ['createapp.scss']
})
export class CreateAppPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  appName = "";
  mnemonicToImport = "";
  mnemonicToImportPassphrase = "";

  createdDApp: CreatedDApp = null;
  importDID = false;
  creationInProgress = false;

  passwordToggle = 'eye';
  showPassword = false;

  helpMessage: string = this.translate.instant('developertools.help-message');
  helpMessage2: string = this.translate.instant('developertools.help-message2');
  helpMessage3: string = this.translate.instant('developertools.help-message3');

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

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

    this.titleBarIconClickedListener = (clickedIcon) => {
      switch (clickedIcon.key) {
        case "createapp-back":
          void this.nav.navigateBack();
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
    this.creationInProgress = true;

    if (!this.importDID) {
      if (this.appName) {
        this.createdDApp = await this.dAppService.createDApp(this.appName);
      } else {
        this.native.genericToast('developertools.provide-name', 2000, 'dark');
      }
    } else {
      if (this.mnemonicToImport) {
        this.createdDApp = await this.dAppService.createDAppUsingMnemonic(
          null,
          this.mnemonicToImport,
          this.mnemonicToImportPassphrase
        );
      } else {
        this.native.genericToast('developertools.provide-mnemonic', 4000, 'dark');
      }
    }

    this.creationInProgress = false;
  }

  endAppCreation() {
    void this.nav.navigateBack();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    if (this.passwordToggle === 'eye') {
      this.passwordToggle = 'eye-off'
    } else {
      this.passwordToggle = 'eye';
    }
  }
}
