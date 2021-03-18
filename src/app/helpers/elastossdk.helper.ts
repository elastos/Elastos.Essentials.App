import { Hive, DID, Interfaces } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { Logger } from "../logger";
import { GlobalDIDSessionsService } from "../services/global.didsessions.service";
import { GlobalStorageService } from "../services/global.storage.service";

export class EssentialsDIDKeyValueStore implements Interfaces.IKeyValueStorage {
    constructor(private storage: GlobalStorageService, private context: string) {
    }

    set<T>(key: string, value: T): Promise<void>{
        return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, this.context, key, value);
    }

    get<T>(key: string, defaultValue: T): Promise<T> {
        return this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, this.context, key, defaultValue);
    }
}

class EssentialsLogger implements Interfaces.ILogger {
    log(...args: any) {
        Logger.log.apply(Logger, ["connectivitysdk", ...args]);
    }
    warn(...args: any) {
        Logger.warn.apply(Logger, ["connectivitysdk", ...args]);
    }
    error(...args: any) {
        Logger.error.apply(Logger, ["connectivitysdk", ...args]);
    }

}

export class ElastosSDKHelper {
    private static setupCompleted = false;

    constructor() {}

    /**
     * @param context Isolation context to be able to handle multiple app instance DIDs, etc. Usually, the "app module name"
     */
    public newDIDHelper(context: string): DID.DIDAccess {
        let didHelper = new DID.DIDAccess();
        // didHelper.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        didHelper.setLogger(new EssentialsLogger());
        return didHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveAuthHelper(context: string): Hive.AuthHelper {
        let authHelper = new Hive.AuthHelper();
        // authHelper.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        authHelper.setLogger(new EssentialsLogger());
        return authHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveDataSync(context: string, userVault: HivePlugin.Vault, showDebugLogs: boolean = false): Hive.DataSync.HiveDataSync {
        let dataSync = new Hive.DataSync.HiveDataSync(userVault, showDebugLogs);
        dataSync.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        dataSync.setLogger(new EssentialsLogger());
        return dataSync;
    }
}