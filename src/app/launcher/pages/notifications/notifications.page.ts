import { Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular';
import * as moment from 'moment';

import { GlobalThemeService } from 'src/app/services/global.theme.service';
import {
  NotificationManagerService,
  LauncherNotification,
  LauncherNotificationType
} from '../../services/notificationmanager.service';
import { TipsService } from '../../services/tips.service';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Events } from 'src/app/services/events.service';
import { App } from "src/app/model/app.enum"
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { DPoSVotingInitService } from 'src/app/dposvoting/services/init.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController,
    public notificationService: NotificationManagerService,
    private globalNav: GlobalNavService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private tipsService: TipsService,
    private events: Events,
    // In-app Services
    private hiveManagerInitService: HiveManagerInitService,
    private dposVotingInitService: DPoSVotingInitService,
    private walletInitService: WalletInitService,
  ) {
  }

  ngOnInit() {
    this.notificationService.init();
    this.notificationService.resetNewNotifications();
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
    this.titleBar.setTitle(this.translate.instant('notifications'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.NOTIFICATIONS });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.modalController.dismiss();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  async start(notification: LauncherNotification) {
    await this.close(notification);

    if (notification.type == LauncherNotificationType.TIP) {
      // Special "tip" notification: handle this directly in the launcher app without starting an intent
      Logger.log('Launcher', "Opening tip from notification", notification);

      const tipData = JSON.parse(notification.message);
      this.events.publish('notifications.tip', this.tipsService.findTipByIdentifier(tipData.key));
    } else {
      switch (notification.app) {
        case App.CONTACTS:
          this.globalNav.navigateTo(App.CONTACTS, '/contacts/friends');
        case App.CRCOUNCIL_VOTING:
        this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
        case App.CRPROPOSAL_VOTING:
          this.globalNav.navigateTo(App.CRPROPOSAL_VOTING, '/crproposalvoting/proposals/ALL');
        case App.SCANNER:
          this.globalNav.navigateTo(App.SCANNER, '/scanner/scan');
        case App.DEVELOPER_TOOLS:
          this.globalNav.navigateTo(App.DEVELOPER_TOOLS, '/developertools/home');
        case App.DPOS_VOTING:
          this.dposVotingInitService.start()
        case App.HIVE_MANAGER:
          this.hiveManagerInitService.start();
        case App.IDENTITY:
          this.globalNav.navigateTo(App.IDENTITY, '/identity/myprofile/home');
        case App.SETTINGS:
          this.globalNav.navigateTo(App.SETTINGS, '/settings/menu');
        case App.WALLET:
          this.walletInitService.start();
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
      this.tipsService.markTipAsViewed(tip);
    }

    if (this.notificationService.notifications.length === 0) {
      await this.modalController.dismiss();
    }
  }

  async closeAllNotifications() {
    for (let notification of this.notificationService.notifications) {
      await this.close(notification);
    }
  }

  getNotificationIcon(notification: LauncherNotification) {
    if (notification.type === LauncherNotificationType.SYSTEM) {
      if (this.theme.darkMode) {
        return "assets/launcher/icons/dark_mode/elalogo.svg";
      } else {
        return "assets/launcher/icons/elalogo.svg";
      }
    } else if (notification.type === LauncherNotificationType.CONTACT) {
      if (notification.contactAvatar && Object.keys(notification.contactAvatar).length !== 0) {
        return 'data:'+notification.contactAvatar.contentType+';base64,'+notification.contactAvatar.base64ImageData;
      } else {
        return "assets/launcher/icons/contact.png";
      }
    } else if (notification.type === LauncherNotificationType.NORMAL && notification.app) {
      return this.notificationService.getAppIcon(notification.app);
    } else {
      if (this.theme.darkMode) {
        return "assets/launcher/icons/dark_mode/elalogo.svg";
      } else {
        return "assets/launcher/icons/elalogo.svg";
      }
    }
  }

  getNotificationHeader(notification: LauncherNotification) {
    if (notification.type === LauncherNotificationType.CONTACT) {
      if (notification.contactName)
        return notification.contactName;
      else
        return this.translate.instant('from-unknown-contact');
    }
    else if (notification.app) {
      return this.notificationService.getAppTitle(notification.app);
    }
    else if (notification.type == LauncherNotificationType.TIP) {
      return this.translate.instant('tip-of-the-day');
    }
    else {
      return this.translate.instant('system-notification'); // Default if no title or if system
    }
  }

  getNotificationTitle(notification: LauncherNotification) {
    return notification.title;
  }

  getNotificationDate(notification: LauncherNotification) {
    return moment(Number(notification.sent_date)).startOf('minutes').fromNow();
  }

  getNotificationMessage(notification: LauncherNotification) {
    if (notification.type == LauncherNotificationType.TIP) {
      let jsonMessage = JSON.parse(notification.message);
      let translatedMessage: string = jsonMessage["message"];

      // Truncate long message - remove html tags
      return translatedMessage.replace(/<\/?[^>]+>/gi, "").substr(0, 100) + "...";
    }
    else {
      return notification.message;
    }
  }
}
