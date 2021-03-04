import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, NavController, ToastController, PopoverController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ThemeService } from './theme.service';
import { OptionsComponent } from '../components/options/options.component';
import { WarningComponent } from '../components/warning/warning.component';
import { Events } from './events.service';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';

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
        private platform: Platform,
        private zone: NgZone,
        private navCtrl: NavController,
        private popoverCtrl: PopoverController,
        private toastCtrl: ToastController,
        private router: Router,
        private theme: ThemeService,
        private events: Events,
        private loadingCtrl: LoadingController,
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
        // this.theme.getTheme();

        /* TODO @chad titleBarManager.addOnItemClickedListener((menuItem)=>{
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
            if (menuItem.key === "back") {
                this.navCtrl.back();
            }

            this.onTitleBarItemClicked(menuItem);
        });*/
    }

    onTitleBarItemClicked(icon: TitleBarIcon) {
      console.log('Titlebar item clicked', icon);
      switch (icon.key) {
        // When in import-did pg
        case 'backToHome':
          this.router.navigate(['/createidentity']);
          break;
        // When in create-identity pg
        case 'backToIdentities':
          this.router.navigate(['/pickidentity']);
          break;
        case 'language':
          this.router.navigate(['/language']);
          break;
        case 'scan':
          this.router.navigate(['/scan']);
          break;
      }
    }

    async navigateRoot() {
        // Redirect to the appropriate screen depending on available identities
        let identities = await this.didSessions.getIdentityEntries();
        if (identities.length == 0) {
            console.log("No existing identity. Navigating to language chooser then createidentity");
            this.navCtrl.navigateRoot("language");
        }
        else {
            console.log("Navigating to pickidentity");
            // this.router.navigate(['/language']);
            this.navCtrl.navigateRoot("pickidentity");
            // this.navCtrl.navigateRoot("createidentity");
        }
    }

    // Sensitive data should not be passed through queryParams
    public go(page: any, options: any = {}) {
        console.log("NAV - Going to "+page);
        this.zone.run(()=>{
            this.hideLoading();
            this.navCtrl.navigateForward([page], { state: options });
        });
    }

    setTitleBarBackKeyShown(show: boolean) {
        /* TODO @chad
        if (show) {
            titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
                key: "back",
                iconPath: TitleBarPlugin.BuiltInIcon.BACK
            });
        }
        else {
            titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
        }
        */
    }

    setTitleBarEditKeyShown(show: boolean) {
      /* TODO @chad
        if (show) {
          titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, {
            key: "language",
            iconPath: TitleBarPlugin.BuiltInIcon.EDIT
          });
        }
        else {
          titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, null);
        }
        */
    }

    public translateInstant(key: string): string {
        return this.translate.instant(key);
    }

    public toast(message: string = '操作完成', duration: number = 2000): void {
        this.toastCtrl.create({
            mode: 'ios',
            color: 'primary',
            position: 'bottom',
            header: message,
            duration: duration,
        }).then(toast => toast.present());
    }

    public toast_trans(message: string = '', duration: number = 2000): void {
        message = this.translate.instant(message);
        this.toastCtrl.create({
            mode: 'ios',
            color: 'primary',
            position: 'bottom',
            header: message,
            duration: duration,
        }).then(toast => toast.present());
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

    public async showLoading(content: string) {
      this.hideLoading();
      this.loader = await this.loadingCtrl.create({
        mode: 'ios',
        spinner: 'crescent',
        message: this.translate.instant(content),
      });
      this.loader.onWillDismiss().then(() => {
        this.loader = null;
      })
      return await this.loader.present();
    };

    public async hideLoading() {
      if(this.loader) {
        await this.loader.dismiss();
      }
    };

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
