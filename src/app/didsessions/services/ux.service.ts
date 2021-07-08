import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PopoverController, LoadingController } from '@ionic/angular';
import { OptionsComponent } from '../components/options/options.component';
import { WarningComponent } from '../components/warning/warning.component';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService, Direction } from 'src/app/services/global.nav.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { Events } from 'src/app/services/events.service';
import { App } from "src/app/model/app.enum"
import { GlobalThemeService, AppTheme } from 'src/app/services/global.theme.service';

let selfUxService: UXService = null;

@Injectable({
    providedIn: 'root'
})
export class UXService {

    public static instance: UXService = null;

    public popover: any = null; // Generic Popover
    public modal: any = null;
    public options: any = null; // Options Popover
    private loader: any = null;

    constructor(
        public translate: TranslateService,
        private zone: NgZone,
        private nav: GlobalNavService,
        private native: GlobalNativeService,
        private popoverCtrl: PopoverController,
        private events: Events,
        private didSessions: GlobalDIDSessionsService,
        private loadingCtrl: LoadingController,
        private theme: GlobalThemeService
    ) {
        selfUxService = this;
        UXService.instance = this;

        this.events.subscribe('showDeleteIdentityPrompt', (identity) => {
          this.zone.run(() => {
            void this.showDeletePrompt(identity);
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

      Logger.log('didsessions', 'Titlebar item clicked', icon);
      switch (icon.key) {
        // When in create-identity pg
        case 'backToRoot':
          void this.navigateRoot();
          break;
        // For all other pages that need back navigation
        case 'back':
          void this.nav.navigateBack();
          break;
        case 'language':
          this.go('/didsessions/language');
          break;
        case 'theme':
          void this.theme.toggleTheme();
          break;
        case 'scan':
          this.go('/didsessions/scan');
          break;
      }
    }

    async navigateRoot() {
        // Redirect to the appropriate screen depending on available identities
        let identities = await this.didSessions.getIdentityEntries();
        if (identities.length == 0) {
            Logger.log("didsessions", "No existing identity. Navigating to language chooser then createidentity");
            await this.nav.navigateRoot(App.DID_SESSIONS, "didsessions/language", { animationDirection: Direction.FORWARD });
        }
        else {
            Logger.log("didsessions", "Navigating to pickidentity");
            await this.nav.navigateRoot(App.DID_SESSIONS, "didsessions/pickidentity", { animationDirection: Direction.BACK });
        }
    }

    // Sensitive data should not be passed through queryParams
    public go(page: any, options: any = {}) {
        this.zone.run(() => {
            void this.native.hideLoading();
            void this.nav.navigateTo(App.DID_SESSIONS, page, { state: options });
        });
    }

    public translateInstant(key: string): string {
        return this.translate.instant(key);
    }

    public toast(message = '操作完成', duration = 2000): void {
      this.native.genericToast(message, duration);
    }

    public toast_trans(message = '', duration = 2000): void {
      this.native.genericToast(message, duration);
    }

    public async showLoading(message: string) {
      await this.hideLoading();
      this.loader = await this.loadingCtrl.create({
        mode: 'ios',
        translucent: false,
        spinner: 'crescent',
        cssClass: !this.theme.darkMode ? 'custom-loader' : 'dark-custom-loader',
        message: message
      });
      this.loader.onWillDismiss().then(() => {
        this.loader = null;
      });
      return await this.loader.present();
    }

    public async hideLoading() {
      if (this.loader) {
        await this.loader.dismiss();
        this.loader = null;
      }
    }

    async showOptions(ev: any, identityEntry: IdentityEntry) {
      Logger.log('didsessions', 'Opening profile options');

      this.options = await this.popoverCtrl.create({
        mode: 'ios',
        component: OptionsComponent,
        cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'options-component' : 'dark-options-component',
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
        cssClass: 'didsessions-warning-component',
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
