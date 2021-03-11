import { Component, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';

import { BasicCredentialInfo } from '../../model/basiccredentialinfo.model';
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { Router } from '@angular/router';
import { BasicCredentialEntry } from '../../model/basiccredentialentry.model';
import { Events } from '../../services/events.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'page-profileentrypicker',
  templateUrl: 'profileentrypicker.html',
  styleUrls: ['profileentrypicker.scss']
})
export class ProfileEntryPickerPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  availableItems: BasicCredentialEntry[];

  constructor(
    private basicCredentialService: BasicCredentialsService,
    private modalCtrl: ModalController,
    private navParams: NavParams,
    private router: Router,
    public theme: GlobalThemeService,
    public events: Events
  ) {
    // List of keys we don't want to show (probably already existing in the profile)
    let filterOutKeys: string[] = navParams.get("filterOut");

    this.availableItems = this.basicCredentialService.getBasicCredentialEntryList().filter((item)=>{
      return !filterOutKeys.includes(item.key);
    });
  }

  ionViewWillEnter() {
    // hide the menu
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
  }

  ionViewWillLeave() {
    // let the editprofile screen to show menu
    this.events.publish('editprofile-showmenu');
  }


  selectItem(item: BasicCredentialInfo) {
    console.log("Picker profile info entry:", item);
    this.modalCtrl.dismiss({
      pickedItem: item
    })
  }

  close() {
    this.modalCtrl.dismiss(null);
  }
}
