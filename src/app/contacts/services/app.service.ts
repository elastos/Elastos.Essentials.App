import { Injectable } from '@angular/core';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { FriendsService } from './friends.service';
import { PopupService } from './popup.service';


@Injectable({
  providedIn: 'root'
})
export class AppService {

  constructor(
    private friendsService: FriendsService,
    private storage: GlobalStorageService,
    private popupService: PopupService,
    private globalNav: GlobalNavService
  ) {
  }

  onTitleBarItemClicked(icon: TitleBarIcon) {
    if (this.popupService.qrModal) {
      this.popupService.qrModal.dismiss();
    }
    if (this.popupService.avatarModal) {
      this.popupService.avatarModal.dismiss();
    }
    if (this.popupService.deletePopup) {
      this.popupService.deletePopup.dismiss();
    }
    if (this.popupService.optionsPopup) {
      this.popupService.optionsPopup.dismiss();
    }

    switch (icon.key) {
      case 'backToHome':
        void this.globalNav.navigateRoot(App.CONTACTS, '/contacts/friends', { animationDirection: 'back' });
        break;
      case 'add':
        void this.globalNav.navigateTo(App.CONTACTS, '/contacts/add');
        break;
      case 'scan':
        void this.friendsService.scanDID();
        break;
    }
  }

  /********************************************************
  ************************ Misc ***************************
  *********************************************************/
  async deleteStorage(): Promise<void> {
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'contacts', 'visited', false)
  }
}
