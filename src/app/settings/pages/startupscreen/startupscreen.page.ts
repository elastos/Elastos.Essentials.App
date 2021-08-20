import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStartupService } from 'src/app/services/global.startup.service';

type StartupScreen = {
  key: string;
  name: string;
  description: string;
}

/**
 * Provides a way change which screen is shown first after signing in, depending on user's habits.
 */
@Component({
  selector: 'app-startupscreen',
  templateUrl: './startupscreen.page.html',
  styleUrls: ['./startupscreen.page.scss'],
})
export class StartupScreenPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public startupScreens: StartupScreen[] = [];
  public activeStartupScreen: StartupScreen = null;

  constructor(
    public theme: GlobalThemeService,
    public translate: TranslateService,
    public globalStartupService: GlobalStartupService
  ) { }

  async ngOnInit() {
    this.startupScreens = [
      // Main Home screen - Default
      {
        key: 'home',
        name: this.translate.instant('settings.startupscreen-home-title'),
        description: this.translate.instant('settings.startupscreen-home-description')
      },
      // Wallets 'app'
      {
        key: 'wallets',
        name: this.translate.instant('settings.startupscreen-wallets-title'),
        description: this.translate.instant('settings.startupscreen-wallets-description')
      },
      // Dapps portal
      {
        key: 'dapps',
        name: this.translate.instant('settings.startupscreen-dapps-title'),
        description: this.translate.instant('settings.startupscreen-dapps-description')
      }
    ];

    let startupScreenKey = await this.globalStartupService.getStartupScreen(GlobalDIDSessionsService.signedInDIDString);
    this.activeStartupScreen = this.startupScreens.find(s => s.key === startupScreenKey) || this.startupScreens[0];
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('settings.startupscreen'));
  }

  public useScreen(screen: StartupScreen) {
    this.activeStartupScreen = screen;
    void this.globalStartupService.setStartupScreen(GlobalDIDSessionsService.signedInDIDString, screen.key);
  }
}
