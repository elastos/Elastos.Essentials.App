import { Injectable, NgZone } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MenuController, ModalController, PopoverController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Tip } from '../model/tip.model';
import { TipsPage } from '../pages/tips/tips.page';

export type RunnableApp = {
    id: string;
    name: string;
    routerContext: string; // Ex: "wallet"
    description: string;
    icon: string;
    iconDark?: string;
    hasWidget: boolean;
    routerPath?: string;
    startCall?: () => Promise<void>;
}

export type RunnableAppCategory = {
    type: string,
    apps: RunnableApp[];
    shouldBeDisplayed: () => boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AppmanagerService {
    /* Popups */
    private notificationsShown = false;
    private notificationsShowing = false;
    private tipsShown = false;

    /* Onboard */
    private firstVisit = false;

    private updateSubscription: Subscription = null;
    private tipSubscription: Subscription = null;
    private languageSubscription: Subscription = null;

    constructor(
        private sanitizer: DomSanitizer,
        public zone: NgZone,
        public theme: GlobalThemeService,
        public popoverController: PopoverController,
        private modalController: ModalController,
        public menuCtrl: MenuController,
        private events: GlobalEvents,
        private native: GlobalNativeService,
        private storage: GlobalStorageService,
        private globalNav: GlobalNavService,
    ) { }

    public init() {
        Logger.log("Launcher", 'App manager service is initializing');

        this.updateSubscription = this.events.subscribe("updateNotifications", () => {
            // TODO @chad this.notification.fillAppInfoToNotification(this.installService.appInfos);
        });

        this.tipSubscription = this.events.subscribe("notifications.tip", (notification) => {
            void this.presentTip(notification);
        });
    }

    public stop() {
        if (this.updateSubscription) {
            this.updateSubscription.unsubscribe();
            this.updateSubscription = null;
        }
        if (this.tipSubscription) {
            this.tipSubscription.unsubscribe();
            this.tipSubscription = null;
        }
        if (this.languageSubscription) {
            this.languageSubscription.unsubscribe();
            this.languageSubscription = null;
        }
    }

    async getVisit() {
        let visit = await this.storage.getSetting<boolean>(DIDSessionsStore.signedInDIDString, "launcher", 'visit', false);
        if (visit || visit === true) {
            this.firstVisit = false;
        } else {
            await this.globalNav.navigateRoot(App.LAUNCHER, 'launcher/onboard');
        }
    }

    async returnHome() {
        void this.native.hideLoading();
        if (await this.modalController.getTop()) {
            await this.modalController.dismiss();
        } else {
            return;
        }
    }

    // Get app icon
    sanitize(url: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    async startApp(app: RunnableApp): Promise<void> {
        if (app.routerPath)
            await this.globalNav.navigateTo(app.routerContext, app.routerPath);
        else if (app.startCall)
            void app.startCall();
        else
            Logger.error("launcher", "Failed to start app without either routerPath or startCall entry point.", app);
    }

    /******************************** Notifications Manager ********************************/
    async toggleNotifications() {
        if (this.notificationsShowing) {
            Logger.log('launcher', 'toggleNotifications is in progress, skip ...')
            return;
        }
        this.notificationsShowing = true;
        let shouldOpenNotifications = false;
        if (!this.notificationsShown) // Notifications are currently not shown so we want to show them
            shouldOpenNotifications = true;

        // Dismiss all modals if any
        await this.dismissAllModals();

        if (shouldOpenNotifications) {
            await this.presentNotifications();
        }
        this.notificationsShowing = false;
    }

    async presentNotifications() {
        const NotificationsPage = (await import('../pages/notifications/notifications.page')).NotificationsPage; // Cirdcular deps + perf
        const modal = await this.modalController.create({
            component: NotificationsPage,
            cssClass: 'running-modal',
            mode: 'ios',
        });
        void modal.onDidDismiss().then(() => { this.notificationsShown = false; });
        await modal.present();

        this.notificationsShown = true;
    }

    /********************************** Tips ***********************************/
    public async presentTip(tip: Tip) {
        const modal = await this.modalController.create({
            component: TipsPage,
            cssClass: 'running-modal',
            mode: 'ios',
            componentProps: {
                tipToShow: tip
            },
        });
        void modal.onDidDismiss().then(() => { this.tipsShown = false; });
        await modal.present();

        this.tipsShown = true;
    }

    public popTips() {
        void this.modalController.dismiss();
    }

    private async dismissAllModals() {
        let modalElement = null;
        while ((modalElement = await this.modalController.getTop())) {
            await this.modalController.dismiss();
            let newModalElement = await this.modalController.getTop();
            if (newModalElement && (newModalElement === modalElement)) { // just in case
                Logger.log('launcher', 'dismissAllModals dismiss error')
                return;
            }
        }
    }

    getAppTitle(app: App) {
        switch (app) {
            case App.CONTACTS:
                return 'launcher.app-contacts';
            case App.CRCOUNCIL_VOTING:
                return 'launcher.app-cr-council';
            case App.CRPROPOSAL_VOTING:
                return 'launcher.app-cr-proposal';
            case App.SCANNER:
                return 'launcher.app-scanner';
            case App.DPOS_VOTING:
                return 'launcher.app-dpos-voting';
            case App.DPOS_REGISTRATION:
                return 'launcher.app-dpos-registration';
            case App.HIVE_MANAGER:
                return 'launcher.app-hive';
            case App.IDENTITY:
                return 'launcher.app-identity';
            case App.SETTINGS:
                return 'launcher.app-settings';
            case App.WALLET:
                return 'launcher.app-wallet';
            case App.DEVELOPER_TOOLS:
                return 'launcher.app-dev-tools';
            default:
                return 'launcher.system-notification';
        }
    }

    getAppIcon(app: App) {
        switch (app) {
            case App.CONTACTS:
                return 'assets/contacts/images/logo.png';
            case App.CRCOUNCIL_VOTING:
                return 'assets/crcouncilvoting/images/logo.png';
            case App.CRPROPOSAL_VOTING:
                return 'assets/crproposalvoting/images/logo.png';
            case App.SCANNER:
                return 'assets/scanner/imgs/logo.png';
            case App.DEVELOPER_TOOLS:
                return 'assets/developertools/images/logo.png';
            case App.DPOS_VOTING:
                return 'assets/dposvoting/images/logo.png';
            case App.DPOS_REGISTRATION:
                return 'assets/dposregistration/images/logo.png';
            case App.HIVE_MANAGER:
                return 'assets/hivemanager/images/logo.png';
            case App.IDENTITY:
                return 'assets/identity/images/logo.png';
            case App.SETTINGS:
                return 'assets/settings/icon/logo.png';
            case App.WALLET:
                return 'assets/wallet/images/logo.png';
            default:
                if (this.theme.darkMode) {
                    return "assets/launcher/icons/dark_mode/elalogo.svg";
                } else {
                    return "assets/launcher/icons/elalogo.svg";
                }
        }
    }
}




