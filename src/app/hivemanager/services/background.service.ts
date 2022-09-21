import { Injectable, NgZone } from '@angular/core';
import { VaultInfo } from '@elastosfoundation/hive-js-sdk';
import { ToastController } from '@ionic/angular';
import * as moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';
import { HiveService } from './hive.service';


@Injectable({
    providedIn: 'root'
})
export class BackgroundService {
    public activePaymentPlan: VaultInfo = null;

    constructor(
        public zone: NgZone,
        public toastCtrl: ToastController,
        public events: GlobalEvents,
        private storage: GlobalStorageService,
        private hiveService: HiveService,
        private notificationsManager: GlobalNotificationsService
    ) {
    }

    public init() {
        //Logger.log("HiveManager", "Background service is initializing");
        //void this.getActivePaymentPlan();
    }

    /* async getActivePaymentPlan() {
        await this.hiveService.retrieveVaultLinkStatus();
        if (await this.hiveService.getActiveVault()) {
            Logger.log("HiveManager", "Background service: Fetching active payment plan");

            this.activePaymentPlan = await this.hiveService.getActiveVault().getPayment().getActivePricingPlan();
            Logger.log("HiveManager", "Background service: Got active payment plan", this.activePaymentPlan.getName(), this.activePaymentPlan);

            this.getTimeCheck();
        }
    } */

    async getTimeCheck() {
        const lastCheckedTime = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', 'timeCheckedForExpiration', 0);
        Logger.log("HiveManager", 'Background service: Time-checked for expiration', moment(lastCheckedTime).format('MMMM Do YYYY, h:mm'));

        const today = new Date();
        if (lastCheckedTime) {
            if (!moment(lastCheckedTime).isSame(today, 'd')) {
                await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', 'timeCheckedForExpiration', today);
                this.checkPlanExpiration(today);
            } else {
                Logger.log("hivemanager", 'Background service: Plan expiration already checked today');
            }
        } else {
            await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', 'timeCheckedForExpiration', today);
            this.checkPlanExpiration(today);
        }
    }

    checkPlanExpiration(today) {
        const weekFromNow = moment(today).add(7, 'days');
        //const planExpiration = moment(this.activePaymentPlan.getEndTime() * 1000);
        const planExpiration = moment().add(30, "days"); // TODO: getEndTime() is currently missing in Hive JS SDK - Re-enable the line above when fixed.

        Logger.log("hivemanager", 'Plan expiration', planExpiration.format('MMMM Do YYYY, h:mm'));
        if (planExpiration.isBetween(today, weekFromNow)) {
            const notification = {
                key: 'storagePlanExpiring',
                title: 'Storage Plan Expiring',
                message: 'You have a storage plan expiring soon. Please renew your plan before the expiration time.',
                app: App.HIVE_MANAGER
            };
            void this.notificationsManager.sendNotification(notification);
        }
    }
}
