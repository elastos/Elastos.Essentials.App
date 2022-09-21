import { Injectable, NgZone } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MenuController, ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ContactsInitService } from 'src/app/contacts/services/init.service';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { Logger } from 'src/app/logger';
import { App } from "src/app/model/app.enum";
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { CRCouncilVotingInitService } from 'src/app/voting/crcouncilvoting/services/init.service';
import { DPoSVotingInitService } from 'src/app/voting/dposvoting/services/init.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { Tip } from '../model/tip.model';
import { NotificationsPage } from '../pages/notifications/notifications.page';
import { TipsPage } from '../pages/tips/tips.page';
import { DIDManagerService } from './didmanager.service';

type RunnableApp = {
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

type RunnableAppCategory = {
    type: string,
    apps: RunnableApp[];
    shouldBeDisplayed: () => boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AppmanagerService {
    // List of runnable apps
    public runnableApps: RunnableAppCategory[] = null;

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
        private translate: TranslateService,
        private events: GlobalEvents,
        private didService: DIDManagerService,
        private native: GlobalNativeService,
        private storage: GlobalStorageService,
        private language: GlobalLanguageService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService,
        // In-app Services
        private hiveManagerInitService: HiveManagerInitService,
        private dposVotingInitService: DPoSVotingInitService,
        private walletInitService: WalletInitService,
        private crCouncilVotingInitService: CRCouncilVotingInitService,
        private contactsInitService: ContactsInitService,
        private walletNetworkService: WalletNetworkService
    ) { }

    public init() {
        Logger.log("Launcher", 'App manager service is initializing');

        this.languageSubscription = this.language.activeLanguage.subscribe((lang) => {
            this.initAppsList();
        });

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

    private initAppsList() {
        this.runnableApps = [
            {
                type: 'launcher.elastos-voting',
                shouldBeDisplayed: () => this.walletNetworkService.isActiveNetworkElastos(),
                apps: [
                    {
                        id: 'dpos',
                        routerContext: App.DPOS_VOTING,
                        name: this.translate.instant('launcher.app-dpos-voting'),
                        description: this.translate.instant('launcher.app-dpos-description'),
                        icon: '/assets/launcher/apps/app-icons/dpos.svg',
                        hasWidget: false,
                        startCall: () => this.dposVotingInitService.start()
                    },
                    {
                        id: 'crcouncil',
                        routerContext: App.CRCOUNCIL_VOTING,
                        name: this.translate.instant('launcher.app-cr-council'),
                        description: this.translate.instant('launcher.app-crcouncil-description'),
                        icon: '/assets/launcher/apps/app-icons/council.svg',
                        hasWidget: false,
                        startCall: () => this.crCouncilVotingInitService.startCouncil()
                    },
                    {
                        id: 'crproposal',
                        routerContext: App.CRPROPOSAL_VOTING,
                        name: this.translate.instant('launcher.app-cr-proposal'),
                        description: this.translate.instant('launcher.app-crproposal-description'),
                        icon: '/assets/launcher/apps/app-icons/proposal.svg',
                        hasWidget: false,
                        routerPath: '/crproposalvoting/proposals/all'
                    },
                    {
                        id: 'crsuggestion',
                        routerContext: App.CRPROPOSAL_VOTING,
                        name: this.translate.instant('launcher.app-cr-suggestion'),
                        description: this.translate.instant('launcher.app-crsuggestion-description'),
                        icon: '/assets/launcher/apps/app-icons/suggestion.svg',
                        iconDark: '/assets/launcher/apps/app-icons/suggestion_dark.svg',
                        hasWidget: false,
                        routerPath: '/crproposalvoting/suggestions/all'
                    },
                ]
            },
            {
                type: 'launcher.utilities',
                shouldBeDisplayed: () => true,
                apps: [
                    {
                        id: 'easybridge',
                        routerContext: App.EASY_BRIDGE,
                        name: this.translate.instant('launcher.app-easybridge'),
                        description: this.translate.instant('launcher.app-easybridge-description'),
                        icon: '/assets/launcher/apps/app-icons/easybridge.svg',
                        hasWidget: false,
                        routerPath: '/easybridge/home'
                    },
                    {
                        id: 'redpackets',
                        routerContext: App.RED_PACKETS,
                        name: this.translate.instant('launcher.app-redpackets'),
                        description: this.translate.instant('launcher.app-redpackets-description'),
                        icon: '/assets/launcher/apps/app-icons/redpackets.png',
                        hasWidget: false,
                        routerPath: '/redpackets/home'
                    },
                    {
                        id: 'contacts',
                        routerContext: App.CONTACTS,
                        name: this.translate.instant('launcher.app-contacts'),
                        description: this.translate.instant('launcher.app-contacts-description'),
                        icon: '/assets/launcher/apps/app-icons/contacts.svg',
                        hasWidget: false,
                        startCall: () => this.contactsInitService.start()
                    },
                    {
                        id: 'hive',
                        routerContext: App.HIVE_MANAGER,
                        name: this.translate.instant('launcher.app-hive'),
                        description: this.translate.instant('launcher.app-hive-description'),
                        icon: '/assets/launcher/apps/app-icons/hive.svg',
                        hasWidget: true,
                        startCall: () => this.hiveManagerInitService.start()
                    },
                ]
            }
        ];
    }

    async getVisit() {
        let visit = await this.storage.getSetting<boolean>(this.didService.signedIdentity.didString, NetworkTemplateStore.networkTemplate, "launcher", 'visit', false);
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
        /* TODO @chad - rework - no more "app infos"
        await this.notification.fillAppInfoToNotification(this.installService.appInfos);*/
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
}




