import { Injectable } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { Logger } from '../logger';

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
            if (lastStep.context != context)
                break; // Found the previous context - stop unstacking.
            else
                this.navigationHistory.pop(); // Same context, unstack the step
        }

        this.navigateTo(context, route, routerOptions);
    }

    /**
     * Navigates back to the launcher home and clears the whole navigation history for all
     * contexts. Fresh restart.
     */
    public navigateHome() {
        Logger.log("Nav", "Navigating to launcher home");

        let launcherHome = {
            context: "launcher",
            route: "/launcher/home"
        };
        this.navigationHistory = [];
        this.navigationHistory.push(launcherHome);
        this.navCtrl.navigateRoot(launcherHome.route);
    }

    public navigateTo(context: string, route: string, routerOptions?: any) {
        Logger.log("Nav", "Navigating to", route);

        this.navigationHistory.push({context, route, routerOptions});
        this.navCtrl.navigateRoot(route, routerOptions);
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

        this.navCtrl.navigateRoot(previousStep.route, previousStep.routerOptions);
    }

    public canGoBack(): boolean {
        return (this.navigationHistory.length > 1);
    }
}
