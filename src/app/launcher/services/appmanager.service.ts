import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { PopoverController, MenuController, ModalController } from '@ionic/angular';

import { DIDManagerService } from './didmanager.service';

import { NotificationsPage } from '../pages/notifications/notifications.page';
import { TipsPage } from '../pages/tips/tips.page';

import { Tip } from '../model/tip.model';

import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { DPoSVotingInitService } from 'src/app/dposvoting/services/init.service';
import { Subscription } from 'rxjs';
import { Events } from 'src/app/services/events.service';
import { DPoSRegistrationInitService } from 'src/app/dposregistration/services/init.service';
import { CRCouncilManagerInitService } from 'src/app/crcouncilmanager/services/init.service';
import { App } from "src/app/model/app.enum";
import { ContactsInitService } from 'src/app/contacts/services/init.service';

type RunnableApp = {
    id: string;
    name: string;
    routerContext: string; // Ex: "wallet"
    description: string;
    icon: string;
    hasWidget: boolean;
    routerPath?: string;
    startCall?: () => void;
}

type RunnableAppCategory = {
    type: string,
    apps: RunnableApp[];
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

    private intentSubscription: Subscription = null;
    private updateSubscription: Subscription = null;
    private tipSubscription: Subscription = null;
    private languageSubscription: Subscription = null;

    constructor(
        private sanitizer: DomSanitizer,
        public zone: NgZone,
        public popoverController: PopoverController,
        private modalController: ModalController,
        public menuCtrl: MenuController,
        private translate: TranslateService,
        private events: Events,
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
        private dposRegistrationInitService: DPoSRegistrationInitService,
        private crcouncilManagerInitService: CRCouncilManagerInitService,
        private contactsInitService: ContactsInitService
    ) {}

    public init() {
        Logger.log("Launcher", 'App manager service is initializing');

        this.languageSubscription = this.language.activeLanguage.subscribe((lang) => {
            this.initAppsList();
        });

        this.intentSubscription = this.globalIntentService.intentListener.subscribe((receivedIntent) => {
            if (!receivedIntent)
                return;

            this.onIntentReceived(receivedIntent);
        });

        this.updateSubscription = this.events.subscribe("updateNotifications", () => {
            // TODO @chad this.notification.fillAppInfoToNotification(this.installService.appInfos);
        });

        this.tipSubscription = this.events.subscribe("notifications.tip", (notification) => {
            void this.presentTip(notification);
        });
    }

    public stop() {
        if (this.intentSubscription) {
            this.intentSubscription.unsubscribe();
            this.intentSubscription = null;
        }
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
                type: 'launcher.main',
                apps: [
                    {
                        id: 'wallet',
                        name: this.translate.instant('launcher.app-wallet'),
                        routerContext: App.WALLET,
                        description: this.translate.instant('launcher.app-wallet-description'),
                        icon: '/assets/launcher/apps/app-icons/wallet.svg',
                        hasWidget: true,
                        // routerPath: '/wallet/wallet-home'
                        startCall: () => this.walletInitService.start()
                    },
                    {
                        id: 'identity',
                        routerContext: App.IDENTITY,
                        name: this.translate.instant('launcher.app-identity'),
                        description: this.translate.instant('launcher.app-identity-description'),
                        icon: '/assets/launcher/apps/app-icons/identity.svg',
                        routerPath: '/identity/myprofile/home',
                        hasWidget: false,
                        // routerPath: '/identity/credaccessrequest'
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
                ]
            },
            {
                type: 'launcher.utilities',
                apps: [
                    {
                        id: 'hive',
                        routerContext: App.HIVE_MANAGER,
                        name: this.translate.instant('launcher.app-hive'),
                        description: this.translate.instant('launcher.app-hive-description'),
                        icon: '/assets/launcher/apps/app-icons/hive.svg',
                        hasWidget: true,
                        startCall: () => this.hiveManagerInitService.start()
                    },
                    {
                        id: 'scanner',
                        routerContext: App.SCANNER,
                        name: this.translate.instant('launcher.app-scanner'),
                        description: this.translate.instant('launcher.app-scanner-description'),
                        icon: '/assets/launcher/apps/app-icons/scanner.svg',
                        hasWidget: false,
                        routerPath: '/scanner/scan'
                    },
                    {
                        id: 'settings',
                        routerContext: App.SETTINGS,
                        name: this.translate.instant('launcher.app-settings'),
                        description: this.translate.instant('launcher.app-settings-description'),
                        icon: '/assets/launcher/apps/app-icons/settings.svg',
                        hasWidget: false,
                        routerPath: '/settings/menu'
                    },
                ]
            },
            {
                type: 'launcher.voting',
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
                        routerPath: '/crcouncilvoting/candidates'
                        // routerPath: '/crcouncilvoting/vote'
                    },
                    {
                        id: 'crproposal',
                        routerContext: App.CRPROPOSAL_VOTING,
                        name: this.translate.instant('launcher.app-cr-proposal'),
                        description: this.translate.instant('launcher.app-crproposal-description'),
                        icon: '/assets/launcher/apps/app-icons/proposal.svg',
                        hasWidget: false,
                        routerPath: '/crproposalvoting/proposals/ALL'
                    },
                    {
                        id: 'dposregistration',
                        routerContext: App.DPOS_REGISTRATION,
                        name: this.translate.instant('launcher.app-dpos-registration'),
                        description: this.translate.instant('launcher.app-dpos-registration-description'),
                        icon: '/assets/launcher/apps/app-icons/dpos.svg',
                        hasWidget: false,
                        startCall: () => this.dposRegistrationInitService.start()
                    },
                    {
                        id: 'crcouncilmanager',
                        routerContext: App.CRCOUNCIL_MANAGER,
                        name: this.translate.instant('launcher.app-crcouncil-registration'),
                        description: this.translate.instant('launcher.app-crcouncil-registration-description'),
                        icon: '/assets/launcher/apps/app-icons/council.svg',
                        hasWidget: false,
                        startCall: () => this.crcouncilManagerInitService.start()
                    },
                ]
            }
        ];
    }

    async getVisit() {
        let visit = await this.storage.getSetting<boolean>(this.didService.signedIdentity.didString, "launcher", 'visit', false);
        if (visit || visit === true) {
            this.firstVisit = false;
        } else {
            await this.globalNav.navigateRoot(App.LAUNCHER, 'launcher/onboard');
        }
    }

    /******************************** Intent Listener ********************************/

    // Intent
    onIntentReceived(ret: EssentialsIntentPlugin.ReceivedIntent) {
        switch (this.getShortAction(ret.action)) {
        }
    }

    /**
     * From a full new-style action string such as https://launcher.elastos.net/app
     * returns the short old-style action "app" for convenience.
     */
    private getShortAction(fullAction: string): string {
        const intentDomainRoot = "https://launcher.elastos.net/";
        return fullAction.replace(intentDomainRoot, "");
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
            app.startCall();
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




