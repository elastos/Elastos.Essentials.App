import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GlobalPreferencesService } from './global.preferences.service';
import { DIDSessionsStore } from './stores/didsessions.store';
import { NetworkTemplateStore } from './stores/networktemplate.store';

// Network templates are dynamic but for convenience, assume we always have mainnet and testnet ones.
export const MAINNET_TEMPLATE = "MainNet";
export const TESTNET_TEMPLATE = "TestNet";
export const LRW_TEMPLATE = "LRW"; // Long Run Weather - Environment to test Cyber Republic features.


/**
 * Service reponsible for managing network templates (Main nets, Test nets, Long run weather, custom setup, etc)
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalNetworksService {
    public static instance: GlobalNetworksService = null;

    /** RxJS subject that holds the network template in use */
    public activeNetworkTemplate: BehaviorSubject<string> = new BehaviorSubject(MAINNET_TEMPLATE);

    private availableNetworkTemplate = [
        MAINNET_TEMPLATE, // All operations use main nets for all chains
        TESTNET_TEMPLATE, // All operations use a test net for all chains
        LRW_TEMPLATE // Long Run Weather - Environment to test Cyber Republic features
    ]

    constructor(private prefs: GlobalPreferencesService) {
        GlobalNetworksService.instance = this;
    }

    public async init(): Promise<void> {
        this.activeNetworkTemplate.next(await this.prefs.getPreference(null, null, "network.template", true) as string);
        NetworkTemplateStore.networkTemplate = this.activeNetworkTemplate.value;
    }

    public async setActiveNetworkTemplate(networkTemplate: string): Promise<void> {
        if (DIDSessionsStore.signedInDIDString !== null) {
            throw new Error("setActiveNetworkTemplate() is a global preference shared by all users and may be called only from DID sessions, when no user is signed in");
        }

        // Save choice to persistent storage - global for all users
        await this.prefs.setPreference(null, null, "network.template", networkTemplate, true);
        // Notify listeners
        this.activeNetworkTemplate.next(networkTemplate);
        NetworkTemplateStore.networkTemplate = this.activeNetworkTemplate.value;
    }

    public getActiveNetworkTemplate(): string {
        return this.activeNetworkTemplate.value;
    }

    public getAvailableNetworkTemplate(): string[] {
        return this.availableNetworkTemplate;
    }
}
