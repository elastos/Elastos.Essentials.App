import { DIDHelper } from "../elastos-cordova-sdk/did";
import { AuthHelper, HiveDataSync } from "../elastos-cordova-sdk/hive";
import { IAppIDGenerator } from "../elastos-cordova-sdk/iappidgenerator";
import { IKeyValueStorage } from "../elastos-cordova-sdk/ikeyvaluestorage";
import { TrinityWeb3Provider } from "../essentials-connectivity-cordova-sdk/ethereum/web3/providers";
import { Logger } from "../logger";
import { GlobalDIDSessionsService } from "../services/global.didsessions.service";
import { GlobalStorageService } from "../services/global.storage.service";
import * as ConnectivitySDK from "../essentials-connectivity-cordova-sdk";
import { GlobalPreferencesService } from "../services/global.preferences.service";
import { ILogger } from "../elastos-cordova-sdk/ilogger";

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
    generateAppIDCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential> {
        return ConnectivitySDK.DID.DID.generateAppIDCredential(appInstanceDID);
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
    constructor() {
    }

    private newLogger(): ILogger {
        return
    }

    /**
     * @param context Isolation context to be able to handle multiple app instance DIDs, etc. Usually, the "app module name"
     */
    public newDIDHelper(context: string): DIDHelper {
        let didHelper = new DIDHelper(new EssentialsDirectAppIDGenerator());
        didHelper.setStorage(new EssentialsDIDKeyValueStore(GlobalStorageService.instance, context));
        didHelper.setLogger(new EssentialsLogger());
        return didHelper;
    }

    /**
     * @param context Isolation context to be able to handle multiple auth tokens, etc. Usually, the "app module name"
     */
    public newHiveAuthHelper(context: string): AuthHelper {
        let authHelper = new AuthHelper(new EssentialsDirectAppIDGenerator());
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

    public async newWeb3Provider(): Promise<TrinityWeb3Provider> {
        let ethRPCEndpoint = await GlobalPreferencesService.instance.getETHSidechainRPCApiEndpoint(GlobalDIDSessionsService.signedInDIDString);
        return new ConnectivitySDK.Ethereum.Web3.Providers.TrinityWeb3Provider(ethRPCEndpoint);
    }
}