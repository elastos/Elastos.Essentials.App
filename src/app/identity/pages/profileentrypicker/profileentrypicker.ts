import { Component, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { BasicCredentialEntry } from '../../model/basiccredentialentry.model';
import { BasicCredentialInfo } from '../../model/basiccredentialinfo.model';
import { BasicCredentialsService } from '../../services/basiccredentials.service';


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
    public events: GlobalEvents,

  ) {
    // List of keys we don't want to show (probably already existing in the profile)
    let filterOutKeys: string[] = navParams.get("filterOut");

    this.availableItems = this.basicCredentialService.getBasicCredentialEntryList().filter((item) => {
      return !filterOutKeys.includes(item.key) && item.key !== 'avatar';
    });
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null); // Modals are not part of page stack, therefore we dont use navigation mode
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.modalCtrl.dismiss();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    // let the editprofile screen to show menu
    this.events.publish('editprofile-showmenu');
  }


  selectItem(item: BasicCredentialInfo) {
    Logger.log('Identity', "Picker profile info entry:", item);
    void this.modalCtrl.dismiss({
      pickedItem: item
    })
  }

  close() {
    void this.modalCtrl.dismiss(null);
  }
}
