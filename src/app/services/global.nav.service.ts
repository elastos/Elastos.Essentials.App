import { Injectable, NgZone } from '@angular/core';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { NavController, PopoverController } from '@ionic/angular';
import { NavigationOptions } from '@ionic/angular/providers/nav-controller';
import { App } from "src/app/model/app.enum";
import { RestartPromptComponent } from '../components/restart-prompt/restart-prompt.component';
import { Logger } from '../logger';
import { GlobalServiceManager } from './global.service.manager';

export enum Direction {
    NONE = "none",
    FORWARD = "forward",
    BACK = "back"
}

/* export enum App {
    DID_SESSIONS = "didsessions",
    LAUNCHER = "launcher",
    IDENTITY = "identity",
    CONTACTS = "contacts",
    WALLET = "wallet",
    CRCOUNCIL_VOTING = "crcouncilvoting",
    CRPROPOSAL_VOTING = "crproposalvoting",
    DEVELOPER_TOOLS = "developertools",
    DPOS_VOTING = "dposvoting",
    HIVE_MANAGER = "hivemanager",
    SETTINGS = "settings",
    SCANNER = "scanner"
} */

type NavigationStep = {
    context: string;
    route: string;
    routerOptions?: any;
}

@Injectable({
    providedIn: 'root'
})
export class GlobalNavService {

    public static instance: GlobalNavService;

    public loader: HTMLIonLoadingElement = null;
    public alert = null;
    private navigationHistory: NavigationStep[] = [];

    constructor(
        private navCtrl: NavController,
        private splashScreen: SplashScreen,
        private popoverCtrl: PopoverController,
        private zone: NgZone
    ) {
        GlobalNavService.instance = this;
    }

    /**
     * Deletes all recent steps as long as they belong to the given context.
     * This basically comes back to the root of a "dApp".
     */
    public navigateRoot(context: string, customRoute?: string, routerOptions?: any): Promise<boolean> {
        let route = '';

        // Add a default route for apps by simply giving the context
        if (!customRoute || customRoute == null) {
            switch (context) {
                case App.CONTACTS:
                    route = '/contacts/friends';
                    break;
                case App.IDENTITY:
                    route = '/identity/myprofile/home';
                    break;
                case App.SCANNER:
                    route = '/scanner/scan';
                    break;
                case App.SETTINGS:
                    route = '/settings/menu';
                    break;
                case App.CRCOUNCIL_VOTING:
                    route = '/crcouncilvoting/crmembers';
                    break;
                case App.CRPROPOSAL_VOTING:
                    route = '/crproposalvoting/proposals/all';
                    break;
                case App.CRSUGGESTION:
                    route = '/crproposalvoting/suggestions/all';
                    break;
                case App.DPOS_VOTING:
                    route = '/dposvoting/menu/vote';
                    break;
            }
        } else {
            route = customRoute;
        }

        Logger.log("Nav", "Setting " + context + " navigation context root to: " + route);

        while (this.canGoBack()) {
            let lastStep = this.navigationHistory[this.navigationHistory.length - 1];
            if ((lastStep.context != context)) {
                break; // Found the previous context - stop unstacking.
            }
            else {
                this.navigationHistory.pop(); // Same context, unstack the step
            }
        }

        this.navigationHistory.push({ context, route, routerOptions });

        // 2021.04.15 - BPI NOTE: Even if on our side we clear the history, we have to call navigateForward()
        // in angular so that the views are not destroyed when calling intent. If we call navigateRoot(), the ionic
        // routing clears its stack and when we go back, it will re-created the calling screen, which won't be able
        // to receive and display the intent result (UI context fully lost). Note that navigating forward forever could
        // create a major performance or memory issue, not sure. To be followed up, but no better solution for now,
        // as it is not possible to use a custom RouterReuseStrategy with ionic (which could or could not have helped
        // to solve this 'sendIntent' problem).
        //this.navCtrl.navigateRoot(route, routerOptions);
        return this.zone.run(() => {
            return this.navCtrl.navigateForward(route, routerOptions);
        });
    }

    /**
     * Removes the given routes from the history, without navigating anywhere.
     * This is used to clear some routes where we don't want to go back in order to go back to the
     * "screen before the previous screen" in some cases.
     */
    public clearIntermediateRoutes(routes: string[]) {
        this.navigationHistory = this.navigationHistory.filter(step => routes.indexOf(step.route) < 0);
    }

