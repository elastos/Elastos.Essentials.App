import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastController, PopoverController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';

import * as moment from 'moment';
import { OptionsComponent } from '../../components/options/options.component';
import { DIDManagerService } from '../../services/didmanager.service';
import { AppmanagerService } from '../../services/appmanager.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { TitleBarIconSlot, BuiltInIcon, TitleBarMenuItem, TitleBarIcon, TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { NotificationsPage } from '../notifications/notifications.page';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalAppBackgroundService } from 'src/app/services/global.appbackground.service';
import { AuthService } from "src/app/identity/services/auth.service";
import { DIDService } from "src/app/identity/services/did.service";
import { App } from "src/app/model/app.enum"
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { Subscription } from 'rxjs';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private popover: any = null;
  private modal: any = null;
  private identityNeedsBackup = false;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;
  private walletServiceSub: Subscription = null; // Subscription to wallet service initialize completion event

  // Widget data
  public mainWalletName: string = "";
  public mainWalletELABalance: string = null; // Balance to display under the wallet menu item.

  constructor(
    public toastCtrl: ToastController,
    private popoverCtrl: PopoverController,
    public translate: TranslateService,
    public storage: GlobalStorageService,
    public theme: GlobalThemeService,
    public splashScreen: SplashScreen,
    public appService: AppmanagerService,
    public didService: DIDManagerService,
    private identityService: DIDService,
    private nav: GlobalNavService,
    private pref: GlobalPreferencesService,
    private modalCtrl: ModalController,
    private appBackGroundService: GlobalAppBackgroundService,
    private authService: AuthService,
    private walletService: WalletManager,
    private globalNotifications: GlobalNotificationsService,
    private didSessions: GlobalDIDSessionsService) {
  }

  ngOnInit() {
  }

  async ionViewWillEnter() {
   /*  setTimeout(()=>{
      const notification = {
        key: 'storagePlanExpiring',
        title: 'Storage Plan Expiring',
        message: 'You have a storage plan expiring soon. Please renew your plan before the expiration time.',
        app: App.WALLET
      };
      this.globalNotifications.sendNotification(notification);
    }, 2000); */

    this.titleBar.setTitle(this.translate.instant('common.elastos-essentials'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "notifications",
      iconPath:  BuiltInIcon.NOTIFICATIONS
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if(icon.key === 'notifications') {
        void this.showNotifications();
      }
    });

    if(this.theme.darkMode) {
      this.titleBar.setTheme('#121212', TitleBarForegroundMode.LIGHT);
    } else {
      this.titleBar.setTheme('#F5F5FD', TitleBarForegroundMode.DARK);
    }

    this.identityNeedsBackup = !(await this.didSessions.activeIdentityWasBackedUp());

    if (this.didService.signedIdentity) { // Should not happend, just in case - for ionic hot reload
      let networkCode = await this.pref.getPreference(this.didService.signedIdentity.didString, "chain.network.type");
      switch (networkCode) {
        case 'MainNet':
          this.titleBar.setTitle(this.translate.instant('common.elastos-essentials'));
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
        case 'LrwNet':
          this.titleBar.setTitle('CR Private Net Active');
        break;
      }
    }

    // Wait for wallet service to be initialized (existing wallets loaded) so we can display some balance
    // on the wallet widget.
    this.walletServiceSub = this.walletService.walletServiceStatus.subscribe((initializationComplete) => {
      if (initializationComplete) {
        let wallets = this.walletService.getWalletsList();
        // We need to have at least one existing wallet to display something.
        if (wallets && wallets.length > 0) {
          // Simple widget for now: display the main balance of the first wallet we find.
          this.mainWalletName = wallets[0].name;
          this.mainWalletELABalance = wallets[0].getDisplayBalance().toFixed(2);
        }
      }
    });
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
    if (this.walletServiceSub) {
      this.walletServiceSub.unsubscribe();
      this.walletServiceSub = null;
    }

    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.popover) {
      this.popover.dimiss();
    }
  }

  async showNotifications() {
    this.modal = await this.modalCtrl.create({
        component: NotificationsPage,
        cssClass: 'running-modal',
        mode: 'ios',
    });
    this.modal.onDidDismiss().then(() => { this.modal = null; });
    await this.modal.present();
  }

  /************** Show App/Identity Options **************/
  async showOptions(ev: any) {
    Logger.log('Launcher', 'Opening options');

    this.popover = await this.popoverCtrl.create({
      mode: 'ios',
      component: OptionsComponent,
      componentProps: {
      },
      cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'launcher-options-component' : 'launcher-options-component-dark',
      event: ev,
      translucent: false
    });
    this.popover.onWillDismiss().then(() => {
      this.popover = null;
    });
    return await this.popover.present();
  }

  backupIdentity() {
    void this.nav.navigateTo("identitybackup", "/identity/backupdid");
  }

  showMyIdentity() {
    void this.nav.navigateTo("identity", '/identity/myprofile/home');
  }

  async signOut() {
    await this.appBackGroundService.stop();
    this.didService.signOut();
  }

  getDateFromNow() {
    // return moment().format('dddd MMM Do') + ', ' + moment().format('LT');
    return moment().format('dddd, MMM Do');
  }
}
