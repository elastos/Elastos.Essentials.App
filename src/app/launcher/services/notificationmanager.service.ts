import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { ContactAvatar } from 'src/app/services/contactnotifier.service';
import { GlobalNotificationsService, Notification } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { App } from "src/app/model/app.enum"

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
    private globalNotifications: GlobalNotificationsService,
    private theme: GlobalThemeService
  ) {
    this.platform.ready().then(() => {
      // this.setNotificationListener();
      this.init();
    });
  }

  init() {
    this.getNotifications();
  }
  async getNotifications() {
    this.notifications = await this.globalNotifications.getNotifications();
    Logger.log("Launcher", "Got notifications from the notification manager: " + JSON.stringify(this.notifications));
    this.fillAppInfoToNotification();

    if(this.globalNotifications.newNotifications > 0) {
      this.newNotifications = true;
    }
  }

  async fillAppInfoToNotification() {
    this.clearUselessNotification();
    for (let notification of this.notifications) {
      if (this.isNotificationATip(notification)) {
        notification.type = LauncherNotificationType.TIP;
      } else if (notification.emitter && (notification.emitter !== '')) {
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

      } else if (notification.app === App.LAUNCHER) {
        notification.type = LauncherNotificationType.SYSTEM;
      } else {
        notification.type = LauncherNotificationType.NORMAL;
      }
    }

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

  /**
   * Removes a received notification from the notifications list permanently.
   *
   * @param notificationId Notification ID
   */
  public clearNotification(notificationId: string) {
    this.notifications = this.notifications.filter((notification) => notification.notificationId !== notificationId);
    this.globalNotifications.clearNotification(notificationId);
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
        return 'launcher.app-contacts';
      case App.CRCOUNCIL_VOTING:
        return 'launcher.app-cr-council';
      case App.CRCOUNCIL_MANAGER:
        return 'launcher.app-cr-registration';
      case App.CRPROPOSAL_VOTING:
        return 'launcher.app-cr-proposal';
      case App.SCANNER:
        return 'launcher.app-scanner';
      case App.DPOS_VOTING:
        return 'launcher.app-dpos-voting';
      case App.DPOS_REGISTRATION:
        return 'launcher.app-dpos-registration';
      case App.HIVE_MANAGER:
        return 'launcher.app-hive';
      case App.IDENTITY:
        return 'launcher.app-identity';
      case App.SETTINGS:
        return 'launcher.app-settings';
      case App.WALLET:
        return 'launcher.app-wallet';
      case App.DEVELOPER_TOOLS:
        return 'launcher.app-dev-tools';
      default:
        return 'launcher.system-notification';
    }
  }

  getAppIcon(app: App) {
    switch (app) {
      case App.CONTACTS:
        return 'assets/contacts/images/logo.png';
      case App.CRCOUNCIL_VOTING:
        return 'assets/crcouncilvoting/images/logo.png';
      case App.CRCOUNCIL_MANAGER:
        return 'assets/crcouncilmanager/images/logo.png';
      case App.CRPROPOSAL_VOTING:
        return 'assets/crproposalvoting/images/logo.png';
      case App.SCANNER:
        return 'assets/scanner/imgs/logo.png';
      case App.DEVELOPER_TOOLS:
        return 'assets/developertools/images/logo.png';
      case App.DPOS_VOTING:
        return 'assets/dposvoting/images/logo.png';
      case App.DPOS_REGISTRATION:
        return 'assets/dposregistration/images/logo.png';
      case App.HIVE_MANAGER:
        return 'assets/hivemanager/images/logo.png';
      case App.IDENTITY:
        return 'assets/identity/images/logo.png';
      case App.SETTINGS:
        return 'assets/settings/icon/logo.png';
      case App.WALLET:
        return 'assets/wallet/images/logo.png';
      default:
        if (this.theme.darkMode) {
          return "assets/launcher/icons/dark_mode/elalogo.svg";
        } else {
          return "assets/launcher/icons/elalogo.svg";
        }
    }
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
}