    /**
     * Navigates back to the didSession home and clears the whole navigation history for all
     * contexts. Fresh restart.
     */
    public navigateDIDSessionHome(): Promise<boolean> {
        Logger.log("Nav", "Navigating to DIDSession home");

        let didSessionHome = {
            context: App.DID_SESSIONS,
            route: "/didsessions/pickidentity"
            // route: "/didsessions/preparedid"
        };
        this.navigationHistory = [];
        this.navigationHistory.push(didSessionHome);

        return this.zone.run(() => {
            return this.navCtrl.navigateRoot(didSessionHome.route, { animationDirection: 'back' });
        });
    }

    /**
     * Navigates back to the launcher home and clears the whole navigation history for all
     * contexts. Fresh restart.
     */
    public navigateHome(direction = Direction.BACK): Promise<boolean> {
        Logger.log("Nav", "Navigating to launcher home");

        let launcherHome = {
            context: App.LAUNCHER,
            route: "/launcher/home"
        };
        this.navigationHistory = [];
        this.navigationHistory.push(launcherHome);

        return this.zone.run(() => {
            if (direction != Direction.NONE) // No animation - ex for the first arrival on the launcher home
                return this.navCtrl.navigateRoot(launcherHome.route, { animationDirection: direction });
            else
                return this.navCtrl.navigateRoot(launcherHome.route);
        });
    }

    /**
     * Note: if context is null, uses the current context.
     */
    public navigateTo(context: string, route: string, routerOptions?: NavigationOptions): Promise<boolean> {
        Logger.log("Nav", "Navigating to", route);

        // No context given, assume we stay in the same context.
        if (!context)
            context = this.navigationHistory[this.navigationHistory.length - 1].context;

        let lastStep = this.navigationHistory[this.navigationHistory.length - 1];
        if (!lastStep || (lastStep.route !== route)) {
            this.navigationHistory.push({ context, route, routerOptions });
        }

        return this.zone.run(() => {
            return this.navCtrl.navigateForward(route, routerOptions);
        });
    }

    /**
     * Navigates back in stack, coming back in the steps history. This is cross context and
     * can go back to the previous context.
     */
    public navigateBack(): Promise<boolean> {
        if (!this.canGoBack())
            throw new Error("Unable to navigate back. No more known route in stack");

        this.navigationHistory.pop();
        let previousStep = this.navigationHistory[this.navigationHistory.length - 1];

        Logger.log("Nav", "Navigating back to", previousStep.route);
        return this.navCtrl.navigateBack(previousStep.route, previousStep.routerOptions);
    }

    /**
     * Manually removes all navigation history items. Caution: this method may most of the
     * time not be called manually.
     */
    public clearNavigationHistory() {
        this.navigationHistory = [];
    }

    /**
     * Navigates out of current context to the first screen that belongs to another context
     * If navigate is false, exitCurrentContext will not navigate to new route.
     */
    public async exitCurrentContext(navigate = true): Promise<void> {
        Logger.log("Nav", "Navigating out of current context");

        let currentStep = this.navigationHistory[this.navigationHistory.length - 1];
        this.navigationHistory.pop();
        if (!currentStep) {
            Logger.error("Nav", "Can't get the currentStep, this.navigationHistory:", this.navigationHistory);
            return;
        }
        let startContext = currentStep.context;
        while (this.canGoBack()) {
            currentStep = this.navigationHistory[this.navigationHistory.length - 1];
            if (currentStep.context == startContext)
                this.navigationHistory.pop(); // Same context, unstack the step
            else {
                if (navigate) {
                    // Found the previous context, back to there.
                    await this.navCtrl.navigateBack(currentStep.route, currentStep.routerOptions);
                }
                return;
            }
        }
        if (navigate) {
            // Go to home if this.navigationHistory.length == 1
            await this.navigateHome();
        }
    }

    public canGoBack(): boolean {
        return (this.navigationHistory.length > 1);
    }

    public goToLauncher(): Promise<boolean> {
        return this.navigateHome(Direction.FORWARD);
    }

    public async restartApp() {
        // navigator["app"].exitApp();
        this.splashScreen.show();
        await GlobalServiceManager.getInstance().emitUserSignOut();
        window.location.href = "/";
    }

    public showRestartPrompt(showCancelButton = false): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async resolve => {
            let popover = await this.popoverCtrl.create({
                mode: 'ios',
                cssClass: 'wallet-warning-component',
                component: RestartPromptComponent,
                componentProps: {
                    showCancel: showCancelButton
                },
                translucent: false,
                backdropDismiss: false, // Can't cancel by clicking outside
            });

            void popover.onWillDismiss().then(async (params) => {
                if (params && params.data && params.data.confirm) {
                    await this.restartApp();
                }
                resolve();
            });
            await popover.present();
        });
    }
}
