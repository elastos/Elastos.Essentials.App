import { Injectable, NgZone, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Platform, ModalController, NavController } from '@ionic/angular';
import { DIDService } from './did.service';
import { Events } from './events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode, BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

enum MessageType {
    INTERNAL = 1,
    IN_RETURN = 2,
    IN_REFRESH = 3,

    EXTERNAL = 11,
    EX_LAUNCHER = 12,
    EX_INSTALL = 13,
    EX_RETURN = 14,
};

@Injectable({
    providedIn: 'root'
})
export class UXService {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public static instance: UXService = null;

    constructor(
        public translate: TranslateService,
        public events: Events,
        private didService: DIDService,
        private modalCtrl: ModalController,
        private navCtrl: NavController,
        private essentialsIntent: TemporaryAppManagerPlugin
    ) {
        UXService.instance = this;
    }

    async init() {
        this.essentialsIntent.setListener(this.onReceive);


   /*      this.titleBar.addOnItemClickedListener((icon) => {
            if (icon.key == "settings") {
                this.navCtrl.navigateForward('/identity/settings');
            }
        }); */
    }

    setTitleBarBackKeyShown(show: boolean) {
        if (show) {
            this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);
        }
        else {
            this.titleBar.setNavigationMode(null);
        }

    }

    setTitleBarSettingsKeyShown(show: boolean) {
        if (show) {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
                key: "settings",
                iconPath: BuiltInIcon.SETTINGS
            });
        }
        else {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
        }
    }

    /**
     * This method defines which screen has to be displayed when the app start. This can be the default
     * no identity or current identity main screen, (defined by the didstoremanager), but the app is maybe
     * starting because we are receiving an intent.
     *
     * This method must be called only during the initial app start.
     */
    computeAndShowEntryScreen() {
        Logger.log('identity', "Checking if there are pending intents");
        this.loadIdentityAndShow();
    }

    public async loadIdentityAndShow(showEntryScreenAfterLoading = true) {
        // Load user's identity
        let couldLoad = await this.didService.loadGlobalIdentity();
        if (!couldLoad) {
            this.didService.handleNull();
        }
        else {
            if (showEntryScreenAfterLoading) {
                // No intent was received at boot. So we go through the regular screens.
                this.showEntryScreen();
            }
        }
    }

    showEntryScreen() {
        this.didService.displayDefaultScreen();
    }

    /**
     * Close this application.
     */
    close() {
        // TODO @chad - closing means going back in router nav. We may discuss the best way to do this.
        Logger.log('identity', "Closing DID app");
        // TODO essentialsIntent.close();
    }

    /**
     * As the app starts invisible, screens have to call this method when they are ready, so that
     * user can actually see the app (but see it only when fully ready)
     */
    makeAppVisible() {
        // TODO: delete this makeAppVisible() from code. essentialsIntent.setVisible("show");
    }

    public translateInstant(key: string): string {
        return this.translate.instant(key);
    }

    onReceive = (ret) => {
        Logger.log('identity', 'onReceive', ret);
        var params: any = ret.message;
        if (typeof (params) == "string") {
            try {
                params = JSON.parse(params);
            } catch (e) {
                Logger.log('identity', 'Params are not JSON format: ', params);
            }
        }
        switch (ret.type) {
            case MessageType.INTERNAL:
                switch (ret.message) {
                    case 'navback':
                        this.titlebarBackButtonHandle();
                        break;
                }
                break;
        }
    }

    async titlebarBackButtonHandle() {
        // to check alert, action, popover, menu ?
        // ...
        const modal = await this.modalCtrl.getTop();
        if (modal) {
            modal.dismiss();
            return;
        }

        this.navCtrl.back();
    }

    public async getAppDid(appId: string): Promise<string> {
        /* TODO
        return new Promise((resolve, reject) => {
            essentialsIntent.getAppInfo(appId,
                (appInfo) => {
                    resolve(appInfo.did || '');
                },
                (err) => {
                    console.error('getAppInfo failed: ', err);
                    reject(err);
                }
            );
        });
        */
       return "did:abcd";
    }

    /**
     * In case the received intent contains a callback url or a redirect url, this means the response
     * will be sent out by the runtime. In this case we can't figure out the app DID context and the app did
     * has to be received in the intent request at first.
     */
    public async isIntentResponseGoingOutsideElastos(intentParams: any): Promise<boolean> {
        Logger.log('identity', "isIntentResponseGoingOutsideElastos? Params:", intentParams)
        if (!intentParams)
            return false; // Should not happen

        if (intentParams.callbackurl || intentParams.redirecturl)
            return true;
        else
            return false;
    }

    public sendIntentResponse(action, result, intentId): Promise<void> {
        return essentialsIntent.sendIntentResponse(result, intentId);
    }
}
