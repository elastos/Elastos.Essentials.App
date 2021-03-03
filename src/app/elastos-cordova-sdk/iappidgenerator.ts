export interface IAppIDGenerator {
    generateAppIDCredential(appInstanceDID: string): DIDPlugin.VerifiableCredential;
}