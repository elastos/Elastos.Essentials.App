import { DID, Interfaces, logger, storage } from "@elastosfoundation/elastos-connectivity-sdk-js";
import { Vault } from "@elastosfoundation/hive-js-sdk";
import { Logger } from "../logger";
import { HiveDataSync } from "../model/hive/hivedatasync";
import { GlobalStorageService } from "../services/global.storage.service";
import { DIDSessionsStore } from './../services/stores/didsessions.store';
import { InternalHiveAuthHelper } from "./hive.authhelper";

export class EssentialsDIDKeyValueStore implements Interfaces.IKeyValueStorage {
    constructor(private storage: GlobalStorageService) {
    }

    set<T>(key: string, value: T): Promise<void> {
        return this.storage.setSetting(DIDSessionsStore.signedInDIDString, "connectivitysdk", key, value);
    }

    get<T>(key: string, defaultValue: T): Promise<T> {
        return this.storage.getSetting(DIDSessionsStore.signedInDIDString, "connectivitysdk", key, defaultValue);
    }

    unset(key: string): Promise<void> {
        return this.storage.deleteSetting(DIDSessionsStore.signedInDIDString, "connectivitysdk", key);
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
        logger.setLoggerLayer(new EssentialsLogger());
        storage.setStorageLayer(new EssentialsDIDKeyValueStore(GlobalStorageService.instance));
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
    public newHiveAuthHelper(): InternalHiveAuthHelper {
        let authHelper = new InternalHiveAuthHelper();
        return authHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveDataSync(userVault: Vault, showDebugLogs = false): HiveDataSync {
        let dataSync = new HiveDataSync(userVault, showDebugLogs);
        return dataSync;
    }
}