import { Component, ViewChild } from '@angular/core';

import { Config } from '../../services/config';
import { DIDService } from '../../services/did.service';
import { UXService } from '../../services/ux.service';
import { PopupProvider } from '../../services/popup';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';

type SignIntentParams = {
  data: string,                 // Raw data to sign
  signatureFieldName?: string,  // Name of the variable that holds the signed data, in the response.
  jwtExtra?: any                 // Custom app fields that will be passed directly to the JWT payload.
}

/*
Request example:
{
  appPackageId: "org.mycompany.myapp",
  intentId: -1,
  allParams: {
    data: "please-sign-this"
  }
}
*/
@Component({
  selector: 'page-signrequest',
  templateUrl: 'signrequest.html',
  styleUrls: ['signrequest.scss']
})
export class SignRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  requestDapp: {
    intentId: number,
    appPackageId: string,
    allParams: SignIntentParams,
    originalJwtRequest?: string
  } = null;

  constructor(
    private didService: DIDService,
    private popup: PopupProvider,
    private uxService:UXService,
    private translate: TranslateService,
    private appServices: UXService,
    private authService: AuthService,
    public theme: GlobalThemeService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('sign-data'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    this.uxService.makeAppVisible();

    this.requestDapp = Config.requestDapp;
    console.log('requestDapp', this.requestDapp);
  }

  async acceptRequest() {
    console.log("Signing user data now");

    // Prompt password if needed
    AuthService.instance.checkPasswordThenExecute(async ()=>{
      let password = AuthService.instance.getCurrentUserPassword();

      let intentRequestData = this.requestDapp.allParams as SignIntentParams;

      let signature = await this.didService.getActiveDid().signData(this.requestDapp.allParams.data, password);
      let publicKey = await this.didService.getActiveDid().getDIDDocument().getDefaultPublicKey();

      let payload = {};

      // First, fill the payload with all JWT extra passed by the calling app, if any
      if (intentRequestData.jwtExtra)
        Object.assign(payload, intentRequestData.jwtExtra);

      // Then, store the signed data using either the app signatureFieldName, or as default "signature" field.
      if (intentRequestData.signatureFieldName)
        payload[intentRequestData.signatureFieldName] = signature;
      else
        payload["signature"] = signature; // Default field name

      // Add the public key, for convenience.
      payload["publickey"] = publicKey;

      // Return the original JWT token in case this intent was called by an external url (elastos scheme definition)
      // TODO: Currently adding elastos://sign/ in front of the JWT because of CR website requirement. But we should cleanup this and pass only the JWT itself
      if (this.requestDapp.originalJwtRequest) {
        payload["req"] = "elastos://didsign/"+this.requestDapp.originalJwtRequest;
      }

      // Return the signature info as a signed JWT in case runtime needs to send this response through a URL
      // callback. If that's inside elastOS, the JWT will be parsed and the calling app will receive the
      // signature payload.
      let jwtToken = await this.didService.getActiveDid().getDIDDocument().createJWT(payload,
      1, this.authService.getCurrentUserPassword());

      // Send the intent response as everything is completed
      console.log("Data signed, sending intent response");
      try {
        await this.appServices.sendIntentResponse("didsign", {jwt: jwtToken}, this.requestDapp.intentId);
      }
      catch (e) {
        await this.popup.ionicAlert("Response error", "Sorry, we were unable to return the signed information to the calling app. "+e);
      }
    }, ()=>{
      // Cancelled
    });
  }

  async rejectRequest() {
    await this.appServices.sendIntentResponse("didsign", {}, this.requestDapp.intentId);
  }
}
