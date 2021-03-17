import { Component, OnInit, ViewChild } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-devtests',
  templateUrl: './devtests.page.html',
  styleUrls: ['./devtests.page.scss'],
})
export class DevTestsPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public settings: SettingsService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("Development tests");
  }

  ionViewWillLeave() {
  }

  someTest() {
  }
}
