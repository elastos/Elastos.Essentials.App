import { Injectable } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { Logger } from '../logger';

export enum Direction {
    NONE = "none",
    FORWARD = "forward",
    BACK = "back"
}

export enum App {
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
}

type NavigationStep = {
    context: string;
    route: string;
    routerOptions?: any;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalNavService {
    public loader: HTMLIonLoadingElement = null;
    public alert = null;
    private navigationHistory: NavigationStep[] = [];

    constructor(
      private navCtrl: NavController,
      public modalController: ModalController
    ) { }

    /**
     * Deletes all recent steps as long as they belong to the given context.
     * This basically comes back to the root of a "dApp".
     */
    public navigateRoot(context: string, route: string, routerOptions?: any) {
        Logger.log("Nav", "Setting "+context+" navigation context root to: "+route);

        while (this.canGoBack()) {
            let lastStep = this.navigationHistory[this.navigationHistory.length-1];
            let last2Step = this.navigationHistory[this.navigationHistory.length-2];
            if ((lastStep.context != context) || (last2Step.context != context)) {
                break; // Found the previous context - stop unstacking.
            }
            else {
                this.navigationHistory.pop(); // Same context, unstack the step
            }
        }

        this.navigationHistory.push({context, route, routerOptions});
        this.navCtrl.navigateRoot(route, routerOptions);
    }

    /**
     * Navigates back to the didSession home and clears the whole navigation history for all
     * contexts. Fresh restart.
     */
    public navigateDIDSessionHome() {
        Logger.log("Nav", "Navigating to DIDSession home");

        let didSessionHome = {
            context: App.DID_SESSIONS,
            route: "/didsessions/pickidentity"
        };
        this.navigationHistory = [];
        this.navigationHistory.push(didSessionHome);
        this.navCtrl.navigateRoot(didSessionHome.route, {animationDirection: 'back'});
    }

    /**
     * Navigates back to the launcher home and clears the whole navigation history for all
     * contexts. Fresh restart.
     */
    public navigateHome(direction = Direction.BACK) {
        Logger.log("Nav", "Navigating to launcher home");

        let launcherHome = {
            context: App.LAUNCHER,
            route: "/launcher/home"
        };
        this.navigationHistory = [];
        this.navigationHistory.push(launcherHome);

        if (direction != Direction.NONE) // No animation - ex for the first arrival on the launcher home
            this.navCtrl.navigateRoot(launcherHome.route, {animationDirection: direction});
        else
            this.navCtrl.navigateRoot(launcherHome.route);
    }

    public navigateTo(context: string, route: string, routerOptions?: any) {
        Logger.log("Nav", "Navigating to", route);

        this.navigationHistory.push({context, route, routerOptions});
        this.navCtrl.navigateForward(route, routerOptions);
    }

    /**
     * Navigates back in stack, coming back in the steps history. This is cross context and
     * can go back to the previous context.
     */
    public navigateBack() {
        if (!this.canGoBack())
            throw new Error("Unable to navigate back. No more known route in stack");

        this.navigationHistory.pop();
        let previousStep = this.navigationHistory[this.navigationHistory.length-1];

        Logger.log("Nav", "Navigating back to", previousStep.route);
        this.navCtrl.navigateBack(previousStep.route, previousStep.routerOptions);
    }

    /**
     * Navigates out of current context to the first screen that belongs to another context
     * If navigate is false, exitCurrentContext will not navigate to new route.
     */
    public exitCurrentContext(navigate = true) {
        Logger.log("Nav", "Navigating out of current context");

        let currentStep = this.navigationHistory[this.navigationHistory.length-1];
        this.navigationHistory.pop();
        if (!currentStep) {
            Logger.error("Nav", "Can't get the currentStep, this.navigationHistory:", this.navigationHistory);
            return;
        }
        let startContext = currentStep.context;
        while (this.canGoBack()) {
            currentStep = this.navigationHistory[this.navigationHistory.length-1];
            if (currentStep.context == startContext)
                this.navigationHistory.pop(); // Same context, unstack the step
            else {
                if (navigate) {
                    // Found the previous context, back to there.
                    this.navCtrl.navigateBack(currentStep.route, currentStep.routerOptions);
                }
                return;
            }
        }
        if (navigate) {
            // Go to home if this.navigationHistory.length == 1
            this.navigateHome();
        }
    }

    public canGoBack(): boolean {
        return (this.navigationHistory.length > 1);
    }
}
