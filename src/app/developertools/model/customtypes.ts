import { StorageDApp } from "./storagedapp.model";

/**
 * Returned info after a new app is created.
 */
export type CreatedDApp = {
    dapp: StorageDApp,
    mnemonic: string
};
