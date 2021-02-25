import { Component, OnInit } from '@angular/core';
import { ToastController, PopoverController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { StorageService } from 'src/app/services/storage.service';
import { AppTheme, ThemeService } from 'src/app/services/theme.service';

import * as moment from 'moment';
import { NotificationManagerService } from '../../services/notificationmanager.service';
import { OptionsComponent } from '../../components/options/options.component';
import { AppManagerPlugin } from 'src/app/TMP_STUBS';
import { DidmanagerService } from '../../services/didmanager.service';
import { IosService } from '../../services/ios.service';
import { AppmanagerService } from '../../services/appmanager.service';
import { TitlebarService } from 'src/app/services/titlebar.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage implements OnInit {
  private popover: any = null;

  constructor(
    public toastCtrl: ToastController,
    private popoverCtrl: PopoverController,
    private navCtrl: NavController,
    public translate: TranslateService,
    public storage: StorageService,
    public theme: ThemeService,
    public splashScreen: SplashScreen,
    private notification: NotificationManagerService,
    private appManager: AppManagerPlugin,
    public iosService: IosService,
    public appService: AppmanagerService,
    public didService: DidmanagerService,
    public titlebarService: TitlebarService
  ) {
    console.log("Launcher home screen component is being constructed");
  }

  ngOnInit() {
    console.log("Launcher home screen component is initializing");
  }

  ionViewWillEnter() {
    // Show badge if there are notifications.
    this.notification.getNotifications();
    this.titlebarService.setTitle('elastOS Essentials');
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
    this.appManager.start("org.elastos.trinity.dapp.did");
  }

  getDateFromNow() {
    // return moment().format('dddd MMM Do') + ', ' + moment().format('LT');
    return moment().format('dddd, MMM Do');
  }
}
