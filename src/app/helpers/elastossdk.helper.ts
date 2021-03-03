import { DIDHelper } from "../elastos-cordova-sdk/did";
import { AuthHelper, HiveDataSync } from "../elastos-cordova-sdk/hive";
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
        Logger.warn("SDKHelper", "generateAppIDCredential() not yet implemented, returning null credential");
        return null;
    }
}

export class ElastosSDKHelper {
    constructor(private storage: GlobalStorageService) {
    }

    /**
     * @param context Isolation context to be able to handle multiple app instance DIDs, etc. Usually, the "app module name"
     */
    public newDIDHelper(context: string): DIDHelper {
        let didHelper = new DIDHelper(new EssentialsDirectAppIDGenerator());
        didHelper.setStorage(new EssentialsDIDKeyValueStore(this.storage, context));
        return didHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveAuthHelper(context: string): AuthHelper {
        let authHelper = new AuthHelper(new EssentialsDirectAppIDGenerator());
        authHelper.setStorage(new EssentialsDIDKeyValueStore(this.storage, context));
        return authHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveDataSync(context: string, userVault: HivePlugin.Vault, showDebugLogs: boolean = false): HiveDataSync {
        let dataSync = new HiveDataSync(userVault, showDebugLogs);
        dataSync.setStorage(new EssentialsDIDKeyValueStore(this.storage, context));
        return dataSync;
    }
}