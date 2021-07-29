import { Component, ViewChild } from '@angular/core';
import { DIDService } from '../../../services/did.service';
import { UXService } from '../../../services/ux.service';
import { PopupProvider } from '../../../services/popup';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { SignIdentityIntent } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { BASE64 } from 'src/app/model/base64';

@Component({
    selector: 'page-signdigest',
    templateUrl: 'signdigest.html',
    styleUrls: ['signdigest.scss']
})
export class SignDigestPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public receivedIntent: SignIdentityIntent = null;
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        private didService: DIDService,
        private popup: PopupProvider,
        private translate: TranslateService,
        private appServices: UXService,
        private authService: AuthService,
        public theme: GlobalThemeService,
        private intentService: IntentReceiverService
    ) {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('identity.sign-data'));
        this.titleBar.setNavigationMode(null);
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.CLOSE });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
            await this.rejectRequest();
        });

        this.receivedIntent = this.intentService.getReceivedIntent();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async acceptRequest() {
        Logger.log('Identity', "Signing user data now");

        // Prompt password if needed
        AuthService.instance.checkPasswordThenExecute(async () => {
            let password = AuthService.instance.getCurrentUserPassword();

            let intentRequestData = this.receivedIntent.params;

            var signature = await this.didService.getActiveDid().getDIDDocument().signDigest(intentRequestData.data, password);
            signature = BASE64.decode(signature);

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


            // Return the signature info as a signed JWT in case runtime needs to send this response through a URL
            // callback. If that's inside Elastos Essentials, the JWT will be parsed and the calling app will receive the
            // signature payload.
            let jwtToken = await this.didService.getActiveDid().getDIDDocument().createJWT(payload,
                1, this.authService.getCurrentUserPassword());

            // Send the intent response as everything is completed
            Logger.log('Identity', "Data signed, sending intent response");
            try {
                await this.appServices.sendIntentResponse("signdigest", { signature: signature, jwt: jwtToken }, this.receivedIntent.intentId);
            }
            catch (e) {
                await this.popup.ionicAlert("Response error", "Sorry, we were unable to return the signed information to the calling app. " + e);
            }
        }, () => {
            // Cancelled
        });
    }

    async rejectRequest() {
        await this.appServices.sendIntentResponse("signdigest", {}, this.receivedIntent.intentId);
    }
}
