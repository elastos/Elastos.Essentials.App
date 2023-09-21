import type { DIDDocument, VerifiableCredential } from "@elastosfoundation/did-js-sdk";
import { DID } from "@elastosfoundation/elastos-connectivity-sdk-js";
import type { AppContext, AppContextProvider, Vault, VaultSubscription } from "@elastosfoundation/hive-js-sdk";
import moment from "moment";
import Queue from 'promise-queue';
import { GlobalConfig } from "../config/globalconfig";
import { Logger } from "../logger";
import { GlobalNetworksService, LRW_TEMPLATE } from "../services/global.networks.service";
import { lazyElastosDIDSDKImport, lazyElastosHiveSDKImport } from "./import.helper";
import { logAndReject } from "./promises";

//declare let didManager: DIDPlugin.DIDManager;
//declare let hiveManager: HivePlugin.HiveManager;

/**
 * We rewrite our own hive authentication helper instead of using the one provided by the connectivity SDK,
 * in order to silently generate app id credentials for internal hive requests, as the normal behaviour is
 * to show confirmation screens to user.
 */
export class InternalHiveAuthHelper {
  private initialized = false;

  private didAccess: DID.DIDAccess;
  private contextCreationQueue: Queue; // Semaphore queue to create only one context at a time. Hive SDK used to have some troubles with concurrent authentications
  private contextsCache: { [did: string]: AppContext } = {};

  constructor() {
    this.didAccess = new DID.DIDAccess();
    this.contextCreationQueue = new Queue(1);
  }

  /**
   * Lazy init to remove strong dependencies on the main app bundle.
   */
  private async lazyInit() {
    if (this.initialized)
      return;

    const { Logger: HiveLogger } = await lazyElastosHiveSDKImport();

    // Hive SDK is too verbose by default, make it silent
    HiveLogger.setDefaultLevel(HiveLogger.WARNING);

    this.initialized = true;
  }

  public async getAppContextProvider(appDID: string, targetDid: string, onAuthError?: (e: Error) => void): Promise<AppContextProvider> {
    let appInstanceDIDInfo = await this.didAccess.getOrCreateAppInstanceDID(appDID);
    let appDidString = appInstanceDIDInfo.did.toString();

    Logger.log("hiveauthhelper", "Getting app instance DID document", appDID, targetDid);
    let didDocument = await appInstanceDIDInfo.didStore.loadDid(appDidString);
    Logger.log("hiveauthhelper", "Got app instance DID document. Now creating the Hive client", didDocument.toJSON());

    return {
      getLocalDataDir: (): string => {
        return "/";
      },
      getAppInstanceDocument: (): DIDDocument => {
        return didDocument;
      },
      getAuthorization: (authenticationChallengeJWtCode: string): Promise<string> => {
        /**
         * Called by the Hive plugin when a hive backend needs to authenticate the user and app.
         * The returned data must be a verifiable presentation, signed by the app instance DID, and
         * including a appid certification credential provided by the identity application.
         */
        Logger.log("hiveauthhelper", "Hive client authentication challenge callback is being called with token:", authenticationChallengeJWtCode, "for DID:", targetDid);
        try {
          return this.handleVaultAuthenticationChallenge(appDID, authenticationChallengeJWtCode);
        }
        catch (e) {
          Logger.error("hiveauthhelper", "Exception in authentication handler:", e);
          if (onAuthError)
            onAuthError(e);
          return null;
        }
      }
    }
  }

  /**
   * Get a hive app context for ESSENTIALS as app did (important - not feeds)
   */
  public async getAppContext(targetDid: string, onAuthError?: (e: Error) => void): Promise<AppContext> {
    await this.lazyInit();

    return this.contextCreationQueue.add(async () => {
      let appInstanceDIDInfo = await this.didAccess.getOrCreateAppInstanceDID();
      let appDidString = appInstanceDIDInfo.did.toString();
      let cacheKey = targetDid + appDidString;

      // Returned existing context for this DID if any.
      if (cacheKey in this.contextsCache)
        return this.contextsCache[cacheKey];

      let appContextProvider: AppContextProvider = await this.getAppContextProvider(GlobalConfig.ESSENTIALS_APP_DID, targetDid, onAuthError);

      const { AppContext } = await lazyElastosHiveSDKImport();
      let appContext = await AppContext.build(appContextProvider, targetDid, appDidString);
      this.contextsCache[cacheKey] = appContext;

      return appContext;
    });
  }

