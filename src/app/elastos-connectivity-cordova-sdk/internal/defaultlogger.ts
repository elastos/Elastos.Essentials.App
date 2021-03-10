import { ILogger } from "../interfaces/ilogger";

export class DefaultLogger implements ILogger {
    log(...args: any) {
        console.log.apply(console, args);
    }

    warn(...args: any) {
        console.warn.apply(console, args);
    }

    error(...args: any) {
        console.error.apply(console, args);
    }
}