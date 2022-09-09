import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { ContactAvatar } from 'src/app/services/contactnotifier.service';
import { GlobalNotificationsService, Notification } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AppmanagerService } from './appmanager.service';

export const enum LauncherNotificationType {
  SYSTEM,
  CONTACT,
  NORMAL,
  TIP
}

export type LauncherNotification = Notification & {
  type?: LauncherNotificationType;
  contactName?: string;
  contactAvatar?: ContactAvatar;
};

/**
 * This service is a thin layer on top of the global notification service, in order to adjust notifications
 * for the launcher screens and widgets.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationManagerService {
  public notifications = new BehaviorSubject<LauncherNotification[]>([]);
  public newNotifications = false;

  constructor(
    private globalNotifications: GlobalNotificationsService,
    private translate: TranslateService,
    private theme: GlobalThemeService,
    private appManagerService: AppmanagerService,
    private modalCtrl: ModalController
  ) { }

  public init() {
    this.globalNotifications.notifications.subscribe(notifications => {
      this.prepareNotifications();
    });
  }

  async showNotifications(onDismissed: () => void): Promise<HTMLIonModalElement> {
    const NotificationsPage = (await import('../pages/notifications/notifications.page')).NotificationsPage;

    let modal = await this.modalCtrl.create({
      component: NotificationsPage,
      cssClass: 'running-modal',
      mode: 'ios',
    });
    void modal.onDidDismiss().then(() => { onDismissed(); });
    await modal.present();

    return modal;
  }

  private prepareNotifications() {
    let notifications = this.globalNotifications.getNotifications();
    Logger.log("Launcher", "Got notifications from the notification manager: " + JSON.stringify(this.notifications.value));

    this.notifications.next(this.createLauncherNotifications(notifications));

    if (this.globalNotifications.newNotifications > 0) {
      this.newNotifications = true;
    }
  }

  private createLauncherNotifications(notifications: Notification[]): LauncherNotification[] {
    let launcherNotifications: LauncherNotification[] = [];
    for (let notification of notifications) {
      // BPI Note: not too sure what this is for and why we can get "invalid" notifications... Just kept while moving code for now.
      if (!this.isValidNotification(notification)) {
        this.globalNotifications.clearNotification(notification.notificationId);
        continue;
      }

      let launcherNotification: LauncherNotification = {
        ...notification
      }

      if (this.isNotificationATip(notification)) {
        launcherNotification.type = LauncherNotificationType.TIP;
      } else if (notification.emitter && (notification.emitter !== '')) {
        launcherNotification.type = LauncherNotificationType.CONTACT;
      } else if (notification.app === App.LAUNCHER) {
        launcherNotification.type = LauncherNotificationType.SYSTEM;
      } else {
        launcherNotification.type = LauncherNotificationType.NORMAL;
      }

      launcherNotifications.push(launcherNotification);
    }

    Logger.log('Launcher', 'Launcher notifications:', launcherNotifications);
    return launcherNotifications;
  }

  /**
   * Removes a received notification from the notifications list permanently.
   *
   * @param notificationId Notification ID
   */
  public clearNotification(notificationId: string) {
    this.globalNotifications.clearNotification(notificationId);
  }

  // if no appid and no emitter, automatically delete the notification, because we don't know what to do with it.
  private isValidNotification(notification: LauncherNotification) {
    if (!notification.app && (!notification.emitter || notification.emitter === '')) {
      Logger.log('Launcher', 'notification is invalid: ', notification);
      return false;
    }
    return true;
  }

  private isNotificationATip(notification: LauncherNotification): boolean {
    try {
      let jsonMessage = JSON.parse(notification.message);
      if ("type" in jsonMessage && "message" in jsonMessage) {
        if (jsonMessage["type"] == "tip")
          return true;
      }

      // Other cases: not a tip
      return false;
    }
    catch (e) {
      // Not a JSON content, so this is not a special notification
      return false;
    }
  }

  public resetNewNotifications() {
    this.newNotifications = false;
    this.globalNotifications.newNotifications = 0;
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
        return 'data:' + notification.contactAvatar.contentType + ';base64,' + notification.contactAvatar.base64ImageData;
      } else {
        return "assets/launcher/icons/contact.png";
      }
    } else if (notification.type === LauncherNotificationType.NORMAL && notification.app) {
      return this.appManagerService.getAppIcon(notification.app);
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
        return this.translate.instant('launcher.from-unknown-contact');
    }
    else if (notification.app) {
      return this.translate.instant(this.appManagerService.getAppTitle(notification.app));
    }
    else if (notification.type == LauncherNotificationType.TIP) {
      return this.translate.instant('launcher.tip-of-the-day');
    }
    else {
      return this.translate.instant('launcher.system-notification'); // Default if no title or if system
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
