import { Injectable } from "@angular/core";

export enum App {
    DID_SESSIONS = "didsessions",
    LAUNCHER = "launcher",
    IDENTITY = "identity",
    CONTACTS = "contacts",
    WALLET = "wallet",
    CRCOUNCIL_VOTING = "crcouncilvoting",
    CRPROPOSAL_VOTING = "crproposalvoting",
    DEVELOPER_TOOLS = "developertools",
    DPOS_VOTING = "dposvoting",
    HIVE_MANAGER = "hivemanager",
    SETTINGS = "settings",
    SCANNER = "scanner"
}

/**
 * Object used to generate a notification.
 */
export type NotificationRequest = {
    /** Identification key used to overwrite a previous notification if it has the same key. */
    key: string;
    /** Title to be displayed as the main message on the notification. */
    title: string;
    /** Detailed message for this notification. */
    message: string;
    /** App that sent notification */
    app?: App;

    /** Process of deprecating **/
    url?: string;
    emitter?: string;
}

/**
 * Received notification.
 */
export type Notification = NotificationRequest & {
    /** Unique identifier for each notification. */
    notificationId: string;
    /** timestamp of the notification. */
    sent_date: number;

    /** Process of deprecating **/
    appId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class GlobalNotificationsService {

    public newNotifications = 0;
    public notifications: Notification[] = [];
    private itemClickedListeners: ((notification) => void)[] = [];

    constructor() {
    }

    /**
    * Sends a in-app notification. Notifications are usually displayed
    * by the launcher/home application, in a notifications panel, and they are directly used to
    * inform users of something they can potentially interact with.
    *
    * @param request The notification content.
    *
    * @returns A promise that can be awaited and catched in case or error.
    */
    public async sendNotification(request: NotificationRequest): Promise<void> {
        this.newNotifications++;
        this.notifications = this.notifications.filter(notification => notification.notificationId !== request.key);
        this.notifications.push({
            key: request.key,
            title: request.title,
            message: request.message,
            app: request.app ? request.app : null,
            notificationId: request.key ,
            sent_date: Date.now()
        });

        console.log('Notifications', this.notifications);
        return null;
    }

    /**
     * Returns all notifications previously received and not yet cleared.
     *
     * @returns Unread notifications.
     */
    public async getNotifications(): Promise<Notification[]> {
        return this.notifications;
    }

    /**
     * Removes a received notification from the notifications list permanently.
     *
     * @param notificationId Notification ID
     */
    public clearNotification(notificationId: string) {
        this.notifications = this.notifications.filter(notification => notification.notificationId !== notificationId);
    }

    public setNotificationListener(onNotification: (notification: Notification) => void) {
        this.itemClickedListeners.push(onNotification);
    }
}
