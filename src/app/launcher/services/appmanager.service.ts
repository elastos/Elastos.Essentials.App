import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { PopoverController, MenuController, ModalController } from '@ionic/angular';

import { NotificationManagerService } from './notificationmanager.service';
import { DIDManagerService } from './didmanager.service';
import { Events } from './events.service';

import { NotificationsPage } from '../pages/notifications/notifications.page';
import { TipsPage } from '../pages/tips/tips.page';

import { Tip } from '../model/tip.model';

import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService, App } from 'src/app/services/global.nav.service';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { DPoSVotingInitService } from 'src/app/dposvoting/services/init.service';

type RunnableApp = {
    cssId:string;
    name: string;
    routerContext: string; // Ex: "wallet"
    description: string;
    icon: string;
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

    constructor(
        private sanitizer: DomSanitizer,
        public zone: NgZone,
        public popoverController: PopoverController,
        private modalController: ModalController,
        public menuCtrl: MenuController,
        private translate: TranslateService,
        private router: Router,
        private events: Events,
        private didService: DIDManagerService,
        private native: GlobalNativeService,
        private storage: GlobalStorageService,
        private language: GlobalLanguageService,
        private hiveManagerInitService: HiveManagerInitService,
        private dposVotingInitService: DPoSVotingInitService,
        private walletInitService: WalletInitService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService
    ) {}

    public async init() {
        Logger.log("Launcher", 'App manager service is initializing');

        this.language.activeLanguage.subscribe((lang)=>{
            this.initAppsList();
        });

        this.globalIntentService.intentListener.subscribe((receivedIntent)=>{
            this.onIntentReceived(receivedIntent);
        });

        this.events.subscribe("updateNotifications", () => {
            // TODO @chad this.notification.fillAppInfoToNotification(this.installService.appInfos);
        });

        this.events.subscribe("notifications.tip", (notification) => {
            this.presentTip(notification);
        });
    }

    private initAppsList() {
        this.runnableApps = [
            {
                type: 'main',
                apps: [
                    {
                        cssId: 'Wallet',
                        name: this.translate.instant('app-wallet'),
                        routerContext: App.WALLET,
                        description: this.translate.instant('app-wallet-description'),
                        icon: '/assets/launcher/ios/app-icons/wallet.svg',
                        startCall: () => this.walletInitService.start()
                    },
                    {
                        cssId: 'Identity',
                        routerContext: App.IDENTITY,
                        name: this.translate.instant('app-identity'),
                        description: this.translate.instant('app-identity-description'),
                        icon: '/assets/launcher/ios/app-icons/identity.svg',
                        routerPath: '/identity/myprofile/home'
                    },
                    {
                        cssId: 'Contacts',
                        routerContext: App.CONTACTS,
                        name: this.translate.instant('app-contacts'),
                        description: this.translate.instant('app-contacts-description'),
                        icon: '/assets/launcher/ios/app-icons/contacts.svg',
                        routerPath: '/contacts/friends'
                    },
                ]
            },
            {
                type: 'utilities',
                apps: [
                    {
                        cssId: 'Hive',
                        routerContext: App.HIVE_MANAGER,
                        name: this.translate.instant('app-hive'),
                        description: this.translate.instant('app-hive-description'),
                        icon: '/assets/launcher/ios/app-icons/hive.svg',
                        startCall: () => this.hiveManagerInitService.start()
                    },
                    {
                        cssId: 'Other',
                        routerContext: App.SCANNER,
                        name: this.translate.instant('app-scanner'),
                        description: this.translate.instant('app-scanner-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/scanner/scan'
                    },
                    {
                        cssId: 'Other',
                        routerContext: App.SETTINGS,
                        name: this.translate.instant('app-settings'),
                        description: this.translate.instant('app-settings-description'),
                        icon: '/assets/launcher/ios/app-icons/settings.svg',
                        routerPath: '/settings/menu'
                    },
                ]
            },
           /*  {
                type: 'voting',
                apps: [
                    {
                        cssId: 'DPoS',
                        routerContext: App.DPOS_VOTING,
                        name: this.translate.instant('app-dpos-voting'),
                        description: this.translate.instant('app-dpos-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: startCall: () => this.dposVotingInitService.start()
                    },
                    {
                        cssId: 'CRCouncil',
                        routerContext: App.CRCOUNCIL_VOTING,
                        name: this.translate.instant('app-cr-council'),
                        description: this.translate.instant('app-crcouncil-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/crcouncilvoting/candidates'
                    },
                    {
                        cssId: 'CRProposal',
                        routerContext: App.CRPROPOSAL_VOTING,
                        name: this.translate.instant('app-cr-proposal'),
                        description: this.translate.instant('app-crproposal-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/crproposalvoting/proposals/ALL'
                    },
                ]
            } */
        ];
    }

    async getVisit() {
        let visit = await this.storage.getSetting<boolean>(this.didService.signedIdentity.didString, "launcher", 'visit', false);
        if (visit || visit === true) {
            this.firstVisit = false;
        } else {
            this.globalNav.navigateRoot(App.LAUNCHER, 'launcher/onboard');
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
        this.native.hideLoading();
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

    startApp(app: RunnableApp) {
        if (app.routerPath)
            this.globalNav.navigateTo(app.routerContext, app.routerPath);
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
        modal.onDidDismiss().then(() => { this.notificationsShown = false; });
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
        modal.onDidDismiss().then(() => { this.tipsShown = false; });
        await modal.present();

        this.tipsShown = true;
    }

    public async popTips() {
        this.modalController.dismiss();
    }

    private async dismissAllModals() {
        let modalElement = null;
        while (modalElement = await this.modalController.getTop()) {
            await this.modalController.dismiss();
            let newModalElement = await this.modalController.getTop();
            if (newModalElement && (newModalElement === modalElement)) { // just in case
                Logger.log('launcher', 'dismissAllModals dismiss error')
                return;
            }
        }
    }
}




