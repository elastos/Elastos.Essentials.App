import { Hive, DID, Interfaces, storage as connectivityStorage, logger as connectivityLogger } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { Logger } from "../logger";
import { GlobalDIDSessionsService } from "../services/global.didsessions.service";
import { GlobalStorageService } from "../services/global.storage.service";

export class EssentialsDIDKeyValueStore implements Interfaces.IKeyValueStorage {
    constructor(private storage: GlobalStorageService) {
    }

    set<T>(key: string, value: T): Promise<void>{
        return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "connectivitysdk", key, value);
    }

    get<T>(key: string, defaultValue: T): Promise<T> {
        return this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "connectivitysdk", key, defaultValue);
    }

    unset(key: string): Promise<void> {
        return this.storage.deleteSetting(GlobalDIDSessionsService.signedInDIDString, "connectivitysdk", key);
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

    constructor() {
    }

    public static init() {
        connectivityLogger.setLoggerLayer(new EssentialsLogger());
        connectivityStorage.setStorageLayer(new EssentialsDIDKeyValueStore(GlobalStorageService.instance));
    }

    /**
     * @param context Isolation context to be able to handle multiple app instance DIDs, etc. Usually, the "app module name"
     */
    public newDIDHelper(): DID.DIDAccess {
        let didHelper = new DID.DIDAccess();
        return didHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveAuthHelper(): Hive.AuthHelper {
        let authHelper = new Hive.AuthHelper();
        return authHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveDataSync(userVault: HivePlugin.Vault, showDebugLogs = false): Hive.DataSync.HiveDataSync {
        let dataSync = new Hive.DataSync.HiveDataSync(userVault, showDebugLogs);
        return dataSync;
    }
}