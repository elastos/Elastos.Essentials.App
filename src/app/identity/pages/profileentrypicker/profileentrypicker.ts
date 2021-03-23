import { Component, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';

import { BasicCredentialInfo } from '../../model/basiccredentialinfo.model';
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { Router } from '@angular/router';
import { BasicCredentialEntry } from '../../model/basiccredentialentry.model';
import { Events } from '../../services/events.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'page-profileentrypicker',
  templateUrl: 'profileentrypicker.html',
  styleUrls: ['profileentrypicker.scss']
})
export class ProfileEntryPickerPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  availableItems: BasicCredentialEntry[];

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private basicCredentialService: BasicCredentialsService,
    private modalCtrl: ModalController,
    public navParams: NavParams,
    public theme: GlobalThemeService,
    public events: Events,

  ) {
    // List of keys we don't want to show (probably already existing in the profile)
    let filterOutKeys: string[] = navParams.get("filterOut");

    this.availableItems = this.basicCredentialService.getBasicCredentialEntryList().filter((item)=>{
      return !filterOutKeys.includes(item.key) && item.key !== 'avatar';
    });
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null );
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.CLOSE });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.modalCtrl.dismiss();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    // let the editprofile screen to show menu
    this.events.publish('editprofile-showmenu');
  }


  selectItem(item: BasicCredentialInfo) {
    Logger.log('Identity', "Picker profile info entry:", item);
    this.modalCtrl.dismiss({
      pickedItem: item
    })
  }

  close() {
    this.modalCtrl.dismiss(null);
  }
}
