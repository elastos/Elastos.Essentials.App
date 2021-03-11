import { Injectable, NgZone, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, NavController } from '@ionic/angular';
import { Router } from '@angular/router';

import { FriendsService } from './friends.service';
import { StorageService } from './storage.service';
import { PopupService } from './popup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor(
    private friendsService: FriendsService,
    private storageService: StorageService,
    private popupService: PopupService,
    private platform: Platform,
    private theme: GlobalThemeService,
    private zone: NgZone,
    private translate: TranslateService,
    private navCtrl: NavController,
    private router: Router
  ) {
  }

  init() {
    if (this.platform.platforms().indexOf("cordova") >= 0) {
  /*     this.titleBar.addOnItemClickedListener((menuIcon) => {
        if(this.popupService.qrModal) {
          this.popupService.qrModal.dismiss();
        }
        if(this.popupService.deletePopup) {
          this.popupService.deletePopup.dismiss();
        }
        if(this.popupService.optionsPopup) {
          this.popupService.optionsPopup.dismiss();
        }

        this.onTitleBarItemClicked(menuIcon);
      }); */
    }
  }

  onTitleBarItemClicked(icon: TitleBarIcon) {
    switch (icon.key) {
      case 'backToHome':
        console.log('Back to home');
        this.navCtrl.navigateBack('/friends');
        break;
      case 'add':
        this.router.navigate(['/add']);
        break;
      case 'scan':
        this.friendsService.scanDID();
    }
  }

  /* TODO @chad
  onMessageReceived(msg: EssentialsIntentPlugin.ReceivedMessage) {
    var params: any = msg.message;
    if (typeof (params) == "string") {
      try {
          params = JSON.parse(params);
      } catch (e) {
          console.log('Params are not JSON format: ', params);
      }
    }
    switch (msg.type) {
      case MessageType.IN_REFRESH:
        if (params.action === "currentLocaleChanged") {
          this.setCurLang(params.data);
        }
        if(params.action === 'preferenceChanged' && params.data.key === "ui.darkmode") {
          this.zone.run(() => {
            console.log('Dark Mode toggled');
            this.theme.setTheme(params.data.value);
          });
        }
        break;
    }
  }
  */

  setTitleBarBackKeyShown(show: boolean, backToHome: boolean) {
    /* TODO @chad
    if (show && !backToHome) {
      titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
        key: "back",
        iconPath: TitleBarPlugin.BuiltInIcon.BACK
      });
    } else if(show && backToHome) {
      titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
        key: "backToHome",
        iconPath: TitleBarPlugin.BuiltInIcon.BACK
      });
    } else {
      titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
    }*/
  }

  /********************************************************
  ************************ Misc ***************************
  *********************************************************/
  startApp(id) {
    // TODO @chad essentialsIntent.start(id);
  }

  deleteStorage() {
    this.storageService.setVisit(false);
  }

  launcher() {
    // TODO @chad essentialsIntent.launcher();
  }
}
