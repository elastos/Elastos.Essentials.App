import { Component, OnInit, ViewChild } from '@angular/core';
import { LottieSplashScreen } from '@awesome-cordova-plugins/lottie-splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'app-language',
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
})
export class LanguagePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  public identities = [];

  constructor(
    public languageService: GlobalLanguageService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private uxService: UXService,
    private lottieSplashScreen: LottieSplashScreen,
    private didSessions: GlobalDIDSessionsService
  ) { }

  ngOnInit() {
    this.theme.activeTheme.subscribe(theme => {
      this.updateTitleBarIcons();
    })
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(' ');
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
    this.updateTitleBarIcons();
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });
    this.titleBar.setNavigationMode(null);
    void this.checkForIdentities();
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.lottieSplashScreen.hide();
  }

  ionViewWillLeave() {
    //this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private updateTitleBarIcons() {
    //let themeIconPath = !this.theme.activeTheme.value.config.usesDarkMode ? 'assets/didsessions/icon/palette.svg' : 'assets/didsessions/icon/dark_mode/palette.svg';
    //this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "theme", iconPath: themeIconPath });
  }

  async checkForIdentities() {
    this.identities = await this.didSessions.getIdentityEntries();
  }

  continue() {
    this.identities.length ? void this.uxService.navigateRoot() : this.uxService.go("/didsessions/createidentity");
  }
}
