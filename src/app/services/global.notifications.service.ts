import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { App } from "src/app/model/app.enum";
import { Logger } from "../logger";
import { IdentityEntry } from "../model/didsessions/identityentry";
import { GlobalStorageService } from "../services/global.storage.service";
import { GlobalService, GlobalServiceManager } from "./global.service.manager";
import { DIDSessionsStore } from './stores/didsessions.store';

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
    app: App;

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
export class GlobalNotificationsService extends GlobalService {
    public static instance: GlobalNotificationsService = null;

    public newNotifications = 0;
    private _notifications: Notification[] = [];

    public notifications = new BehaviorSubject<Notification[]>([]);

    constructor(
        private globalStorageService: GlobalStorageService,
    ) {
        super();
        GlobalNotificationsService.instance = this;
    }

    public init() {
        GlobalServiceManager.getInstance().registerService(this);
    }

    public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        this._notifications = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, "notifications", "notifications", []);
        Logger.log("notifications", "Loaded existed notifications", this._notifications);
        this.notifications.next(this._notifications);
    }

    public async onUserSignOut(): Promise<void> {

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
    public sendNotification(request: NotificationRequest): Promise<void> {
        const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
        const notificationsLength = this._notifications.length;
        this._notifications = this._notifications.filter(notification => notification.key !== request.key);
        let notification: Notification = {
            key: request.key,
            title: request.title,
            message: request.message,
            app: request.app ? request.app : null,
            notificationId: characters.charAt(Math.floor(Math.random() * characters.length)),
            url: request.url ? request.url : null,
            sent_date: Date.now()
        };
        this._notifications.push(notification);
        this._notifications.sort((a, b) => {
            if (a.sent_date > b.sent_date)
                return -1;
            else if (a.sent_date < b.sent_date)
                return 1;
            else
                return 0;
        });
        this.saveNotifications();

        Logger.log('Notifications', "Sending notification", notification);

        if (this._notifications.length > notificationsLength) {
            this.newNotifications++;
        }

        this.notifications.next(this._notifications);

        return null;
    }

    /**
     * Returns all notifications previously received and not yet cleared.
     *
     * @returns Unread notifications.
     */
    public getNotifications(): Notification[] {
        return this._notifications;
    }

    /**
     * Removes a received notification from the notifications list permanently.
     *
     * @param notificationId Notification ID
     */
    public clearNotification(notificationId: string) {
        this._notifications = this._notifications.filter(notification => notification.notificationId !== notificationId);
        this.saveNotifications();

        this.notifications.next(this._notifications);
    }

    /**
     * Saves current notifications array to persistent storage.
     */
    private saveNotifications() {
        void this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, "notifications", "notifications", this._notifications);
    }
}
