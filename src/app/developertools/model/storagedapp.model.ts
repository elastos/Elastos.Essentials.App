/**
 * App as stored in the local file system.
 */
export class StorageDApp {
    name: string = null;
    didStoreId: string = null;
    didString: string = null;

    public static fromJson(json): StorageDApp {
        let dapp = new StorageDApp();
        Object.assign(dapp, {}, json);
        return dapp;
    }
}