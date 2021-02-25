import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';
import { ThemeService } from 'src/app/services/theme.service';
import { UXService } from 'src/app/services/ux.service';
import { IdentityService } from 'src/app/services/identity.service';

declare let titleBarManager: TitleBarPlugin.TitleBarManager;
declare let didSessionManager: DIDSessionManagerPlugin.DIDSessionManager;

@Component({
  selector: 'app-language',
  templateUrl: './language.page.html',
  styleUrls: ['./language.page.scss'],
})
export class LanguagePage implements OnInit {

  public identities = [];

  constructor(
    public languageService: LanguageService,
    public theme: ThemeService,
    public translate: TranslateService,
    private identityService: IdentityService,
    private uxService: UXService,
    private splashScreen: SplashScreen
  ) { }

  ngOnInit() {
    this.translate.onLangChange.subscribe(data => {
      this.updateTitle();
    });
  }

  ionViewWillEnter() {
    this.updateTitle();
    this.uxService.setTitleBarBackKeyShown(false);
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, null);

    this.checkForIdentities();
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
  }

  updateTitle() {
    titleBarManager.setTitle(' ');
  }

  async checkForIdentities() {
    this.identities = await didSessionManager.getIdentityEntries();
  }

  continue() {
    if(this.identities.length === 0) {
      this.uxService.go("createidentity");
    } else {
      this.uxService.go("pickidentity");
    }
  }
}
