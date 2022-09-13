import moment from "moment";
import { Subscription } from "rxjs";
import { IdentityEntry } from "./model/didsessions/identityentry";
import { GlobalPreferencesService } from "./services/global.preferences.service";
import { GlobalService, GlobalServiceManager } from "./services/global.service.manager";

type DevLogType = "log" | "warn" | "error" | "test";
type DevLogEntry = {
    time: string;
    type: DevLogType;
    module: string;
    entries: (string | object)[]; // all console.log params, either as string, or as stringified objects. Classes with circular dependencies are skipped.
}

class _Logger implements GlobalService {
    private originalConsole = null;
    private originalDebugLog: (...args) => void;
    private originalDebugWarn: (...args) => void;
    private originalDebugErr: (...args) => void;

    private devLogs: DevLogEntry[] = [];
    private collectDevLogs = false; // Whether to collect dev logs for later dump or not.

    private prefSub: Subscription = null;

    public init(originalConsole: Console) {
        this.originalConsole = originalConsole;

        // Replace original log methods with placeholders to warn that the migration is needed
        this.originalDebugLog = this.originalConsole.log;
        this.originalDebugWarn = this.originalConsole.warn;
        this.originalDebugErr = this.originalConsole.error;

        this.originalConsole.log = (...args) => {
            this.originalDebugLog.apply(this.originalConsole, ["%cConvert-To-Logger", 'background: #3078c9; color: #FFF; font-weight:bold; padding:5px;', ...args]);
        }
        this.originalConsole.warn = (...args) => {
            this.originalDebugWarn.apply(this.originalConsole, ["%cConvert-To-Logger WARNING", 'background: #3078c9; color: #FFF; font-weight:bold; padding:5px;', ...args]);
        }
        this.originalConsole.error = (...args) => {
            this.originalDebugErr.apply(this.originalConsole, ["%cConvert-To-Logger ERROR", 'background: #3078c9; color: #FFF; font-weight:bold; padding:5px;', ...args]);
        }

        GlobalServiceManager.getInstance().registerService(this);
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        this.devLogs = [];

        let collectLogs = await GlobalPreferencesService.instance.getCollectLogs(signedInIdentity.didString);
        this.setCollectDevLogs(collectLogs);

        // Subscribe here, not int init(), because prefs service is not ready there.
        this.prefSub = GlobalPreferencesService.instance.preferenceListener.subscribe(pref => {
            if (pref.key === "developer.collectLogs") {
                this.setCollectDevLogs(pref.value);
            }
        });
    }

    onUserSignOut(): Promise<void> {
        if (this.prefSub) {
            this.prefSub.unsubscribe();
            this.prefSub = null;
        }

        this.devLogs = [];
        return;
    }

    public log(module: string, ...args: any) {
        this.logDevLog("log", module, args);
        this.originalDebugLog.apply(this.originalConsole, [
            "%c" + moment(new Date().getTime()).format('HH:mm:ss.SSS') + " " + module.toUpperCase() + "*", 'background: #008730; color: #FFF; font-weight:bold; padding:5px;',
            ...args]);
    }

    public warn(module: string, ...args: any) {
        this.logDevLog("warn", module, args);
        this.originalDebugWarn.apply(this.originalConsole, [
            "%c" + moment(new Date().getTime()).format('HH:mm:ss.SSS') + " " + module.toUpperCase() + "* WARNING", 'background: #d59100; color: #FFF; font-weight:bold; padding:5px;',
            ...args]);
    }

    public error(module: string, ...args: any) {
        this.logDevLog("error", module, args);
        this.originalDebugErr.apply(this.originalConsole, [
            "%c" + moment(new Date().getTime()).format('HH:mm:ss.SSS') + " " + module.toUpperCase() + "* ERROR", 'background: #b30202; color: #FFF; font-weight:bold; padding:5px;',
            ...args]);
    }

    public test(module: string, ...args: any) {
        this.logDevLog("test", module, args);
        this.originalDebugLog.apply(this.originalConsole, [
            "%c" + moment(new Date().getTime()).format('HH:mm:ss.SSS') + " " + module.toUpperCase() + "* TEST", 'background: #7B68EE; color: #FFF; font-weight:bold; padding:5px;',
            ...args]);
    }

    /**
     * Whether to collect dev logs in memory waiting to be dumped later, or not.
     * Set by the preferences service when Essentials starts or when user toggles the option
     * in the settings.
     */
    public setCollectDevLogs(enabled: boolean) {
        this.collectDevLogs = enabled;
        //this.devLogs = []; // NOTE: do not empty the logs every time because sometimes the UI triggers this methods a bit too much or temporarily with false, and we don't want to delete everything
    }

    /**
     * If the dev log mode is enabled, appends a log to the dev log as advanced object.
     * This log can later be sent to developers for advanced debugging.
     */
    private logDevLog(type: DevLogType, module: string, args: any) {
        if (!this.collectDevLogs)
            return;

        let entries: (string | object)[] = [];

        // Check all args. Convert classes to basic JSON object. Remove big objects / circular dependencies.
        for (let arg of args) {
            if (typeof arg === "string")
                entries.push(arg);
            else if (typeof arg === "object") {
                try {
                    let stringifiedObject = JSON.stringify(arg);

                    // If the object size is too large, don't put it in the log as is. Keep only a truncated
                    // stringified version of it.
                    stringifiedObject = stringifiedObject || "";
                    if (stringifiedObject.length > 1000) {
                        entries.push(stringifiedObject.substring(0, 200));
                    }
                    else {
                        // Convert back to simple object
                        let simpleObject = JSON.parse(stringifiedObject);
                        entries.push(simpleObject);
                    }
                }
                catch (e) {
                    // Catch circular dependency exceptions - skip this object.
                }
            }
        }

        let newLog: DevLogEntry = {
            time: moment().format('MMM DD - HH:mm:ss.SSS'),
            type,
            module,
            entries
        };
        this.devLogs.push(newLog);

        // Keep only N latest entries
        this.devLogs = this.devLogs.slice(-200);
    }

    public getDevLogs(): DevLogEntry[] {
        return this.devLogs;
    }
}

export const Logger = new _Logger();