import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { App } from 'src/app/model/app.enum';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { SettingsService } from '../../services/settings.service';

declare let essentialsIntentManager: EssentialsIntentPlugin.IntentManager;

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
    private globalNotificationsService: GlobalNotificationsService,
    private native: GlobalNativeService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Development tests");
  }

  ionViewWillLeave() {
  }

  someTest() {
  }

  public sendNotification() {
    void this.globalNotificationsService.sendNotification({
      key: "testnotif" + Math.random(),
      title: "Test notification",
      message: "This is a test notification sent from the core developer test page.",
      app: App.SETTINGS
    });

    this.native.genericToast("Notification sent");
  }
}
