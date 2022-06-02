import { DID } from "@elastosfoundation/elastos-connectivity-sdk-cordova";
import { GlobalConfig } from "../config/globalconfig";
import { Logger } from "../logger";
import { GlobalHiveService } from "../services/global.hive.service";

declare let didManager: DIDPlugin.DIDManager;
declare let hiveManager: HivePlugin.HiveManager;

/**
 * We rewrite our own hive authentication helper instead of using the one provided by the connectivity SDK,
 * in order to silently generate app id credentials for internal hive requests, as the normal behaviour is
 * to show confirmation screens to user.
 */
export class InternalHiveAuthHelper {
  private didAccess: DID.DIDAccess;

  constructor() {
  }

  /**
   * Returns a hive client object ready to handle the authentication flow. This method can be used by dApps
   * for convenience, or can be skipped and customized in-app if the app wants a different behaviour.
   */
  public getClientWithAuth(onAuthError?: (e: Error) => void): Promise<HivePlugin.Client> {
    //this.clearVaultAccessToken(); // TMP DEBUG HELPER

    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve) => {
      this.didAccess = new DID.DIDAccess();

      let authHelper = this;

      // Initiate or retrieve an application instance DID. This DID is used to sign authentication content
      // for hive. Hive uses the given app instance DID document to verify JWTs received later, using an unpublished
      // app instance DID.
      Logger.log("hiveauthhelper", "Getting an app instance DID");
      let appInstanceDIDInfo = await this.didAccess.getOrCreateAppInstanceDID();

      Logger.log("hiveauthhelper", "Getting app instance DID document");
      // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
      appInstanceDIDInfo.didStore.loadDidDocument(appInstanceDIDInfo.did.getDIDString(), async (didDocument) => {
        Logger.log("hiveauthhelper", "Got app instance DID document. Now creating the Hive client", await didDocument.toJson());
        let client = await hiveManager.getClient({
          authenticationHandler: new class AuthenticationHandler implements HivePlugin.AuthenticationHandler {
            /**
             * Called by the Hive plugin when a hive backend needs to authenticate the user and app.
             * The returned data must be a verifiable presentation, signed by the app instance DID, and
             * including a appid certification credential provided by the identity application.
             */
            async authenticationChallenge(jwtToken: string): Promise<string> {
              Logger.log("hiveauthhelper", "Hive client authentication challenge callback is being called with token:", jwtToken);
              try {
                return await authHelper.handleVaultAuthenticationChallenge(jwtToken);
              }
              catch (e) {
                Logger.error("hiveauthhelper", "Exception in authentication handler:", e);
                if (onAuthError)
                  onAuthError(e);
                return null;
              }
            }
          },
          authenticationDIDDocument: await didDocument.toJson()
        });

        Logger.log("hiveauthhelper", "Hive client initialization completed");
        resolve(client);
      }, (err) => {
        Logger.error("hiveauthhelper", err);
      });

    });
  }

  /**
   * Debug method to delete user's hive vault authentication in order to force a new authentication flow.
   */
  private clearVaultAccessToken() {
    GlobalHiveService.instance.vaultStatus.subscribe(s => {
      if (s) {
        console.log("DELETING HIVE VAULT ACCESS TOKEN");
        void GlobalHiveService.instance.getActiveVault().revokeAccessToken();
      }
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
    Logger.log("hiveauthhelper", "Starting process to generate hive auth presentation JWT");

    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve, reject) => {
      // Parse, but verify on chain that this JWT is valid first
      let parseResult = await didManager.parseJWT(true, authChallengeJwttoken);

      if (!parseResult.signatureIsValid) {
        // Could not verify the received JWT as valid - reject the authentication request by returning a null token
        reject("The received authentication JWT token signature cannot be verified or failed to verify: " + parseResult.errorReason + ". Is the hive back-end DID published? Are you on the right network?");
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

      Logger.log("hiveauthhelper", "Getting app instance DID");
      let appInstanceDID = (await this.didAccess.getOrCreateAppInstanceDID()).did;

      let appInstanceDIDInfo = await this.didAccess.getExistingAppInstanceDIDInfo();

      Logger.log("hiveauthhelper", "Getting app identity credential");
      let appIdCredential = await this.didAccess.getExistingAppIdentityCredential();

      if (!appIdCredential) {
        Logger.log("hiveauthhelper", "Empty app id credential. Trying to generate a new one");

        appIdCredential = await this.generateAppIdCredential();
        if (!appIdCredential) {
          Logger.warn("hiveauthhelper", "Failed to generate a new App ID credential");
          resolve(null);
          return;
        }
      }

      // Create the presentation that includes hive back end challenge (nonce) and the app id credential.
      Logger.log("hiveauthhelper", "Creating DID presentation response for Hive authentication challenge"),
        appInstanceDID.createVerifiablePresentation([
          appIdCredential
        ],
          realm,
          nonce,
          // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
          appInstanceDIDInfo.storePassword, async (presentation) => {
            if (presentation) {
              // Generate the hive back end authentication JWT
              Logger.log("hiveauthhelper", "Opening DID store to create a JWT for presentation:", await presentation.toJson());
              let didStore = await DID.DIDHelper.openDidStore(appInstanceDIDInfo.storeId);

              Logger.log("hiveauthhelper", "Loading DID document");
              // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
              didStore.loadDidDocument(appInstanceDIDInfo.didString, async (didDocument) => {
                let validityDays = 2;
                Logger.log("hiveauthhelper", "App instance DID document", await didDocument.toJson());
                Logger.log("hiveauthhelper", "Creating JWT");
                didDocument.createJWT({
                  presentation: JSON.parse(await presentation.toJson())
                }, validityDays, appInstanceDIDInfo.storePassword, (jwtToken) => {
                  Logger.log("hiveauthhelper", "JWT created for presentation:", jwtToken);
                  resolve(jwtToken);
                }, (err) => {
                  reject(err);
                });
              }, (err) => {
                reject(err);
              });
            }
            else {
              reject("No presentation generated");
            }
          });
    });
  }

  private generateAppIdCredential(): Promise<DIDPlugin.VerifiableCredential> {
    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve) => {
      let storedAppInstanceDID = await this.didAccess.getOrCreateAppInstanceDID();
      if (!storedAppInstanceDID) {
        resolve(null);
        return;
      }

      let appInstanceDID = storedAppInstanceDID.did;

      // No such credential, so we have to create one. Send an intent to get that from the did app
      Logger.log("hiveauthhelper", "Starting to generate a new App ID credential.");

      // Directly generate the credential without user confirmation.
      let AppIDService = (await import("../identity/services/appid.service")).AppIDService; // Lazy
      let credential = await AppIDService.instance.generateApplicationIDCredential(appInstanceDID.getDIDString(), GlobalConfig.ESSENTIALS_APP_DID);

      // Save this issued credential for later use.
      appInstanceDID.addCredential(credential);

      // This generated credential must contain the following properties:
      // TODO: CHECK THAT THE RECEIVED CREDENTIAL CONTENT IS VALID
      // appInstanceDid
      // appDid

      resolve(credential);
    });
  }
}