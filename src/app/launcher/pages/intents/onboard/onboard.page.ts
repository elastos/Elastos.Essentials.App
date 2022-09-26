import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalApplicationDidService } from 'src/app/services/global.applicationdid.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

export type OnBoardIntentParams = {
  feature: "easybridge" | unknown;
  title?: string;
  introduction?: string;
  button?: string;
  caller?: string; // Calling app did
}

type OnBoardConfig = OnBoardIntentParams;

type CallingAppInfo = {
  icon: string;
  name: string;
}

@Component({
  selector: 'app-onboard',
  templateUrl: './onboard.page.html',
  styleUrls: ['./onboard.page.scss'],
})
export class OnboardIntentPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public config: OnBoardConfig = null;
  public unsupportedFeature = false; // Whether the "feature" param is known and can be handled, or not.
  public callingAppInfo: CallingAppInfo = null;

  constructor(
    private router: Router,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private globalHiveService: GlobalHiveService,
    private zone: NgZone,
    private globalNav: GlobalNavService,
    private globalApplicationDidService: GlobalApplicationDidService
  ) {
    GlobalFirebaseService.instance.logEvent("intent_launcher_onboard_enter");

    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state) {
      let intent = <EssentialsIntentPlugin.ReceivedIntent>navigation.extras.state.intent;
      Logger.log('onboard', 'Intent', intent);

      this.prepareConfig(intent);
    }
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM);
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);

    void this.fetchApplicationDidInfo();
  }

  ionViewDidEnter() {
  }

  private prepareConfig(intent: EssentialsIntentPlugin.ReceivedIntent) {
    this.config = intent.params;

    switch (this.config.feature) {
      case "easybridge":
        // Default values
        if (!this.config.title) this.config.title = "Easy Elastos Tokens";
        if (!this.config.introduction) this.config.introduction = "For convenience, Essentials can discover your tokens on other chains and automatically convert some of them to Elastos tokens.";
        if (!this.config.button) this.config.button = "Get ELA now";
        break;
      default:
        this.unsupportedFeature = true;
    }
  }

  private async fetchApplicationDidInfo(): Promise<void> {
    let callingAppDID = this.config.caller;
    if (!callingAppDID)
      return;

    // Fetch the application from chain and extract info.
    let callingAppInfo = await this.globalApplicationDidService.fetchPublishedAppInfo(callingAppDID);
    if (callingAppInfo.didDocument) {
      Logger.log("onboard", "Calling application info:", callingAppInfo);

      let icon = await this.fetchAppIcon(callingAppInfo.iconUrl);
      if (!icon) {
        Logger.log("onboard", "No app icon found");
        return;
      }

      this.zone.run(() => {
        this.callingAppInfo = {
          name: callingAppInfo.name,
          icon
        };
      });
    }
  }

  private fetchAppIcon(hiveIconUrl: string): Promise<string> {
    try {
      return this.globalHiveService.fetchHiveScriptPictureToDataUrl(hiveIconUrl);
    }
    catch (e) {
      Logger.error("onboard", `Failed to fetch application icon at ${hiveIconUrl}`);
    }
  }

  public mainFeatureAction() {
    this.globalNav.clearIntermediateRoutes(["/intents/onboard"]); // Forget current screen

    switch (this.config.feature) {
      case "easybridge":
        void this.globalNav.navigateTo(App.EASY_BRIDGE, "/easybridge/home");
        break;
      default:
        void this.globalNav.navigateBack(); // Unsupported feature, should never be called
    }
  }

  public unsupportedFeatureAction() {
    void this.globalNav.navigateBack();
  }
}
