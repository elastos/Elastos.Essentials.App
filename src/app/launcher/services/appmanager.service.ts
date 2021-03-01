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
import { NativeService } from './native.service';
import { BackupService } from './backup.service';
import { Events } from './events.service';

import { NotificationsPage } from '../pages/notifications/notifications.page';
import { TipsPage } from '../pages/tips/tips.page';

import { Tip } from '../model/tip.model';

import * as moment from 'moment';
import { TemporaryAppManagerPlugin, ReceivedIntent, ReceivedMessage } from 'src/app/TMP_STUBS';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsService } from 'src/app/services/didsessions.service';
import { GlobalLanguageService } from 'src/app/services/global.language.service';

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
    description: string;
    icon: string;
    id: string;
    routerPath: string;
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
        private native: NativeService,
        private storage: GlobalStorageService,
        private appManager: TemporaryAppManagerPlugin,
        private didSessions: DIDSessionsService,
        private language: GlobalLanguageService
    ) {}

    public async init() {
        console.log('AppmanagerService init');

        this.language.activeLanguage.subscribe((lang)=>{
            this.initAppsList();
        });

        await this.getCurrentNet();

        this.appManager.setListener((ret) => {
            this.onMessageReceived(ret);
        });

        console.log('Listening to intent events');
        this.appManager.setIntentListener((ret) => {
            this.onIntentReceived(ret);
        });

        this.events.subscribe("updateNotifications", () => {
            // TODO @chad this.notification.fillAppInfoToNotification(this.installService.appInfos);
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
                        description: this.translate.instant('app-wallet-description'),
                        icon: '/assets/launcher/ios/app-icons/wallet.svg',
                        id: 'wallet',
                        routerPath: '/wallet/home'
                    },
                    {
                        cssId: 'Identity',
                        name: this.translate.instant('app-identity'),
                        description: this.translate.instant('app-identity-description'),
                        icon: '/assets/launcher/ios/app-icons/identity.svg',
                        id: 'org.elastos.trinity.dapp.did',
                        routerPath: '/identity/home'
                    },
                    {
                        cssId: 'Contacts',
                        name: this.translate.instant('app-contacts'),
                        description: this.translate.instant('app-contacts-description'),
                        icon: '/assets/launcher/ios/app-icons/contacts.svg',
                        id: 'org.elastos.trinity.dapp.friends',
                        routerPath: '/contacts/home'
                    },
                ]
            },
            {
                type: 'utilities',
                apps: [
                    {
                        cssId: 'Hive',
                        name: this.translate.instant('app-hive'),
                        description: this.translate.instant('app-hive-description'),
                        icon: '/assets/launcher/ios/app-icons/hive.svg',
                        id: 'org.elastos.trinity.dapp.hivemanager',
                        routerPath: '/hivemanager/pickprovider'
                    }
                ]
            },
            {
                type: 'other',
                apps: [
                    {
                        cssId: 'Scanner',
                        name: this.translate.instant('app-scanner'),
                        description: this.translate.instant('app-scanner-description'),
                        icon: '/assets/launcher/ios/app-icons/scanner.svg',
                        id: 'org.elastos.trinity.dapp.qrcodescanner',
                        routerPath: '/scanner/scan'
                    },
                    {
                        cssId: 'Settings',
                        name: this.translate.instant('app-settings'),
                        description: this.translate.instant('app-settings-description'),
                        icon: '/assets/launcher/ios/app-icons/settings.svg',
                        id: 'org.elastos.trinity.dapp.settings',
                        routerPath: '/settings/menu'
                    },
                ]
            }
        ];
    }

    async getVisit() {
        let visit = await this.storage.getSetting<boolean>(DIDSessionsService.signedInDIDString, "launcher", 'visit', false);
        if (visit || visit === true) {
            this.firstVisit = false;
            console.log('First visit?', this.firstVisit);
        } else {
            this.router.navigate(['launcher/onboard']);
        }
    }

    /******************************** Intent Listener ********************************/

    // Intent
    onIntentReceived(ret: ReceivedIntent) {
        console.log('Received external intent', ret);
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
        console.log('Elastos launcher received message:' + ret.message + '. type: ' + ret.type + '. from: ' + ret.from);

        let params: any = ret.message;
        if (typeof (params) === 'string') {
            try {
                params = JSON.parse(params);
            } catch (e) {
                console.log('Params are not JSON format: ', params);
            }
        }
        console.log(JSON.stringify(params));
        switch (ret.type) {
            case MessageType.INTERNAL:
                switch (params.action) {
                    case 'toggle':
                        break;
                    case 'receivedIntent':
                        console.log('receivedIntent message', ret);
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
                        console.log('hidden message', ret);
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
        this.navController.navigateForward(app.routerPath);
    }

    /******************************** Notifications Manager ********************************/
    async toggleNotifications() {
        if (this.notificationsShowing) {
            console.log('toggleNotifications is in progress, skip ...')
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
                console.log('dismissAllModals dismiss error')
                return;
            }
        }
    }

    /******************************** Preferences ********************************/
    setCurLang(lang: string): Promise<void> {
        return new Promise((resolve)=>{
            console.log('Setting current language to ' + lang);
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




