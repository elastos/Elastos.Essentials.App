import { Injectable, NgZone } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { isNil } from 'lodash-es';
import * as moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { AuthService } from './auth.service';
import { DIDService } from './did.service';
import { ExpirationService } from './expiration.service';
import { LocalStorage } from './localstorage';
import { Native } from './native';

export interface LastExpirationNotification {
  last_check: string
}

@Injectable({
  providedIn: 'root'
})
export class BackgroundService extends GlobalService {
  private EXPIRATION_STORAGE_KEY = "LastExpirationVerification";
  private synchronizeTimeout: NodeJS.Timeout = null;
  private notifyTimeout: NodeJS.Timeout = null;

  constructor(
    public zone: NgZone,
    public toastCtrl: ToastController,
    public localStorage: LocalStorage,
    private didService: DIDService,
    private authService: AuthService,
    private expirationService: ExpirationService,
    private notifications: GlobalNotificationsService,
    public native: Native) {
    super();
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    Logger.log("Identity", "Identity background service is initializing for", signedInIdentity.didString);

    // Initialize the active DID - don't block, using services must be reactive
    void this.didService.loadGlobalIdentity().then(() => {
      // Wait a moment when Essentials starts, before starting a background sync.
      this.synchronizeTimeout = setTimeout(() => {
        void this.synchronizeActiveDIDAndRepeat();
      }, 30 * 1000); // 30 seconds

      // Notify expired DID and credentials
      this.notifyTimeout = setTimeout(() => {
        void this.notifyExpiredCredentials();
      }, 5 * 1000); // 5 seconds
    });

    return;
  }

  public onUserSignOut(): Promise<void> {
    // Sign out
    clearTimeout(this.synchronizeTimeout);
    clearTimeout(this.notifyTimeout);
    return;
  }

  // Synchronizes the active DID with the ID chain, to make sure we always have up to date information.
  private async synchronizeActiveDIDAndRepeat() {
    Logger.log("Identity", "Synchronizing current DID with ID chain");

    try {
      await this.didService.getActiveDidStore().synchronize();
      Logger.log("Identity", "Synchronization ended");
    }
    catch (err) {
      Logger.error("Identity", "Synchronization error:", err);
    }

    this.synchronizeTimeout = setTimeout(() => {
      void this.synchronizeActiveDIDAndRepeat();
    }, 30 * 60 * 1000); // Repeat after 30 minutes
  }

  private async notifyExpiredCredentials() {
    Logger.log("Identity", "Starting expiration notifications");
    if (await this.isExpirationAlreadyVerifiedToday()) {
      Logger.log("Identity", "Expiration was already checked today, next verification in 24h");

      this.notifyTimeout = setTimeout(() => {
        void this.notifyExpiredCredentials();
      }, 24 * 60 * 60 * 1000); // Repeat after 24 hours
    } else {
      Logger.log("Identity", "Starting check expirations");
      let maxDaysToExpire = 7;
      let expirations = await this.expirationService.getElementsAboutToExpireOnActiveDID(maxDaysToExpire);

      if (expirations.length > 0) {
        Logger.log("Identity", "Sending expirations notifications");
        expirations.forEach(expiration => {
          void this.notifications.sendNotification({
            app: App.IDENTITY,
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

      this.notifyTimeout = setTimeout(() => {
        void this.notifyExpiredCredentials();
      }, 24 * 60 * 60 * 1000); // Repeat after 24 hours

      Logger.log("Identity", "End expiration notifications, next verification in 24h");
    }
  }

  private isExpirationAlreadyVerifiedToday(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      Logger.log("Identity", "Verify if expiration was already checked today");
      this.localStorage.get(this.EXPIRATION_STORAGE_KEY).then(storedChecked => {
        // Verify if was checked today
        if (!isNil(storedChecked)) {
          let lastCheckDate = moment(storedChecked.last_check, "YYYY-MM-DD");
          resolve(moment({}).isSame(lastCheckDate, 'day'));
        } else {
          resolve(false)
        }
      }).catch(err => {
        resolve(false)
      })
    });
  }
}
