import { Injectable, NgZone } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { LocalStorage } from './localstorage';
import { PopupProvider } from './popup';
import { Native } from './native';
import { DIDService } from './did.service';
import { AuthService } from './auth.service';
import { ExpirationService } from './expiration.service';
import { isNullOrUndefined } from 'util';

import * as moment from 'moment';
import { NotificationManagerService } from 'src/app/launcher/services/notificationmanager.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';


export interface LastExpirationNotification {
    last_check: string
}

@Injectable({
    providedIn: 'root'
})
export class BackgroundService {
    private EXPIRATION_STORAGE_KEY : string = "LastExpirationVerification";

    constructor(
        public zone: NgZone,
        public toastCtrl: ToastController,
        public popupProvider: PopupProvider,
        public localStorage: LocalStorage,
        private didService: DIDService,
        private authService: AuthService,
        private expirationService: ExpirationService,
        private notificationManager: NotificationManagerService,
        private didsessions: GlobalDIDSessionsService,
        public native: Native) {
    }

    public async init() {
      // TODO: STOP TIMERS WHEN SWITCHING TO ANOTHER DID USER HERE!
      this.didsessions.signedInIdentityListener.subscribe(async (signedInIdentity)=>{
        if (signedInIdentity) {
          Logger.log("Identity", "Identity background service is initializing for",signedInIdentity.didString);

          // Initialize the active DID
          await this.didService.loadGlobalIdentity();

          // Wait a moment when elastOS starts, before starting a background sync.
          setTimeout(() => {
            this.synchronizeActiveDIDAndRepeat();
          }, 30*1000); // 30 seconds

          //Notify expired DID and credentials
          setTimeout(async () => {
            await this.notifyExpiredCredentials();
          }, 5 * 1000); // 5 seconds
        }
      });
    }

    // Synchronizes the active DID with the ID chain, to make sure we always have up to date information.
    private synchronizeActiveDIDAndRepeat() {
      Logger.log("Identity", "Synchronizing current DID with ID chain");

      this.authService.checkPasswordThenExecute(async ()=>{
        Logger.log("Identity", "Synchronization is starting");
        await this.didService.getActiveDidStore().synchronize(this.authService.getCurrentUserPassword());
        Logger.log("Identity", "Synchronization ended");

        setTimeout(() => {
          this.synchronizeActiveDIDAndRepeat();
        }, 30*60*1000); // Repeat after 30 minutes
      }, () => {
        // Operation cancelled
        Logger.log("Identity", "Password operation cancelled");
        this.native.hideLoading();

        setTimeout(()=>{
          this.synchronizeActiveDIDAndRepeat();
        }, 1*60*1000); // Retry after 1 minute
      }, false);
    }

    private async notifyExpiredCredentials()   {
      Logger.log("Identity", "Starting expiration notifications");
        if (await this.isExpirationAlreadyVerifiedToday()){
          Logger.log("Identity", "Expiration was already checked today, next verification in 24h");

          setTimeout(()=>{
            this.notifyExpiredCredentials();
          }, 24*60*60*1000); // Repeat after 24 hours
        } else {
          Logger.log("Identity", "Starting check expirations");
          let maxDaysToExpire: number = 7;
          let expirations = await this.expirationService.getElementsAboutToExpireOnActiveDID(maxDaysToExpire);

          if (expirations.length > 0)
          {
            Logger.log("Identity", "Sending expirations notifications");
            expirations.forEach(expiration =>{
              this.notificationManager.sendNotification({
                key: expiration.id,
                title: "Expiration",
                message: expiration.message
              })
            })
          }

          let lastCheck: LastExpirationNotification = {
            last_check: moment({}).format("YYYY-MM-DD")
          }
          await this.localStorage.set(this.EXPIRATION_STORAGE_KEY, lastCheck);

          setTimeout(()=>{
            this.notifyExpiredCredentials();
          }, 24*60*60*1000); // Repeat after 24 hours

          Logger.log("Identity", "End expiration notifications, next verification in 24h");
        }
    }

    private isExpirationAlreadyVerifiedToday() : Promise<boolean> {
      return new Promise<boolean>((resolve, reject) =>{
        Logger.log("Identity", "Verify if expiration was already checked today");
          this.localStorage.get(this.EXPIRATION_STORAGE_KEY).then(storedChecked =>{
            // Verify if was checked today
            if (!isNullOrUndefined(storedChecked))
            {
              let lastCheckDate = moment(storedChecked.last_check, "YYYY-MM-DD");
              resolve(moment({}).isSame(lastCheckDate,'day'));
            } else {
              resolve(false)
            }
          }).catch(err =>{
            resolve(false)
          })
      });
    }


}
