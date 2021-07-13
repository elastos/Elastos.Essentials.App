import {Injectable} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '../logger';
import { GlobalDIDSessionsService, IdentityEntry } from './global.didsessions.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalService, GlobalServiceManager } from './global.service.manager';

// Network templates are dynamic but for convenience, assume we always have mainnet and testnet ones.
export const MAINNET_TEMPLATE = "MainNet";
export const TESTNET_TEMPLATE = "TestNet";

/**
 * Service reponsible for managing network templates (Main nets, Test nets, Long run weather, custom setup, etc)
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalNetworksService extends GlobalService {
    /** RxJS subject that holds the network template in use */
    public activeNetworkTemplate: BehaviorSubject<string> = new BehaviorSubject(MAINNET_TEMPLATE);

    private availableNetworkTemplate = [
        MAINNET_TEMPLATE, // All operations use main nets for all chains
        TESTNET_TEMPLATE, // All operations use a test net for all chains
        "LRW" // Long Run Weather - Environment to test Cyber Republic features
    ]

    constructor(
        private prefs: GlobalPreferencesService
    ) {
        super();
    }

    public init(): Promise<void> {
        GlobalServiceManager.getInstance().registerService(this);
        return;
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        let currentNetworkTemplate = await this.prefs.getPreference(GlobalDIDSessionsService.signedInDIDString, "network.template") as string;
        Logger.log("networks", "User signing in - Reloading network template:", currentNetworkTemplate);
        this.activeNetworkTemplate.next(currentNetworkTemplate);
    }

    onUserSignOut(): Promise<void> {
        // Reset to MainNet
        this.activeNetworkTemplate.next(MAINNET_TEMPLATE);
        return;
    }

    public async setActiveNetworkTemplate(networkTemplate: string): Promise<void> {
        // Save choice to persistent storage
        await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, "network.template", networkTemplate);
        // Notify listeners
        this.activeNetworkTemplate.next(networkTemplate);
    }

    public getActiveNetworkTemplate(): string {
        return this.activeNetworkTemplate.value;
    }

    public getAvailableNetworkTemplate(): string[] {
        return this.availableNetworkTemplate;
    }
}
