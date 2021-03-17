import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';

import * as moment from 'moment';
import { NotificationManagerService } from '../../services/notificationmanager.service';
import { OptionsComponent } from '../../components/options/options.component';
import { DIDManagerService } from '../../services/didmanager.service';
import { AppmanagerService } from '../../services/appmanager.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private popover: any = null;

  constructor(
    public toastCtrl: ToastController,
    private popoverCtrl: PopoverController,
    public translate: TranslateService,
    public storage: GlobalStorageService,
    public theme: GlobalThemeService,
    public splashScreen: SplashScreen,
    private notification: NotificationManagerService,
    public appService: AppmanagerService,
    public didService: DIDManagerService,
    private nav: GlobalNavService,
    private pref: GlobalPreferencesService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    // Show badge if there are notifications.
    this.notification.getNotifications();
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
    this.pref.getPreference(this.didService.signedIdentity.didString, "chain.network.type",).then((networkCode) => {
      switch (networkCode) {
        case 'MainNet':
          this.titleBar.setTitle(this.translate.instant('elastos-essentials'));
        break;
        case 'TestNet':
          this.titleBar.setTitle('Test Net Active');
        break;
        case 'RegTest':
          this.titleBar.setTitle('Regression Net Active');
        break;
        case 'PrvNet':
          this.titleBar.setTitle('Private Net Active');
        break;
      }
    });
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
    if (this.popover) {
      this.popover.dimiss();
    }
  }

  /************** Show App/Identity Options **************/
  async showOptions(ev: any) {
    console.log('Opening options');

    this.popover = await this.popoverCtrl.create({
      mode: 'ios',
      component: OptionsComponent,
      componentProps: {
      },
      cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'options' : 'darkOptions',
      event: ev,
      translucent: false
    });
    this.popover.onWillDismiss().then(() => {
      this.popover = null;
    });
    return await this.popover.present();
  }

  showMyIdentity() {
    this.nav.navigateTo("identity", '/identity/myprofile/home');
  }

  getDateFromNow() {
    // return moment().format('dddd MMM Do') + ', ' + moment().format('LT');
    return moment().format('dddd, MMM Do');
  }
}
