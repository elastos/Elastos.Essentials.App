export interface IAppIDGenerator {
    generateAppIDCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential>;
}