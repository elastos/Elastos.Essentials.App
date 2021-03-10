export interface IKeyValueStorage {
    set(key: string, value: string): Promise<void>;
    get(key: string, defaultValue: string | null): Promise<string>;
}