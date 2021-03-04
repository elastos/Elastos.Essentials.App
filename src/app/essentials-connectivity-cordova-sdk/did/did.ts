declare let appManager: any;
declare let didManager: DIDPlugin.DIDManager;

export class DID {
    static generateAppIDCredential(appInstanceDID: string): Promise<DIDPlugin.VerifiableCredential> {
        return new Promise((resolve, reject)=>{
            try {
                // No such credential, so we have to create one. Send an intent to get that from the did app
                appManager.sendIntent("https://did.elastos.net/appidcredissue", {
                    appinstancedid: appInstanceDID
             }, {
                    // TEMP REMOVED FOR MYFIRSTIDENTITY - RUNTIME TRIES TO OPE NTHE DID APP EVEN IN NATIVE - appId: "org.elastos.trinity.dapp.did" // Force calling the did app itself.
                }, (data: { result: { credential: string } })=>{
                    if (!data || !data.result || !data.result.credential) {
                        console.warn("Missing credential information. The operation was maybe cancelled.");
                        resolve(null);
                        return;
                    }
                    let credential = didManager.VerifiableCredentialBuilder.fromJson(data.result.credential);
                    resolve(credential);
                });
            }
            catch (err) {
                console.log("generateAppIDCredential() error:", err);
                resolve(null);
            }
        });
    }
}