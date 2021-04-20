import { Component, OnInit, ViewChild } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

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
  ) {
    essentialsIntentManager.addIntentListener((ret) => {
        this.onIntentReceived(ret);
    });
   }

  ionViewWillEnter() {
    this.titleBar.setTitle("Development tests");
  }

  ionViewWillLeave() {
  }

  someTest() {
  }

  async onIntentReceived(intent: EssentialsIntentPlugin.ReceivedIntent) {
    console.log('Received intent', intent);
    console.log(EssentialsIntentPlugin.IntentSource.Internal);
    console.log(intent.from);
    console.log(EssentialsIntentPlugin.IntentSource.Internal == intent.from);
    try {
      console.log("sendIntentResponse");
      await essentialsIntentManager.sendIntentResponse({essentials:"response"}, intent.intentId);
    }
    catch (e) {
        console.error("sendIntentResponse error:", e);
        throw e;
    }
  }

  public async testIntent() {
    console.log("test Intent");

    try {
      let ret = await essentialsIntentManager.sendIntent("https://scanner.elastos.net/scanqrcode", {a: 1});
      console.log('intent response:', ret);
      console.log("sendUrlIntent");
      let ret1 = await essentialsIntentManager.sendUrlIntent("https://did.elastos.net/credaccess/eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6ZWxhc3RvczppcVduUFJLWTltTktvUmRETXJrSGRlRHBRQmk0WnRvekQ0IiwiY2FsbGJhY2t1cmwiOiJodHRwczovL2FwaS5jeWJlcnJlcHVibGljLm9yZy9hcGkvdXNlci9sb2dpbi1jYWxsYmFjay1lbGEiLCJub25jZSI6IjZiNzkyZDVhLTBlYTItNDU4MC1hYWY2LWRiM2FjZjA2OGZiMiIsImNsYWltcyI6e30sIndlYnNpdGUiOnsiZG9tYWluIjoiaHR0cHM6Ly93d3cuY3liZXJyZXB1YmxpYy5vcmciLCJsb2dvIjoiaHR0cHM6Ly93d3cuY3liZXJyZXB1YmxpYy5vcmcvYXNzZXRzL2ltYWdlcy9jcl9lbGFfd2FsbGV0LnN2ZyJ9LCJpYXQiOjE2MTUxODYyNzUsImV4cCI6MTYxNTc5MTA3NX0._ppCH7YHd5SVoZHZI2YeYww6OlAjf5GIG3QqqSXf5rMw8oBmvdF7Nld_WMvnVQUvSnmnadRPZsYW66-Zi7T1Fg ");
      console.log('intent response:', ret1);
    }
    catch (e) {
      console.error("sendIntent error:", e);
      throw e;
    }

    console.log("tested Intent");
  }
}
