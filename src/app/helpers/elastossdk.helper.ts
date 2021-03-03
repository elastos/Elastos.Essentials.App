import { DIDHelper } from "../elastos-cordova-sdk/did";
import { IAppIDGenerator } from "../elastos-cordova-sdk/iappidgenerator";
import { IKeyValueStorage } from "../elastos-cordova-sdk/ikeyvaluestorage";
import { Logger } from "../logger";
import { GlobalDIDSessionsService } from "../services/global.didsessions.service";
import { GlobalStorageService } from "../services/global.storage.service";

export class EssentialsDIDKeyValueStore implements IKeyValueStorage {
    constructor(private storage: GlobalStorageService, private context: string) {
    }

    set<T>(key: string, value: T): Promise<void>{
        return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, this.context, key, value);
    }

    get<T>(key: string, defaultValue: T): Promise<T> {
        return this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, this.context, key, defaultValue);
    }
}

/**
 * NOTE: To be used only from inside essentials, not for external intent requests.
 */
export class EssentialsDirectAppIDGenerator implements IAppIDGenerator {
    generateAppIDCredential(appInstanceDID: string): DIDPlugin.VerifiableCredential {
        // TODO: call the identity app service that will automatically generate and return the credential
        Logger.warn("")
        return null;
    }
}

export class ElastosSDKHelper {
    constructor(private storage: GlobalStorageService) {
    }

    public getDIDHelper(context: string): DIDHelper {
        let didHelper = new DIDHelper(new EssentialsDirectAppIDGenerator());
        didHelper.setStorage(new EssentialsDIDKeyValueStore(this.storage, context));
        return didHelper;
    }
}