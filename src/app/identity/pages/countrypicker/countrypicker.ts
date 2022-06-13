import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { area } from '../../../../assets/identity/area/area';
import { Native } from '../../services/native';

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
    public events: GlobalEvents,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private native: Native
  ) {
    this.areaList = area;
    Logger.log('Identity', 'areaList', this.areaList);
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('common.country'));
  }

  ionViewWillLeave() {
  }

  selectItem(item) {
    this.events.publish('selectarea', item);
    this.native.pop();
  }
}
