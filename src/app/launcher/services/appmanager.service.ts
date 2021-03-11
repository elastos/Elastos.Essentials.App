import { Injectable, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
    PopoverController,
    MenuController,
    NavController,
    ModalController,
} from '@ionic/angular';

import { NotificationManagerService } from './notificationmanager.service';
import { DIDManagerService } from './didmanager.service';
import { GlobalThemeService } from '../../services/global.theme.service';
import { BackupService } from './backup.service';
import { Events } from './events.service';

import { NotificationsPage } from '../pages/notifications/notifications.page';
import { TipsPage } from '../pages/tips/tips.page';

import { Tip } from '../model/tip.model';

import * as moment from 'moment';
import { TemporaryAppManagerPlugin, ReceivedMessage } from 'src/app/TMP_STUBS';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { Logger } from 'src/app/logger';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { HiveManagerInitService } from 'src/app/hivemanager/services/init.service';
import { WalletInitService } from 'src/app/wallet/services/init.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';

enum MessageType {
    INTERNAL = 1,
    IN_RETURN = 2,
    IN_REFRESH = 3,

    EXTERNAL = 11,
    EX_LAUNCHER = 12,
    EX_INSTALL = 13,
    EX_RETURN = 14,
}

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
        private navController: NavController,
        private router: Router,
        private events: Events,
        private didService: DIDManagerService,
        private native: GlobalNativeService,
        private storage: GlobalStorageService,
        private appManager: TemporaryAppManagerPlugin,
        private didSessions: GlobalDIDSessionsService,
        private language: GlobalLanguageService,
        private hiveManagerInitService: HiveManagerInitService,
        private walletInitService: WalletInitService,
        private globalIntentService: GlobalIntentService,
        private globalNav: GlobalNavService
    ) {}

    public async init() {
        Logger.log("Launcher", 'App manager service is initializing');

        this.language.activeLanguage.subscribe((lang)=>{
            this.initAppsList();
        });

        await this.getCurrentNet();

        this.appManager.setListener((ret) => {
            this.onMessageReceived(ret);
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
                        routerContext: "wallet",
                        description: this.translate.instant('app-wallet-description'),
                        icon: '/assets/launcher/ios/app-icons/wallet.svg',
                        startCall: () => this.walletInitService.start()
                    },
                    {
                        cssId: 'Identity',
                        routerContext: "identity",
                        name: this.translate.instant('app-identity'),
                        description: this.translate.instant('app-identity-description'),
                        icon: '/assets/launcher/ios/app-icons/identity.svg',
                        routerPath: '/identity/myprofile/home'
                    },
                    {
                        cssId: 'Contacts',
                        routerContext: "contacts",
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
                        routerContext: "hivemanager",
                        name: this.translate.instant('app-hive'),
                        description: this.translate.instant('app-hive-description'),
                        icon: '/assets/launcher/ios/app-icons/hive.svg',
                        startCall: () => this.hiveManagerInitService.start()
                    },
                    {
                        cssId: 'Other',
                        routerContext: "scanner",
                        name: this.translate.instant('app-scanner'),
                        description: this.translate.instant('app-scanner-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/scanner/scan'
                    },
                    {
                        cssId: 'Other',
                        routerContext: "settings",
                        name: this.translate.instant('app-settings'),
                        description: this.translate.instant('app-settings-description'),
                        icon: '/assets/launcher/ios/app-icons/settings.svg',
                        routerPath: '/settings/menu'
                    },
                ]
            },
            {
                type: 'voting',
                apps: [
                    {
                        cssId: 'DPoS',
                        routerContext: "dposvoting",
                        name: this.translate.instant('app-dpos-voting'),
                        description: this.translate.instant('app-dpos-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/dposvoting/menu/vote'
                    },
                    {
                        cssId: 'CRCouncil',
                        routerContext: "crcouncilvoting",
                        name: this.translate.instant('app-cr-council'),
                        description: this.translate.instant('app-crcouncil-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/crcouncilvoting/candidates'
                    },
                    {
                        cssId: 'CRProposal',
                        routerContext: "crproposalvoting",
                        name: this.translate.instant('app-cr-proposal'),
                        description: this.translate.instant('app-crproposal-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        routerPath: '/crproposalvoting/proposals/ALL'
                    },
                ]
            }
        ];
    }

    async getVisit() {
        let visit = await this.storage.getSetting<boolean>(GlobalDIDSessionsService.signedInDIDString, "launcher", 'visit', false);
        if (visit || visit === true) {
            this.firstVisit = false;
        } else {
            this.router.navigate(['launcher/onboard']);
        }
    }

    /******************************** Intent Listener ********************************/

    // Intent
    onIntentReceived(ret: AppManagerPlugin.ReceivedIntent) {
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

    // Message
    async onMessageReceived(ret: ReceivedMessage) {
        Logger.log('launcher', 'Elastos launcher received message:' + ret.message + '. type: ' + ret.type + '. from: ' + ret.from);

        let params: any = ret.message;
        if (typeof (params) === 'string') {
            try {
                params = JSON.parse(params);
            } catch (e) {
                Logger.log('launcher', 'Params are not JSON format: ', params);
            }
        }
        Logger.log('launcher', JSON.stringify(params));
        switch (ret.type) {
            case MessageType.INTERNAL:
                switch (params.action) {
                    case 'toggle':
                        break;
                    case 'receivedIntent':
                        Logger.log('launcher', 'receivedIntent message', ret);
                        this.zone.run(() => {
                            if (ret.hasOwnProperty('error')) {
                                this.native.genericAlert('no-app-can-handle-request', 'sorry');
                            } else if (ret.from === 'system') {
                                // TODO @chad: replace with ionic navigation to launcher's home screen - appManager.launcher();
                                this.native.showLoading('please-wait');
                            }
                        });
                        break;
                    case 'hidden':
                        Logger.log('launcher', 'hidden message', ret);
                        this.zone.run(() => { this.native.hideLoading(); });
                        break;
                }
                switch (params.visible) {
                    case 'show':
                        this.zone.run(() => {
                            this.native.hideLoading();
                        });
                        break;
                }
                switch (ret.message) {
                    case 'navback':
                        // Navigate back in opened app
                        this.navController.back();
                        break;
                }
                break;

            case MessageType.IN_REFRESH:
                switch (params.action) {
                    case 'closed': // TODO
                        this.zone.run(() => {
                            this.native.hideLoading();
                        });
                        break;
                    case 'preferenceChanged': // TODO - USE GLOBAL PREFS SERVICE
                        // Update display mode globally
                        if (params.data.key === "ui.darkmode") {
                            this.zone.run(() => {
                                this.handleDarkModeChange(params.data.value);
                            });
                        }
                        // Update developer network
                        if (params.data.key === "chain.network.type") {
                            this.getCurrentNet();
                        }
                        break;
                }
                break;
        }
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
            //this.navController.navigateForward(app.routerPath);
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

    /******************************** Preferences ********************************/
    setCurLang(lang: string): Promise<void> {
        return new Promise((resolve)=>{
            Logger.log('launcher', 'Setting current language to ' + lang);
            this.zone.run(() => {
                this.translate.use(lang);
                if (lang === 'zh') {
                    moment.locale('zh-cn');
                } else {
                    moment.locale(lang);
                }
                resolve();
            });
        });
    }

    getCurrentNet() {
        /*
        TODO @chad: Here, the root component of each feature (launcher, did, friends, etc), the one that
        is able to hold a reference on its own title bar component, should listen to network type change
        events using preferencesService.preferenceListener.subscribe((pref)=> { update the title bar here });

        appManager.getPreference("chain.network.type", (networkCode) => {
            this.zone.run(() => {
                if (networkCode === 'MainNet') {
                    titleBarManager.setTitle('elastOS');
                }
                if (networkCode === 'TestNet') {
                    titleBarManager.setTitle('Test Net Active');
                }
                if (networkCode === 'RegTest') {
                    titleBarManager.setTitle('Regression Net Active');
                }
                if (networkCode === 'PrvNet') {
                    titleBarManager.setTitle('Private Net Active');
                }
            });
        });*/
    }

    handleDarkModeChange(useDarkMode) {
        /*TODO @chad: Here, the root component of each feature (launcher, did, friends, etc), the one that
        is able to hold a reference on its own title bar component, should listen to dark mode change
        events using preferencesService.preferenceListener.subscribe((pref)=> { update the title bar here });
        Or better, it can listen to themeService.activeTheme.subscribe((activeTheme)=> {update title bar});

        this.theme.setTheme(useDarkMode);

        */
    }

    /******************************** Intent Actions ********************************/

    /**
     * TODO @chad: here it's a bit more tricky: until now, the runtime managed a kind of screens stack automatically
     * as it started a new webview every time an app or intent was started. Then on sendIntentResponse(), webviews were closed,
     * so naturally the previous screen was displayed. Now that we are all in one app, we need to handle the navigation stack
     * by ourselves. The basic attempt could be to use angular router's nav forward / nav back. This could work, but I expect a
     * few bugs that may give us some headaches. We will deal with that all together little by little. For now, let's just try to
     * make basic use cases run such as showing the identity "home" screen from the launcher "home" screen, and when pressing "minimize"
     * in the title bar, come back to the launcher home screen.
     */

    launcher() {
        // TODO @chad appManager.launcher();
    }

    start(id: string) {
        // TODO @chad appManager.start(id, () => { });
    }

    sendIntent(action: string, params: any) {
        // TODO @chad appManager.sendIntent(action, params);
    }

    close(id: string) {
        // TODO @chad appManager.closeApp(id);
    }
}




