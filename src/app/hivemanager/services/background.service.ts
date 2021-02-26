import { Injectable, NgZone } from '@angular/core';
import { Platform, ToastController } from '@ionic/angular';

import * as moment from 'moment';
import { StorageService } from './storage.service';
import { HiveService } from './hive.service';
import { TranslateService } from '@ngx-translate/core';
import { Events } from './events.service';

// TODO @chad declare let notificationManager: NotificationManagerPlugin.NotificationManager;

@Injectable({
    providedIn: 'root'
})
export class BackgroundService {

    public activePaymentPlan: HivePlugin.Payment.ActivePricingPlan = null;

    constructor(
        public zone: NgZone,
        public toastCtrl: ToastController,
        public events: Events,
        private storage: StorageService,
        private hiveService: HiveService,
        private translate: TranslateService
    ) {
    }

    public async init() {
      console.log("Background service: initializing ");
      this.getActivePaymentPlan();
    }

    async getActivePaymentPlan() {
        await this.hiveService.retrieveVaultLinkStatus();
        if (await this.hiveService.getActiveVault()) {
            console.log("Background service: Fetching active payment plan");

            this.activePaymentPlan = await this.hiveService.getActiveVault().getPayment().getActivePricingPlan();
            console.log("Background service: Got active payment plan", this.activePaymentPlan.getName(), this.activePaymentPlan);

            this.getTimeCheck();
        }
    }

    async getTimeCheck() {
        const lastCheckedTime = await this.storage.get('timeCheckedForExpiration');
        console.log('Background service: Time-checked for expiration', moment(lastCheckedTime).format('MMMM Do YYYY, h:mm'));

        const today = new Date();
        if(lastCheckedTime) {
            if(!moment(lastCheckedTime).isSame(today, 'd')) {
                this.storage.set('timeCheckedForExpiration', today);
                this.checkPlanExpiration(today);
            } else {
                console.log('Background service: Plan expiration already checked today');
            }
        } else {
            this.storage.set('timeCheckedForExpiration', today);
            this.checkPlanExpiration(today);
        }
    }

    checkPlanExpiration(today) {
        const weekFromNow = moment(today).add(7, 'days');
        const planExpiration = moment(this.activePaymentPlan.getEndTime() * 1000);

        console.log('Plan expiration', planExpiration.format('MMMM Do YYYY, h:mm'));
        if(planExpiration.isBetween(today, weekFromNow)) {
            const notification = {
                key: 'storagePlanExpiring',
                title: 'Storage Plan Expiring',
                message: 'You have a storage plan expiring soon. Please renew your plan before the expiration time.',
                url: 'https://launcher.elastos.net/app?id=' + 'org.elastos.trinity.dapp.hivemanager'
            };
            // TODO @chad when the notif service is ready - notificationManager.sendNotification(notification);
        }
    }
}
