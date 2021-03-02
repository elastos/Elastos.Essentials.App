import { Component, OnInit, ViewChild } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from 'src/app/didsessions/services/theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';

@Component({
  selector: 'app-devtests',
  templateUrl: './devtests.page.html',
  styleUrls: ['./devtests.page.scss'],
})
export class DevTestsPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    public settings: SettingsService,
    public theme: ThemeService,
    public translate: TranslateService,
    private appManager: TemporaryAppManagerPlugin
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("Development tests");
    this.settings.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave() {
    this.settings.setTitleBarBackKeyShown(false);
  }
}
