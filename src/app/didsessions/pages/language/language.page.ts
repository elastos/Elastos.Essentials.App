import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { DIDSessionsService } from 'src/app/services/didsessions.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-language',
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
})
export class LanguagePage implements OnInit {

  public identities = [];

  constructor(
    public languageService: GlobalLanguageService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private uxService: UXService,
    private splashScreen: SplashScreen,
    private didSessions: DIDSessionsService
  ) { }

  ngOnInit() {
    this.translate.onLangChange.subscribe(data => {
      this.updateTitle();
    });
  }

  ionViewWillEnter() {
    this.updateTitle();
    this.uxService.setTitleBarBackKeyShown(false);
    // TODO @chad - titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, null);

    this.checkForIdentities();
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
  }

  updateTitle() {
    // TODO @chad - titleBarManager.setTitle(' ');
  }

  async checkForIdentities() {
    this.identities = await this.didSessions.getIdentityEntries();
  }

  continue() {
    if(this.identities.length === 0) {
      this.uxService.go("createidentity");
    } else {
      this.uxService.go("pickidentity");
    }
  }
}
