
/**
 * NOTE: for now this is a simple mapping to console.log.
 * Used to keep the same code style as the c++ spvsdk.
 * could be improved later for better log support (files, filters...)
 */
export class Log {
    public static log(...args: any) {
        console.log.apply(console, ...args);
    }

    public static warn(...args: any) {
        console.warn.apply(console, ...args);
    }

    public static error(...args: any) {
        console.error.apply(console, ...args);
    }
}