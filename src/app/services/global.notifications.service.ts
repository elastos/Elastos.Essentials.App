import { Injectable, NgZone } from "@angular/core";
import { Platform } from "@ionic/angular";
import { ContactAvatar } from "./contactnotifier.service";

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
    /** Intent URL emitted when the notification is clicked. */
    url?: string;
    /** Contact DID emitting this notification, in case of a remotely received notification. */
    emitter?: string;
}

/**
 * Received notification.
 */
export type Notification = NotificationRequest & {
    /** Unique identifier for each notification. */
    notificationId: string;
    /** Identification key used to overwrite a previous notification (for the same app id) if it has the same key. */
    key: string;
    /** Package ID of the sending app. */
    appId: string;
    /** timestamp of the notification. */
    sent_date: number;
}

@Injectable({
    providedIn: 'root'
})
export class GlobalNotificationsService {
    constructor(
        private platform: Platform
    ) {
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
        // TODO @chad

        return null;
    }

    /**
     * Registers a callback that will receive all the incoming in-app notifications (sent by this instance
     * of elastOS/Trinity or by a remote contact).
     *
     * @param onNotification Callback passing the received notification info.
     */
    public setNotificationListener(onNotification: (notification: Notification) => void) {
        // TODO @chad
    }

    /**
     * Returns all notifications previously received and not yet cleared.
     *
     * @returns Unread notifications.
     */
    public async getNotifications(): Promise<Notification[]> {
        // TODO @chad
        return [];
    }

    /**
     * Removes a received notification from the notifications list permanently.
     *
     * @param notificationId Notification ID
     */
    public clearNotification(notificationId: string) {
        // TODO @chad
    }
}