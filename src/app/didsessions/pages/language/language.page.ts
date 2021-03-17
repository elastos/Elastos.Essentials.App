import { Component, OnInit, ViewChild } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-language',
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
})
export class LanguagePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public identities = [];

  constructor(
    public languageService: GlobalLanguageService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private uxService: UXService,
    private splashScreen: SplashScreen,
    private didSessions: GlobalDIDSessionsService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(' ');
    this.titleBar.setTheme('#f8f8ff', TitleBarForegroundMode.DARK);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
    this.titleBar.setNavigationMode(null);
    this.checkForIdentities();
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
  }

  async checkForIdentities() {
    this.identities = await this.didSessions.getIdentityEntries();
  }

  continue() {
    this.identities.length ? this.uxService.go("pickidentity") : this.uxService.go("createidentity");
  }
}
