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
        this.services.push(service);
    }

    async emitUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        for (let service of this.services) {
            Logger.log("ServiceManager", "Emiting onUserSignIn() for service:", service);
            await service.onUserSignIn(signedInIdentity);
        }
    }

    async emitUserSignOut(): Promise<void> {
        for (let service of this.services) {
            Logger.log("ServiceManager", "Emiting onUserSignOut() for service:", service);
            await service.onUserSignOut();
        }
    }
}

export abstract class GlobalService {
    constructor() {
        GlobalServiceManager.getInstance().registerService(this);
    }

    abstract onUserSignIn(signedInIdentity: IdentityEntry): Promise<void>;
    abstract onUserSignOut(): Promise<void>;
}