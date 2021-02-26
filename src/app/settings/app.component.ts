import { Component, ViewChild } from '@angular/core';
import { Platform, NavController, IonRouterOutlet } from '@ionic/angular';
import { SettingsService } from './services/settings.service';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'my-app',
  templateUrl: 'app.html',
})
export class MyApp {
  @ViewChild(IonRouterOutlet, {static: true}) routerOutlet: IonRouterOutlet;

  constructor(
    private platform: Platform,
    private languageService: LanguageService,
    private settings: SettingsService,
    private navController: NavController
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      await this.settings.init();
      await this.languageService.init();

      this.setupBackKeyNavigation();

      this.navController.navigateRoot("/menu");
    });
  }

  /**
   * Listen to back key events. If the default router can go back, just go back.
   * Otherwise, exit the application.
   */
  setupBackKeyNavigation() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      if (this.routerOutlet && this.routerOutlet.canGoBack()) {
        this.routerOutlet.pop();
      } else {
        navigator['app'].exitApp();
      }
    });
  }
}
