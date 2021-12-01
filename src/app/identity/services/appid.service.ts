import { Injectable } from "@angular/core";
import { Logger } from "src/app/logger";
import { AppIdCredIssueIdentityIntent } from "../model/identity.intents";
import { AuthService } from "./auth.service";
import { DIDService } from "./did.service";
import { UXService } from "./ux.service";

/**
 * Service responsible for generating "application identity credentials". Those credentials
 * are for now mostly used by the hive authenticaiton layer in order to delete some power
 * to a calling app, prooving that it is who it pretends to be, therefore being able to do further
 * operations without always requiring the user to sign with his DID, as this would require opening
 * this DID app often.
 */
@Injectable({
  providedIn: "root",
})
export class AppIDService {
  public static instance: AppIDService = null;

  //private intentId: number = null;
  //private appPackageId: string = null;
  //private appInstanceDID: string = null;
  //private externallyProvidedAppDID: string = null;

  constructor(
    private authService: AuthService,
    private uxService: UXService,
    private didService: DIDService) {
    AppIDService.instance = this;
  }

  //public prepareNextRequest(intentId: number, appPackageId: string, appInstanceDID: string, externallyProvidedAppDID: string) {
  /* this.intentId = intentId;
  this.appPackageId = appPackageId;
  this.appInstanceDID = appInstanceDID;
  this.externallyProvidedAppDID = externallyProvidedAppDID; */
  //}

  /* public async applicationIDCredentialCanBeIssuedWithoutUI(intentParams: any): Promise<boolean> {
    if (!await this.uxService.isIntentResponseGoingOutsideEssentials(intentParams)) {
      // Intent is for Essentials itself. We can issue silently.
      return true;
    }
    else {
      // From native apps, force showing a screen
      Logger.log('identity', "Can't issue app id credential silently: called from a third party app");
      return false;
    }
  } */

  /* private async getActualAppDID(intentParams: any): Promise<string> {
    if (!await this.uxService.isIntentResponseGoingOutsideEssentials(intentParams)) {
      // Intent response is for Essentials itself so we use Essentials app DID
      return GlobalConfig.ESSENTIALS_APP_DID;
    }
    else {
      // We don't need to blindly trust if this DID is genuine or not. The trinity runtime will
      // match it with the redirect url that is registered in app did document on chain, when
      // sending the intent response.
      return this.externallyProvidedAppDID;
    }
  } */

  public generateApplicationIDCredential(appInstanceDid: string, appDid: string): Promise<DIDPlugin.VerifiableCredential> {
    let properties = {
      appInstanceDid,
      appDid
    };

    return new Promise((resolve, reject) => {
      void AuthService.instance.checkPasswordThenExecute(async () => {
        Logger.log('identity', "AppIdCredIssueRequest - issuing credential");

        await this.didService.getActiveDid().pluginDid.issueCredential(
          appInstanceDid,
          "#app-id-credential",
          ['AppIdCredential'],
          30, // one month - after that, we'll need to generate this credential again.
          properties,
          this.authService.getCurrentUserPassword(),
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          (issuedCredential) => {
            resolve(issuedCredential);
          }, (err) => {
            Logger.error('identity', "Failed to issue the app id credential...", err);
            reject(err);
          });
      }, () => {
        // Cancelled
        Logger.warn("identity", "AppID credential generation cancelled");
        reject();
      });
    });
  }

  public async generateAndSendApplicationIDCredentialIntentResponse(appIdIssueIntent: AppIdCredIssueIdentityIntent) {
    let appInstanceDid = appIdIssueIntent.params.appinstancedid;
    let appDid = appIdIssueIntent.params.appdid;

    try {
      let issuedCredential = await this.generateApplicationIDCredential(appInstanceDid, appDid);
      Logger.log('identity', "Sending appidcredissue intent response for intent id " + appIdIssueIntent.intentId)
      let credentialAsString = await issuedCredential.toString();

      await this.uxService.sendIntentResponse({
        credential: credentialAsString
      }, appIdIssueIntent.intentId);
    }
    catch (e) {
      void this.rejectExternalRequest(appIdIssueIntent);
    }
  }

  public async rejectExternalRequest(appIdIssueIntent: AppIdCredIssueIdentityIntent) {
    await this.uxService.sendIntentResponse({}, appIdIssueIntent.intentId);
  }
}
