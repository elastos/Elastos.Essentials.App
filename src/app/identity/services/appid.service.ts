import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { GlobalConfig } from "src/app/config/globalconfig";
import { Logger } from "src/app/logger";
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
  private intentId: number = null;
  private appPackageId: string = null;
  private appInstanceDID: string = null;
  private externallyProvidedAppDID: string = null;

  constructor(
    private authService: AuthService,
    private uxService: UXService,
    private didService: DIDService) {
  }

  public prepareNextRequest(intentId: number, appPackageId: string, appInstanceDID: string, externallyProvidedAppDID: string) {
    this.intentId = intentId;
    this.appPackageId = appPackageId;
    this.appInstanceDID = appInstanceDID;
    this.externallyProvidedAppDID = externallyProvidedAppDID;
  }

  public async applicationIDCredentialCanBeIssuedWithoutUI(intentParams: any): Promise<boolean> {
    if (!await this.uxService.isIntentResponseGoingOutsideEssentials(intentParams)) {
      // Intent is for Essentials itself. We can issue silently.
      return true;
    }
    else {
      // From native apps, force showing a screen
      Logger.log('identity', "Can't issue app id credential silently: called from a third party app");
      return false;
    }
  }

  private async getActualAppDID(intentParams: any): Promise<string> {
    if (!await this.uxService.isIntentResponseGoingOutsideEssentials(intentParams)) {
      // Intent response is for Essentials itself so we use Essentials app DID
      return GlobalConfig.ESSENTIALS_APP_DID;
    }
    else {
      // We don't need to blindly trust if this DID is genuine or not. The trinity runtime wille
      // match it with the redirect url that is registered in app did document on chain, when
      // sending the intent response.
      return this.externallyProvidedAppDID;
    }
  }

  public async generateAndSendApplicationIDCredentialIntentResponse(intentParams: any) {
    let properties = {
      appInstanceDid: this.appInstanceDID,
      appDid: await this.getActualAppDID(intentParams),
    };

    await AuthService.instance.checkPasswordThenExecute(async () => {
      Logger.log('identity', "AppIdCredIssueRequest - issuing credential");

      await this.didService.getActiveDid().pluginDid.issueCredential(
        this.appInstanceDID,
        "#app-id-credential",
        ['AppIdCredential'],
        30, // one month - after that, we'll need to generate this credential again.
        properties,
        this.authService.getCurrentUserPassword(),
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async (issuedCredential) => {
          Logger.log('identity', "Sending appidcredissue intent response for intent id " + this.intentId)
          let credentialAsString = await issuedCredential.toString();

          // If we are doing a silent intent, we don't navigate back because we didn't navigate forward.
          let navigateBack = await this.uxService.isIntentResponseGoingOutsideEssentials(intentParams);
          Logger.log('identity', "Navigate back? ", navigateBack);

          await this.uxService.sendIntentResponse("appidcredissue", {
            credential: credentialAsString
          }, this.intentId, navigateBack);
        }, (err) => {
          Logger.error('identity', "Failed to issue the app id credential...", err);
          void this.rejectExternalRequest();
        });
    }, () => {
      // Cancelled
      Logger.warn("identity", "AppID credential generation cancelled");
      void this.rejectExternalRequest();
    });
  }

  public async rejectExternalRequest() {
    await this.uxService.sendIntentResponse("appidcredissue", {}, this.intentId);
  }
}
