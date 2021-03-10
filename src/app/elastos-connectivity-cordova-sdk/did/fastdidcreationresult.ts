export type FastDIDCreationResult = {
    didStore: DIDPlugin.DIDStore;
    did: DIDPlugin.DID;
    storePassword: string;
}