import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DAppService } from '../../services/dapp.service';
import { StorageDApp } from '../../model/storagedapp.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['home.scss']
})
export class HomePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  constructor(public navCtrl: NavController, public dappService: DAppService) {
  }

  ionViewDidEnter() {
    // Update system status bar every time we re-enter this screen.
    this.titleBar.setTitle("Developer Toolbox");
    this.titleBar.setBackgroundColor("#181d20");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
  }

  newApp() {
    Logger.log("developertools", "new app")
    this.navCtrl.navigateForward("createapp");
  }

  openApp(app: StorageDApp) {
    this.navCtrl.navigateForward("appdetails", {
      state: {
        "app": app
      }
    });
  }
}
