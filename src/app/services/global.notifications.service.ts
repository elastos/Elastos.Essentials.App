import { Subject } from "rxjs";
import { Injectable } from "@angular/core";
import { App } from "src/app/model/app.enum"
import { Logger } from "../logger";
import { GlobalStorageService } from "../services/global.storage.service";
import { GlobalDIDSessionsService, IdentityEntry } from "./global.didsessions.service";
import { GlobalService, GlobalServiceManager } from "./global.service.manager";

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
export class GlobalNotificationsService extends GlobalService {
    public newNotifications = 0;
    public notifications: Notification[] = [];
    private notificationsListener: Subject<Notification> = new Subject();

    constructor(
        private globalStorageService: GlobalStorageService,
    ) {
        super();
    }

    public async init() {
        GlobalServiceManager.getInstance().registerService(this);
    }

    public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        this.notifications = await this.globalStorageService.getSetting(GlobalDIDSessionsService.signedInDIDString, "notifications", "notifications", []);
        Logger.log("notifications", "Loaded existed notifications", this.notifications);
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
    public async sendNotification(request: NotificationRequest): Promise<void> {
        const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
        const notificationsLength = this.notifications.length;
        this.notifications = this.notifications.filter(notification => notification.key !== request.key);
        let notification: Notification = {
            key: request.key,
            title: request.title,
            message: request.message,
            app: request.app ? request.app : null,
            notificationId: characters.charAt(Math.floor(Math.random() * characters.length)),
            sent_date: Date.now()
        };
        this.notifications.push(notification);
        this.saveNotifications();

        Logger.log('Notifications', "Sending notification", notification);

        if(this.notifications.length > notificationsLength) {
            this.newNotifications++;
        }

        this.notificationsListener.next(notification);

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
        this.saveNotifications();
    }

    /**
     * Saves current notifications array to persistent storage.
     */
    private saveNotifications() {
        this.globalStorageService.setSetting(GlobalDIDSessionsService.signedInDIDString, "notifications", "notifications", this.notifications);
    }

    public setNotificationListener(onNotification: (notification: Notification) => void) {
        this.notificationsListener.subscribe((notification)=>{
            onNotification(notification);
        });
    }
}
