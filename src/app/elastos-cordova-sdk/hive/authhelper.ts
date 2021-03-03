import { IAppIDGenerator } from "../iappidgenerator";
import { IKeyValueStorage } from "../ikeyvaluestorage";
import { DID } from "../index";

declare let didManager: DIDPlugin.DIDManager;
declare let hiveManager: HivePlugin.HiveManager;

export class AuthHelper {
  private didHelper: DID.DIDHelper;
  private storageLayer: IKeyValueStorage = null;

  constructor(private appIDGenerator: IAppIDGenerator | null) {
  }

  /**
   * Overrides the default storage layer in order to store data in a custom storage.
   * By default, the default storage uses webview's local storage.
   */
  public setStorage(storageLayer: IKeyValueStorage) {
    this.storageLayer = storageLayer;
  }

  /**
   * Returns a hive client object ready to handle the authentication flow. This method can be used by dApps
   * for convenience, or can be skipped and customized in-app if the app wants a different behaviour.
   */
  public getClientWithAuth(onAuthError?: (e: Error)=>void): Promise<HivePlugin.Client> {
    return new Promise(async (resolve)=>{
      this.didHelper = new DID.DIDHelper(this.appIDGenerator);
      this.didHelper.setStorage(this.storageLayer);

      let authHelper = this;

      // Initiate or retrieve an application instance DID. This DID is used to sign authentication content
      // for hive. Hive uses the given app instance DID document to verify JWTs received later, using an unpublished
      // app instance DID.
      console.log("Getting an app instance DID");
      let appInstanceDIDInfo = await this.didHelper.getOrCreateAppInstanceDID();

      console.log("Getting app instance DID document");
      appInstanceDIDInfo.didStore.loadDidDocument(appInstanceDIDInfo.did.getDIDString(), async (didDocument)=>{
        console.log("Got app instance DID document. Now creating the Hive client", didDocument);
        let client = await hiveManager.getClient({
          authenticationHandler: new class AuthenticationHandler implements HivePlugin.AuthenticationHandler {
            /**
             * Called by the Hive plugin when a hive backend needs to authenticate the user and app.
             * The returned data must be a verifiable presentation, signed by the app instance DID, and
             * including a appid certification credential provided by the identity application.
             */
            async authenticationChallenge(jwtToken: string): Promise<string> {
              console.log("Hive client authentication challenge callback is being called with token:", jwtToken);
              try {
                return await authHelper.handleVaultAuthenticationChallenge(jwtToken);
              }
              catch (e) {
                console.error("Exception in authentication handler:", e);
                if (onAuthError)
                  onAuthError(e);
                return null;
              }
            }
          },
          authenticationDIDDocument: await didDocument.toJson()
        });

        console.log("Hive client initialization completed");
        resolve(client);
      }, (err)=>{
        console.error(err);
      });
    });
  }
  /*
  - auth challenge: JWT (iss, nonce)
  - hive sdk:
    - verify jwt
    - extract iss and nonce
  - consumer dapp:
    - generate app instance presentation including nonce=nonce, realm=iss, app id credential
    - embed presentation as JWT and return to the hive auth handler
  - server side:
    - verify jwt (using local app instance did public key provided before)
    - generate access token
  */
  public handleVaultAuthenticationChallenge(jwtToken: string): Promise<string> {
    return this.generateAuthPresentationJWT(jwtToken);
  }

  /**
   * Generates a JWT token needed by hive vaults to authenticate users and app.
   * That JWT contains a verifiable presentation that contains server challenge info, and the app id credential
   * issued by the end user earlier.
   */
  private generateAuthPresentationJWT(authChallengeJwttoken: string): Promise<string> {
    console.log("Starting process to generate hive auth presentation JWT");

    return new Promise(async (resolve, reject)=>{
      // Parse, but verify on chain that this JWT is valid first
      let parseResult = await didManager.parseJWT(true, authChallengeJwttoken);

      if (!parseResult.signatureIsValid) {
        // Could not verify the received JWT as valid - reject the authentication request by returning a null token
        reject("The received authentication JWT token signature cannot be verified or failed to verify: "+parseResult.errorReason+". Is the hive back-end DID published? Are you on the right network?");
        return;
      }

      // The request JWT must contain iss and nonce fields
      if (!("iss" in parseResult.payload) || !("nonce" in parseResult.payload)) {
        reject("The received authentication JWT token does not contain iss or nonce");
        return;
      }

      // Generate a hive authentication presentation and put the credential + back-end info such as nonce inside
      let nonce = parseResult.payload["nonce"] as string;
      let realm = parseResult.payload["iss"] as string;

      console.log("Getting app instance DID");
      let appInstanceDID = (await this.didHelper.getOrCreateAppInstanceDID()).did;

      let appInstanceDIDInfo = await this.didHelper.getExistingAppInstanceDIDInfo();

      console.log("Getting app identity credential");
      let appIdCredential = await this.didHelper.getOrCreateAppIdentityCredential();

      if (!appIdCredential) {
        console.warn("Empty app id credential");
        resolve(null);
        return;
      }

      // Create the presentation that includes hive back end challenge (nonce) and the app id credential.
      console.log("Creating DID presentation response for Hive authentication challenge"),
      appInstanceDID.createVerifiablePresentation([
        appIdCredential
      ], realm, nonce, appInstanceDIDInfo.storePassword, async (presentation)=>{
        if (presentation) {
          // Generate the hive back end authentication JWT
          console.log("Opening DID store to create a JWT for presentation:", presentation);
          let didStore = await this.didHelper.openDidStore(appInstanceDIDInfo.storeId);

          console.log("Loading DID document");
          didStore.loadDidDocument(appInstanceDIDInfo.didString, async (didDocument)=>{
            let validityDays = 2;
            console.log("Creating JWT");
            didDocument.createJWT({
              presentation: JSON.parse(await presentation.toJson())
            }, validityDays, appInstanceDIDInfo.storePassword, (jwtToken)=>{
              console.log("JWT created for presentation:", jwtToken);
              resolve(jwtToken);
            }, (err)=>{
              reject(err);
            });
          }, (err)=>{
            reject(err);
          });
        }
        else {
          reject("No presentation generated");
        }
      });
    });
  }
}