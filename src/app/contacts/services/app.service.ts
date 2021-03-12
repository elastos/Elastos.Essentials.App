import { Injectable } from '@angular/core';

import { FriendsService } from './friends.service';
import { StorageService } from './storage.service';
import { PopupService } from './popup.service';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService, App } from 'src/app/services/global.nav.service';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor(
    private friendsService: FriendsService,
    private storageService: StorageService,
    private popupService: PopupService,
    private globalNav: GlobalNavService
  ) {
  }

  init() {
  }

  onTitleBarItemClicked(icon: TitleBarIcon) {
    if(this.popupService.qrModal) {
      this.popupService.qrModal.dismiss();
    }
    if(this.popupService.avatarModal) {
      this.popupService.avatarModal.dismiss();
    }
    if(this.popupService.deletePopup) {
      this.popupService.deletePopup.dismiss();
    }
    if(this.popupService.optionsPopup) {
      this.popupService.optionsPopup.dismiss();
    }

    switch (icon.key) {
      case 'backToHome':
        console.log('Back to home');
        this.globalNav.navigateRoot(App.CONTACTS, '/contacts/friends');
        break;
      case 'add':
        this.globalNav.navigateTo(App.CONTACTS, '/contacts/add');
        break;
      case 'scan':
        this.friendsService.scanDID();
        break;
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
