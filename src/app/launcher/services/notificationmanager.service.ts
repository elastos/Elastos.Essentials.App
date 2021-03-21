import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { ContactAvatar } from 'src/app/services/contactnotifier.service';
import { GlobalNotificationsService, Notification, App } from 'src/app/services/global.notifications.service';

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

@Injectable({
  providedIn: 'root'
})
export class NotificationManagerService {
  public notifications: LauncherNotification[] = [];
  public newNotifications: boolean = false;

  constructor(
    private platform: Platform,
    private zone: NgZone,
    private globalNotifications: GlobalNotificationsService
  ) {
    this.platform.ready().then(() => {
      // this.setNotificationListener();
      this.getNotifications();
    });
  }

  /*public async sendNotification(request: NotificationRequest): Promise<void> {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    this.notifications.push({
      key: request.key,
      title: request.title,
      message: request.message,
      url: request.url,
      emitter: request.emitter,
      notificationId: characters.charAt(Math.floor(Math.random() * characters.length)),
      appId: request.url,
      sent_date: Date.now(),
    });

    //

    return null;
  }*/

  /**
   * Removes a received notification from the notifications list permanently.
   *
   * @param notificationId Notification ID
   */
  public clearNotification(notificationId: string) {
    this.notifications = this.notifications.filter((notification) => notification.notificationId !== notificationId);
    this.globalNotifications.clearNotification(notificationId);
  }


 /*  setNotificationListener() {
    this.globalNotifications.setNotificationListener((notification) => {
      Logger.log('Launcher', 'new notification:', notification);

      this.zone.run(() => {
        if (!this.isValidNotification(notification)) {
          return;
        }

        // Update notifications
        this.notifications = this.notifications.filter((item) => item.notificationId !== notification.notificationId);
        this.notifications.unshift(notification);
        this.updateBadge();
      });
    });
  } */

  async getNotifications() {
    const notifications = await this.globalNotifications.getNotifications();
    Logger.log("Launcher", "Got notifications from the notification manager: " + JSON.stringify(notifications));
    this.fillAppInfoToNotification(notifications);

    if(this.globalNotifications.newNotifications > 0) {
      this.newNotifications = true;
    }
  }

  async fillAppInfoToNotification(allApps: Notification[]) {
    this.clearUselessNotification();

    for (let notification of this.notifications) {
      if (this.isNotificationATip(notification)) {
        notification.type = LauncherNotificationType.TIP;
      }
      else if (notification.emitter && (notification.emitter !== '')) {
        notification.type = LauncherNotificationType.CONTACT;
        // Resolve contact to show a nice name.
 /*        const contact = await contactNotifier.resolveContact(notification.emitter);
        if (contact) {
          contact.getName() ? notification.contactName = contact.getName() : notification.contactName = null;
          contact.getAvatar() ? notification.contactAvatar = contact.getAvatar() : notification.contactAvatar = null;
          Logger.log('Launcher', 'Contact notification obj', contact);
        } else {
          notification.contactName = null;
          notification.contactAvatar = null;
        } */
      } else if (notification.appId === 'system' || notification.appId === "org.elastos.trinity.launcher") {
        notification.type = LauncherNotificationType.SYSTEM;
      } else {
        notification.type = LauncherNotificationType.NORMAL;
      }
    }

    this.notifications = this.notifications.filter((item) => item.notificationId !== null);

    Logger.log('Launcher', 'notifications:', this.notifications);
  }

  clearUselessNotification() {
    this.notifications.forEach((notification: LauncherNotification) => {
      if (!this.isValidNotification(notification)) {
        Logger.log('Launcher', 'clearNotification ', notification.notificationId);
        this.clearNotification(notification.notificationId);
        notification.notificationId = null;
      }
    });

    // remove from array
    this.notifications = this.notifications.filter((item) => item.notificationId !== null);
  }

  // if no appid and no emitter, automatically delete the notification, because we don't know what to do with it.
  isValidNotification(notification: LauncherNotification) {
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

  resetNewNotifications() {
    this.newNotifications = false;
    this.globalNotifications.newNotifications = 0;
  }

  getAppTitle(app: App) {
    switch (app) {
      case App.CONTACTS:
        return 'wallet';
      case App.CRCOUNCIL_VOTING:
        return 'crcouncil-voting';
      case App.CRPROPOSAL_VOTING:
        return 'crproposal-voting';
      case App.SCANNER:
        return 'scanner';
      case App.DEVELOPER_TOOLS:
        return 'developer-tools';
      case App.DID_SESSIONS:
        return 'did-sessions';
      case App.DPOS_VOTING:
        return 'dpos-voting';
      case App.HIVE_MANAGER:
        return 'hive-manager';
      case App.IDENTITY:
        return 'identity';
      case App.LAUNCHER:
        return 'launcher';
      case App.SETTINGS:
        return 'settings';
      case App.WALLET:
        return 'wallet';
      default:
        return 'system-notification';
    }
  }

  getAppIcon(app: App) {
    switch (app) {
      case App.CONTACTS:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.CRCOUNCIL_VOTING:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.CRPROPOSAL_VOTING:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.SCANNER:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.DEVELOPER_TOOLS:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.DID_SESSIONS:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.DPOS_VOTING:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.HIVE_MANAGER:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.IDENTITY:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.LAUNCHER:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.SETTINGS:
        return 'assets/launcher/notifications/apps/elastos.png';
      case App.WALLET:
        return 'assets/launcher/notifications/apps/elastos.png';
      default:
        return 'assets/launcher/notifications/apps/elastos.png';
    }
  }
}
