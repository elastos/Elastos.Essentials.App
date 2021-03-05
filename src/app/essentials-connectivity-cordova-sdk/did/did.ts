declare let appManager: AppManagerPlugin.AppManager;
declare let didManager: DIDPlugin.DIDManager;

export class DID {
    static generateAppIDCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential> {
        console.log("Essentials: app ID Credential generation flow started");

        return new Promise(async (resolve, reject)=>{
            try {
                // No such credential, so we have to create one. Send an intent to get that from the did app
                let res: { result: { credential: string } } = await appManager.sendIntent("https://did.elastos.net/appidcredissue", {
                    appinstancedid: appInstanceDID
                });

                console.log("Got response for the appidcredissue intent", res);

                if (!res || !res.result || !res.result.credential) {
                    console.warn("Missing credential information. The operation was maybe cancelled.");
                    resolve(null);
                    return;
                }
                let credential = didManager.VerifiableCredentialBuilder.fromJson(res.result.credential);
                resolve(credential);
            }
            catch (err) {
                console.log("generateAppIDCredential() error:", err);
                resolve(null);
            }
        });
    }
}