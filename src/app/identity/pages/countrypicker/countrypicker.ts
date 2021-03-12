import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';

import { area } from '../../../../assets/identity/area/area';
import { TranslateService } from '@ngx-translate/core';
import { Events } from '../../services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'page-countrypicker',
  templateUrl: 'countrypicker.html',
  styleUrls: ['countrypicker.scss']
})
export class CountryPickerPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  areaList: any;
  areaItem: any = null;

  constructor(
            public events: Events,
            private navCtrl: NavController,
            private translate: TranslateService,
            public theme: GlobalThemeService
  ) {
    this.areaList = area;
    console.log('areaList', this.areaList);
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('country'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
  }

  ionViewWillLeave() {
    this.titleBar.setNavigationMode(null);
  }

  selectItem(item) {
    this.events.publish('selectarea', item);
    this.navCtrl.back();
  }
}
