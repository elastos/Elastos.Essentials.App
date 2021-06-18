import { Injectable } from '@angular/core';
import { Logger } from '../logger';
import { IdentityEntry } from './global.didsessions.service';

@Injectable({
    providedIn: 'root'
})
export class GlobalServiceManager {
    private static instance: GlobalServiceManager;

    public static getInstance(): GlobalServiceManager {
        if (!GlobalServiceManager.instance) {
            GlobalServiceManager.instance = new GlobalServiceManager();
        }

        return GlobalServiceManager.instance;
    }

    constructor() {
    }

    private services: GlobalService[] = [];

    registerService(service: GlobalService) {
        Logger.log("global", "Registering global service:", service);
        this.services.push(service);
    }

    async emitUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        for (let service of this.services) {
            let startTimeMs = Date.now();

            await service.onUserSignIn(signedInIdentity);

            // Make sure to warn in logs if a service starts to take too much time and is blocking others.
            const SLOW_INIT_DELAY_MS = 200;
            const CRITICALLY_SLOW_INIT_DELAY_MS = 1000;
            let endTimeMs = Date.now();
            let durationMs = endTimeMs - startTimeMs;
            if (durationMs > CRITICALLY_SLOW_INIT_DELAY_MS) {
                Logger.error("global", "Call to onUserSignIn() is blocking the app! Expected less than "+SLOW_INIT_DELAY_MS+" ms, but took "+durationMs+" ms.", service);
            }
            else if (durationMs > SLOW_INIT_DELAY_MS) {
                Logger.warn("global", "Call to onUserSignIn() took too much time! Expected less than "+SLOW_INIT_DELAY_MS+" ms, but took "+durationMs+" ms.", service);
            }
        }
    }

    async emitUserSignOut(): Promise<void> {
        for (let service of this.services) {
            await service.onUserSignOut();
        }
    }
}

export abstract class GlobalService {
    constructor() {
    }
//        GlobalServiceManager.getInstance().registerService(this);

    abstract onUserSignIn(signedInIdentity: IdentityEntry): Promise<void>;
    abstract onUserSignOut(): Promise<void>;
}