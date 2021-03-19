import { Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular';
import * as moment from 'moment';

import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import {
  NotificationManagerService,
  LauncherNotification,
  LauncherNotificationType
} from '../../services/notificationmanager.service';
import { TipsService } from '../../services/tips.service';
import { Events } from '../../services/events.service';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  constructor(
    private sanitizer: DomSanitizer,
    private modalController: ModalController,
    public notificationService: NotificationManagerService,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private tipsService: TipsService,
    private events: Events
  ) {
  }

  ngOnInit() {
    this.notificationService.resetNewNotifications();
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE });
    this.titleBar.addOnItemClickedListener((icon) => {
      this.modalController.dismiss();
    });
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
    }
    else if (notification.url && (notification.url !== '')) {
      Logger.log('Launcher', 'NotificationsComponent sendUrlIntent');

      // NOTE @chad: try to avoid the dependency notif page -> app manager service -> notif page
      // For this, i think the notif page could avoid calling appservice directly and instand, send a kind of
      // "open notification request" event that would be handled by the app manager service to execute the commented
      // code below.

      /* TODO @chad
      this.essentialsIntent.sendUrlIntent(notification.url,
        () => {Logger.log('Launcher', 'sendUrlIntent success'); },
        (error) => {Logger.log('Launcher', 'NotificationsComponent sendUrlIntent failed, ', error); }
      );*/
    } else {
      // TODO @chad this.essentialsIntent.start(notification.app.id);
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
    console.log('NOTIFICATION', notification);
    if (notification.type === LauncherNotificationType.SYSTEM) {
      if (this.theme.activeTheme.value == AppTheme.DARK) {
        return "assets/icons/dark_mode/elalogo.svg";
      } else {
        return "assets/icons/elalogo.svg";
      }
    } else if (notification.type === LauncherNotificationType.CONTACT) {
      if (notification.contactAvatar && Object.keys(notification.contactAvatar).length !== 0) {
        return 'data:'+notification.contactAvatar.contentType+';base64,'+notification.contactAvatar.base64ImageData;
      } else {
        return "assets/icons/contact.png";
      }
    } else if (notification.type === LauncherNotificationType.NORMAL && notification.app) {
      return this.notificationService.getAppIcon(notification.app);
    } else {
      if (this.theme.activeTheme.value == AppTheme.DARK) {
        return "assets/icons/dark_mode/elalogo.svg";
      } else {
        return "assets/icons/elalogo.svg";
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
