import { AuthHelper, HiveDataSync } from "../elastos-connectivity-cordova-sdk/hive";
import { IKeyValueStorage } from "../elastos-connectivity-cordova-sdk/interfaces/ikeyvaluestorage";
import { Logger } from "../logger";
import { GlobalDIDSessionsService } from "../services/global.didsessions.service";
import { GlobalStorageService } from "../services/global.storage.service";
//import * as ConnectivitySDK from "../essentials-connectivity-cordova-sdk";
import { ILogger } from "../elastos-connectivity-cordova-sdk/interfaces/ilogger";
import { DIDAccess } from "../elastos-connectivity-cordova-sdk/did";

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

class EssentialsLogger implements ILogger {
    log(...args: any) {
        Logger.log.apply(Logger, ["elastossdk", ...args]);
    }
    warn(...args: any) {
        Logger.warn.apply(Logger, ["elastossdk", ...args]);
    }
    error(...args: any) {
        Logger.error.apply(Logger, ["elastossdk", ...args]);
    }

}

export class ElastosSDKHelper {
    private static setupCompleted = false;

    constructor() {}

    /**
     * @param context Isolation context to be able to handle multiple app instance DIDs, etc. Usually, the "app module name"
     */
    public newDIDHelper(context: string): DIDAccess {
        let didHelper = new DIDAccess();
        didHelper.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        didHelper.setLogger(new EssentialsLogger());
        return didHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveAuthHelper(context: string): AuthHelper {
        let authHelper = new AuthHelper();
        authHelper.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        authHelper.setLogger(new EssentialsLogger());
        return authHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveDataSync(context: string, userVault: HivePlugin.Vault, showDebugLogs: boolean = false): HiveDataSync {
        let dataSync = new HiveDataSync(userVault, showDebugLogs);
        dataSync.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        dataSync.setLogger(new EssentialsLogger());
        return dataSync;
    }
}