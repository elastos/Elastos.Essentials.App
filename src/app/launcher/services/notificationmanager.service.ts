import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { ContactAvatar } from 'src/app/services/contactnotifier.service';
import { GlobalNotificationsService, Notification, NotificationRequest } from 'src/app/services/global.notifications.service';

export const enum LauncherNotificationType {
  SYSTEM,
  CONTACT,
  NORMAL,
  TIP
}

export type LauncherNotification = Notification & {
  type?: LauncherNotificationType;
  app?: any;
  contactName?: string;
  contactAvatar?: ContactAvatar;
};

@Injectable({
  providedIn: 'root'
})
export class NotificationManagerService {
  public notifications: LauncherNotification[] = [];

  constructor(
    private platform: Platform,
    private zone: NgZone,
    private globalNotifications: GlobalNotificationsService
  ) {
    this.platform.ready().then(() => {
      this.setNotificationListener();
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


  setNotificationListener() {
    this.globalNotifications.setNotificationListener((notification) => {
      console.log('new notification:', notification);

      this.zone.run(() => {
        if (!this.isValidNotification(notification)) {
          return;
        }

        // Update notifications
        this.notifications = this.notifications.filter((item) => item.notificationId !== notification.notificationId);
        this.notifications.unshift(notification);
        this.updateBadge();
        // this.events.publish('updateNotifications');
      });
    });
  }

  async getNotifications() {
    const notifications = await this.globalNotifications.getNotifications();
    Logger.log("Launcher", "Got notifications from the notification manager: " + JSON.stringify(notifications));
    this.notifications = notifications;
    this.clearUselessNotification();
    this.updateBadge();
  }

  deleteNotification(notificationId: string) {
    this.clearNotification(notificationId);
    this.notifications = this.notifications.filter((item) => item.notificationId !== notificationId);
    this.updateBadge();
  }

  /* TODO @chad - rework
  async fillAppInfoToNotification(allApps: AppManagerPlugin.AppInfo[]) {
    this.clearUselessNotification();

    for (let notification of this.notifications) {
      if (this.isNotificationATip(notification)) {
        notification.type = LauncherNotificationType.TIP;
      }
      else if (notification.emitter && (notification.emitter !== '')) {
        notification.type = LauncherNotificationType.CONTACT;
        // Resolve contact to show a nice name.
        const contact = await contactNotifier.resolveContact(notification.emitter);
        if (contact) {
          contact.getName() ? notification.contactName = contact.getName() : notification.contactName = null;
          contact.getAvatar() ? notification.contactAvatar = contact.getAvatar() : notification.contactAvatar = null;
          console.log('Contact notification obj', contact);
        } else {
          notification.contactName = null;
          notification.contactAvatar = null;
        }
      } else if (notification.appId === 'system' || notification.appId === "org.elastos.trinity.launcher") {
        notification.type = LauncherNotificationType.SYSTEM;
      } else {
          notification.app = allApps.find(app => app.id === notification.appId);
          // if the app doesn't exist, delete the notificaiton automatically
          if (!notification.app) {
              console.log('fillAppInfoToNotification: ' + notification.appId + " doesn't exist, delete it");
              notificationManager.clearNotification(notification.notificationId);
              notification.notificationId = null;
          } else {
            notification.type = LauncherNotificationType.NORMAL;
          }
      }
    }

    this.notifications = this.notifications.filter((item) => item.notificationId !== null);
    this.updateBadge();

    console.log('notifications:', this.notifications);
  }
  */

  clearUselessNotification() {
    this.notifications.forEach((notification: LauncherNotification) => {
      if (!this.isValidNotification(notification)) {
        console.log('clearNotification ', notification.notificationId);
        this.clearNotification(notification.notificationId);
        notification.notificationId = null;
      }
    });

    // remove from array
    this.notifications = this.notifications.filter((item) => item.notificationId !== null);
  }

  // if no appid and no emitter, automatically delete the notification, because we don't know what to do with it.
  isValidNotification(notification: LauncherNotification) {
    if (notification.appId === '' && (!notification.emitter || notification.emitter === '')) {
      console.log('notification is invalid: ', notification);
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

  updateBadge() {
    // TODO @chad titleBarManager.setBadgeCount(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, this.notifications.length);
  }
}
