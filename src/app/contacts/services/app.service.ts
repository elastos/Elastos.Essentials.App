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

  /********************************************************
  ************************ Misc ***************************
  *********************************************************/
  deleteStorage() {
    this.storageService.setVisit(false);
  }
}
