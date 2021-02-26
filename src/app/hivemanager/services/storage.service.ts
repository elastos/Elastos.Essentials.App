import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable()
export class StorageService {
    constructor(private storage: Storage) {
    }

    public set(key: string, value: any): Promise<any> {
        return this.storage.set(key, value);
    }

    public get<T>(key: string): Promise<T> {
        return this.storage.get(key);
    }

    public setJson(key: string, value: any): Promise<void> {
        return this.storage.set(key, JSON.stringify(value));
    }

    public async getJson(key: string): Promise<any> {
        let value = await this.storage.get(key);
        return JSON.parse(value);
    }

    public remove(key: string): any {
        return this.storage.remove(key);
    }

    public async getSignedInDID(): Promise<string> {
        return this.get<string>("signedindid");
    }

    public async setSignedInDID(didString: string): Promise<void> {
        return this.set("signedindid", didString);
    }
}
