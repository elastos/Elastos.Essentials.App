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
        Logger.log("servicemanager", "Registering global service:", service);
        this.services.push(service);
    }

    async emitUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        for (let service of this.services) {
            let startTimeMs = Date.now();

            Logger.log("servicemanager", "Entering onUserSignIn for service:", service);
            await service.onUserSignIn(signedInIdentity);
            Logger.log("servicemanager", "Exiting onUserSignIn for service:", service);

            // Make sure to warn in logs if a service starts to take too much time and is blocking others.
            const SLOW_INIT_DELAY_MS = 100;
            const CRITICALLY_SLOW_INIT_DELAY_MS = 1000;
            let endTimeMs = Date.now();
            let durationMs = endTimeMs - startTimeMs;
            if (durationMs > CRITICALLY_SLOW_INIT_DELAY_MS) {
                Logger.error("servicemanager", "Call to onUserSignIn() is blocking the app! Expected less than "+SLOW_INIT_DELAY_MS+" ms, but took "+durationMs+" ms.", service);
            }
            else if (durationMs > SLOW_INIT_DELAY_MS) {
                Logger.warn("servicemanager", "Call to onUserSignIn() took too much time! Expected less than "+SLOW_INIT_DELAY_MS+" ms, but took "+durationMs+" ms.", service);
            }
        }

        Logger.log("servicemanager", "Sign in complete for all services");
    }

    async emitUserSignOut(): Promise<void> {
        for (let service of this.services) {
            Logger.log("servicemanager", "Emiting onUserSignOut() for service:", service);
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