  public async getSubscriptionService(targetDid: string, providerAddress: string = null, onAuthError?: (e: Error) => void): Promise<VaultSubscription> {
    let appContext = await this.getAppContext(targetDid, onAuthError);
    const { VaultSubscription } = await lazyElastosHiveSDKImport();
    return new VaultSubscription(appContext, providerAddress);
  }

  /**
   * Returns a hive vault services object ready to handle the authentication flow. This method can be used by dApps
   * for convenience, or can be skipped and customized in-app if the app wants a different behaviour.
   */
  public getVaultServices(targetDid: string, onAuthError?: (e: Error) => void): Promise<Vault> {
    //this.clearVaultAccessToken(); // TMP DEBUG HELPER

    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve, reject) => {
      // Initiate or retrieve an application instance DID. This DID is used to sign authentication content
      // for hive. Hive uses the given app instance DID document to verify JWTs received later, using an unpublished
      // app instance DID.
      try {
        let appContext = await this.getAppContext(targetDid, onAuthError);

        const { AppContext, Vault } = await lazyElastosHiveSDKImport();
        let providerAddress = await AppContext.getProviderAddressByUserDid(targetDid);
        let vaultServices = new Vault(appContext, providerAddress);

        Logger.log("hiveauthhelper", "Hive vault services initialization completed");
        resolve(vaultServices);
      }
      catch (err) {
        // No vaults service on LRW.
        if (GlobalNetworksService.instance.getActiveNetworkTemplate() !== LRW_TEMPLATE) {
            Logger.error("hiveauthhelper", err);
        }
        reject(err);
      }
    });
  }

  /**
   * Debug method to delete user's hive vault authentication in order to force a new authentication flow.
   */
  /* private clearVaultAccessToken() {
    GlobalHiveService.instance.vaultStatus.subscribe(s => {
      if (s) {
        console.log("DELETING HIVE VAULT ACCESS TOKEN");
        void GlobalHiveService.instance.getActiveVault().revokeAccessToken();
      }
    });
  } */

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
  public handleVaultAuthenticationChallenge(appDID: string, jwtToken: string): Promise<string> {
    return this.generateAuthPresentationJWT(appDID, jwtToken);
  }

  /**
   * Generates a JWT token needed by hive vaults to authenticate users and app.
   * That JWT contains a verifiable presentation that contains server challenge info, and the app id credential
   * issued by the end user earlier.
   */
  private generateAuthPresentationJWT(appDID: string, authChallengeJwttoken: string): Promise<string> {
    Logger.log("hiveauthhelper", "Starting process to generate hive auth presentation JWT");

    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve, reject) => {
      // Parse, but verify on chain that this JWT is valid first
      try {
        const { JWTParserBuilder } = await lazyElastosDIDSDKImport();
        let parseResult = await (new JWTParserBuilder()).setAllowedClockSkewSeconds(300).build().parse(authChallengeJwttoken);
        let body = parseResult.getBody();

        // The request JWT must contain iss and nonce fields
        if (!body.get("iss") || !body.get("nonce")) {
          reject("The received authentication JWT token does not contain iss or nonce");
          return;
        }

        // Generate a hive authentication presentation and put the credential + back-end info such as nonce inside
        let nonce = body.get("nonce") as string;
        let realm = body.get("iss") as string;

        Logger.log("hiveauthhelper", "Getting app instance DID");
        let appInstanceDIDResult = await this.didAccess.getOrCreateAppInstanceDID(appDID);
        let appInstanceDID = appInstanceDIDResult.did;

        let appInstanceDIDInfo = await this.didAccess.getExistingAppInstanceDIDInfo(appDID);

        Logger.log("hiveauthhelper", "Getting app identity credential");
        let appIdCredential = await this.didAccess.getExistingAppIdentityCredential(appDID);

        if (!appIdCredential) {
          Logger.log("hiveauthhelper", "Empty app id credential. Trying to generate a new one");

          appIdCredential = await this.generateAppIdCredential(appDID);
          if (!appIdCredential) {
            Logger.warn("hiveauthhelper", "Failed to generate a new App ID credential");
            resolve(null);
            return;
          }
        }

        // Create the presentation that includes hive back end challenge (nonce) and the app id credential.
        Logger.log("hiveauthhelper", "Creating DID presentation response for Hive authentication challenge");
        const { VerifiablePresentation } = await lazyElastosDIDSDKImport();
        let builder = await VerifiablePresentation.createFor(appInstanceDID.toString(), null, appInstanceDIDResult.didStore);
        let presentation = await builder.credentials(appIdCredential).realm(realm).nonce(nonce).seal(appInstanceDIDInfo.storePassword);

        if (presentation) {
          // Generate the hive back end authentication JWT
          Logger.log("hiveauthhelper", "Opening DID store to create a JWT for presentation:", presentation.toJSON());
          let didStore = await DID.DIDHelper.openDidStore(appInstanceDIDInfo.storeId);

          Logger.log("hiveauthhelper", "Loading DID document");
          try {
            let didDocument: DIDDocument = await didStore.loadDid(appInstanceDIDInfo.didString);
            let validityDays = 2;
            Logger.log("hiveauthhelper", "App instance DID document", didDocument.toJSON());
            Logger.log("hiveauthhelper", "Creating JWT");
            try {
              let jwtToken = await didDocument.jwtBuilder().addClaims({
                presentation: presentation.toJSON()
              }).setExpiration(moment().add(validityDays, "days").unix()).sign(appInstanceDIDInfo.storePassword);
              Logger.log("hiveauthhelper", "JWT created for presentation:", jwtToken);
              resolve(jwtToken);
            }
            catch (err) {
              logAndReject("hiveauthhelper", reject, err);
            }
          }
          catch (err) {
            logAndReject("hiveauthhelper", reject, err);
          }
        }
        else {
          logAndReject("hiveauthhelper", reject, "No presentation generated");
        }
      }
      catch (e) {
        // Verification error?
        // Could not verify the received JWT as valid - reject the authentication request by returning a null token
        logAndReject("hiveauthhelper", reject, "The received authentication JWT token signature cannot be verified or failed to verify: " + new String(e) + ". Is the hive back-end DID published? Are you on the right network?");
        return;
      }
    });
  }

  private generateAppIdCredential(appDID: string): Promise<VerifiableCredential> {
    // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
    return new Promise(async (resolve) => {
      let storedAppInstanceDID = await this.didAccess.getOrCreateAppInstanceDID(appDID);
      if (!storedAppInstanceDID) {
        resolve(null);
        return;
      }

      let appInstanceDID = storedAppInstanceDID.did;

      // No such credential, so we have to create one. Send an intent to get that from the did app
      Logger.log("hiveauthhelper", "Starting to generate a new App ID credential.");

      // Directly generate the credential without user confirmation.

      // Convert cordova-made credential generated by essentials, into a JS credential, as we have to
      // work with the 2 worlds so far.
      let AppIDService = (await import("../identity/services/appid.service")).AppIDService; // Lazy
      try {
          let cordovaCredential = await AppIDService.instance.generateApplicationIDCredential(appInstanceDID.toString(), appDID);
          const { VerifiableCredential } = await lazyElastosDIDSDKImport();
          let credential = VerifiableCredential.parse(await cordovaCredential.toString());

          // Save this issued credential for later use.
          await storedAppInstanceDID.didStore.storeCredential(credential);

          // This generated credential must contain the following properties:
          // TODO: CHECK THAT THE RECEIVED CREDENTIAL CONTENT IS VALID
          // appInstanceDid
          // appDid

          resolve(credential);
      }
      catch (e) {
        // MasterPasswordCancellation
        resolve(null);
      }
    });
  }
}