export interface IDIDConnectorAPI {
    getCredentials(claims: any): Promise<DIDPlugin.VerifiablePresentation>;
    generateAppIdCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential>;
}