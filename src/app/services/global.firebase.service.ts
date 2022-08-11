import { Injectable } from '@angular/core';
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
//import { FirebaseAnalytics } from '@awesome-cordova-plugins/firebase-analytics/ngx';
import { FirebaseX } from '@awesome-cordova-plugins/firebase-x/ngx';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, filter } from 'rxjs';
import { Logger } from '../logger';

// Network templates are dynamic but for convenience, assume we always have mainnet and testnet ones.
export const MAINNET_TEMPLATE = "MainNet";
export const TESTNET_TEMPLATE = "TestNet";

/**
 * Manages interactions with Firebase, including device token creation and reception of push messages.
 *
 * NOTE: Firebase doesn't work from China. Make sure essentials can always work in degraded mode
 * even without firebase features.
 *
 * To DEBUG firebase EVENTS:
 * - In firebase, use DEBUG_VIEW
 * - On android, enable debugging:
 *      adb shell setprop debug.firebase.analytics.app <package_name>
 * - To later disable it:
 *      adb shell setprop debug.firebase.analytics.app .none.
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalFirebaseService {
    public static instance: GlobalFirebaseService;

    // Device token generated by firebase when first installing the app (can sometimes be renewed but rarely).
    public token: BehaviorSubject<string> = new BehaviorSubject(null);

    constructor(private platform: Platform, private firebase: FirebaseX, private router: Router) {
        GlobalFirebaseService.instance = this;

        // Every time the router route changes, update the current screen name in firebase analytics for more accurate screen context of other events.
        this.router.events.pipe(
            filter((e: RouterEvent) => e instanceof NavigationEnd),
        ).subscribe((e: RouterEvent) => {
            void this.firebase.setScreenName(e.url)
        });
    }

    public init(): Promise<void> {
        void this.platform.ready().then(() => {
            void this.firebase.getToken().then(token => {
                Logger.log("firebase", "Got device FCM token:", token);
                this.token.next(token);
            }).catch(err => {
                if (new String(err).startsWith("SERVICE_NOT_AVAILABLE"))
                    Logger.warn("firebase", "Firebase was unable to renew the push notification token. Push notifications won't be received. Original error:", err);
            });

            this.firebase.onMessageReceived().subscribe(msg => {
                Logger.log("firebase", "Received message", msg);
            });

            void this.firebase.setAnalyticsCollectionEnabled(true);
        });
        return;
    }

    public logEvent(eventName: string, data: any = {}) {
        try {
            void this.firebase.logEvent(eventName, data);
        }
        catch (e) {
            Logger.error("firebase", "Log event error:", e);
        }
    }
}
