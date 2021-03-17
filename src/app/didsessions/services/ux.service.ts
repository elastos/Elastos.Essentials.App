import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController } from '@ionic/angular';
import { OptionsComponent } from '../components/options/options.component';
import { WarningComponent } from '../components/warning/warning.component';
import { Events } from './events.service';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService, App } from 'src/app/services/global.nav.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';

let selfUxService: UXService = null;

@Injectable({
    providedIn: 'root'
})
export class UXService {

    public static instance: UXService = null;

    public popover: any = null; // Generic Popover
    public modal: any = null;
    public options: any = null; // Options Popover

    constructor(
        public translate: TranslateService,
        private zone: NgZone,
        private nav: GlobalNavService,
        private native: GlobalNativeService,
        private popoverCtrl: PopoverController,
        private events: Events,
        private didSessions: GlobalDIDSessionsService
    ) {
        selfUxService = this;
        UXService.instance = this;

        this.events.subscribe('showDeletePrompt', (identity) => {
          this.zone.run(() => {
            this.showDeletePrompt(identity);
          });
        });
    }

    async init() {
    }

    onTitleBarItemClicked(icon: TitleBarIcon) {
      // Dimiss controllers before using titlebar icons
      if(this.popover) {
        this.popover.dismiss();
      }
      if(this.options) {
        this.options.dismiss();
      }
      if(this.modal) {
        this.modal.dismiss();
      }

      console.log('Titlebar item clicked', icon);
      switch (icon.key) {
        // When in create-identity pg
        case 'backToRoot':
          this.navigateRoot();
          break;
        // For all other pages that need back navigation
        case 'back':
          this.nav.navigateBack();
          break;
        case 'language':
          this.go('language');
          break;
        case 'scan':
          this.go('scan');
          break;
      }
    }

    async navigateRoot() {
        // Redirect to the appropriate screen depending on available identities
        let identities = await this.didSessions.getIdentityEntries();
        if (identities.length == 0) {
            Logger.log("didsessions", "No existing identity. Navigating to language chooser then createidentity");
            this.nav.navigateRoot(App.DID_SESSIONS, "language");
        }
        else {
            Logger.log("didsessions", "Navigating to pickidentity");
            this.nav.navigateRoot(App.DID_SESSIONS, "pickidentity");
        }
    }

    // Sensitive data should not be passed through queryParams
    public go(page: any, options: any = {}) {
        this.zone.run(() => {
            this.native.hideLoading();
            this.nav.navigateTo(App.DID_SESSIONS, page, { state: options });
        });
    }

    public goToLauncer() {
      this.nav.navigateHome();
    }

    public translateInstant(key: string): string {
        return this.translate.instant(key);
    }

    public toast(message: string = '操作完成', duration: number = 2000): void {
      this.native.genericToast(message, duration);
    }

    public toast_trans(message: string = '', duration: number = 2000): void {
      this.native.genericToast(message, duration);
    }

    public async showLoading(content: string) {
      this.native.showLoading(content);
    };

    public async hideLoading() {
      await this.native.hideLoading();
    }

    async showOptions(ev: any, identityEntry: IdentityEntry) {
      console.log('Opening profile options');

      this.options = await this.popoverCtrl.create({
        mode: 'ios',
        component: OptionsComponent,
        cssClass: 'options-component',
        componentProps: {
          identityEntry: identityEntry
        },
        event: ev,
        translucent: false
      });
      this.options.onWillDismiss().then(() => {
        this.options = null;
      });
      return await this.options.present();
    }

    private async showDeletePrompt(identity) {
      this.popover = await this.popoverCtrl.create({
        mode: 'ios',
        cssClass: 'warning-component',
        component: WarningComponent,
        componentProps: {
          identityEntry: identity
        },
        translucent: false
      });

      this.popover.onWillDismiss().then(() => {
        this.popover = null;
      });

      return await this.popover.present();
    }
}
