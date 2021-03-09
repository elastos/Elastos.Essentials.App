import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DAppService } from '../../services/dapp.service';
import { CreatedDApp } from '../../model/customtypes';
import { Router } from '@angular/router';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem, TitleBarIconSlot, BuiltInIcon } from 'src/app/components/titlebar/titlebar.types';

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

  helpMessage: string = 'An app DID store password is an ordinary password used to access the created app\'s profile. Make sure to keep this password stored safely';
  helpMessage2: string = 'If you have already created an app, you may use its existing DID mnemonic to create another app profile';
  helpMessage3: string = 'For advanced use only, this mnemonic is only necessary if you want to use your wallet\'s passphrase for extra security';

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem)=>void;

  constructor(
    public dAppService: DAppService,
    public navCtrl: NavController,
    private router: Router
  ) {
  }

  ionViewDidEnter() {
    // Update system status bar every time we re-enter this screen.
    // titleBarManager.setTitle("Create app");
    this.titleBar.setTitle("New App");

    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: "createapp-back",
      iconPath: BuiltInIcon.BACK
    });

    this.titleBarIconClickedListener = (clickedIcon)=>{
      switch (clickedIcon.key) {
        case "createapp-back":
          this.navCtrl.back();
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
    if (!this.importDID)
      this.createdDApp = await this.dAppService.createDApp(this.appName);
    else
      this.createdDApp = await this.dAppService.createDAppUsingMnemonic(this.appName, this.mnemonicToImport, this.mnemonicToImportPassphrase);
  }

  endAppCreation() {
    this.router.navigate(['/developertools/home']);
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
