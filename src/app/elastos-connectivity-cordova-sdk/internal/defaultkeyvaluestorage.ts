import { IKeyValueStorage } from "../interfaces/ikeyvaluestorage";

/**
 * Default implementation for storing data, in case no provider is passed.
 */
export class DefaultKeyValueStorage implements IKeyValueStorage {
    async set(key: string, value: string): Promise<void> {
        window.localStorage.setItem(key, value.toString());
    }

    async get(key: string, defaultValue: string): Promise<string> {
        let value = window.localStorage.getItem(key);
        if (value)
            return value as string;
        else
            return defaultValue;
    }

}