import { Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { DPoSVotingInitService } from 'src/app/voting/dposvoting/services/init.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { AppmanagerService } from '../../services/appmanager.service';
import {
  LauncherNotification,
  LauncherNotificationType, NotificationManagerService
} from '../../services/notificationmanager.service';
import { TipsService } from '../../services/tips.service';


@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  private modalAlreayDismiss = false;

  public notifications: LauncherNotification[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController,
    public notificationService: NotificationManagerService,
    private globalNav: GlobalNavService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private appManagerService: AppmanagerService,
    private tipsService: TipsService,
    private events: GlobalEvents,
    private hiveManagerInitService: HiveManagerInitService,
    private dposVotingInitService: DPoSVotingInitService,
    private walletInitService: WalletInitService
  ) {
  }

  ngOnInit() {
    this.notificationService.notifications.subscribe(notifications => this.notifications = notifications);
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
    this.titleBar.setTitle(this.translate.instant('launcher.notifications'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE });
    //this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.NOTIFICATIONS });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.closeNotificationPage();
    });

    if (this.theme.darkMode) {
      this.titleBar.setTheme('#121212', TitleBarForegroundMode.LIGHT);
    } else {
      this.titleBar.setTheme('#F5F5FD', TitleBarForegroundMode.DARK);
    }
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async closeNotificationPage() {
    if (!this.modalAlreayDismiss) {
      await this.modalController.dismiss();
      this.modalAlreayDismiss = true;
    }
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  async start(notification: LauncherNotification) {
    let url = notification.url;
    await this.close(notification);
    await this.closeNotificationPage();
    if (notification.type == LauncherNotificationType.TIP) {
      // Special "tip" notification: handle this directly in the launcher app without starting an intent
      Logger.log('Launcher', "Opening tip from notification", notification);

      const tipData = JSON.parse(notification.message);
      this.events.publish('notifications.tip', this.tipsService.findTipByIdentifier(tipData.key));
    } else {
      switch (notification.app) {
        case App.CONTACTS:
          void this.globalNav.navigateTo(App.CONTACTS, '/contacts/friends');
          break;
        case App.CRCOUNCIL_VOTING:
          void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
          break;
        case App.CRPROPOSAL_VOTING:
          if (url) {
            let index = url.indexOf('?hash=');
            if (index > 0) {
              let proposalHash = url.substring(index + 6)
              if (proposalHash) {
                return this.globalNav.navigateTo(App.CRPROPOSAL_VOTING, "/crproposalvoting/proposal-details", { state: { proposalHash: proposalHash } });
              }
            }
          }
          void this.globalNav.navigateTo(App.CRPROPOSAL_VOTING, '/crproposalvoting/proposals/all');
          break;
        case App.SCANNER:
          void this.globalNav.navigateTo(App.SCANNER, '/scanner/scan');
          break;
        case App.DEVELOPER_TOOLS:
          void this.globalNav.navigateTo(App.DEVELOPER_TOOLS, '/developertools/home');
          break;
        case App.DPOS_VOTING:
          void this.dposVotingInitService.start()
          break;
        case App.HIVE_MANAGER:
          void this.hiveManagerInitService.start();
          break;
        case App.IDENTITY:
          void this.globalNav.navigateTo(App.IDENTITY, '/identity/myprofile/home');
          break;
        case App.SETTINGS:
          void this.globalNav.navigateTo(App.SETTINGS, '/settings/menu');
          break;
        case App.WALLET:
          if (url) {
            void this.globalNav.navigateTo(App.WALLET, url);
          } else {
            this.walletInitService.start();
          }
          break;
        default:
          Logger.log('Launcher', "Notifications.page.start - No routing available");
      }
    }
  }

  async close(notification: LauncherNotification) {
    this.notificationService.clearNotification(notification.notificationId);

    if (notification.type == LauncherNotificationType.TIP) {
      // Dismissed tip = mark as viewed to not bother user again with it.
      let tipData = JSON.parse(notification.message);
      let tip = this.tipsService.findTipByIdentifier(tipData.key);
      void this.tipsService.markTipAsViewed(tip);
    }

    if (this.notifications.length === 0) {
      await this.closeNotificationPage();
    }
  }

  async closeAllNotifications() {
    for (let notification of this.notifications) {
      await this.close(notification);
    }
  }
}
