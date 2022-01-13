import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IdentityIntent, IdentityIntentParams } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { BASE64 } from 'src/app/model/base64';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AuthService } from '../../../services/auth.service';
import { DIDService } from '../../../services/did.service';
import { PopupProvider } from '../../../services/popup';
import { UXService } from '../../../services/ux.service';


type SignDigestIntentParams = IdentityIntentParams & {
    data: string,                 // Raw data to sign
    payload?: any,                 // Custom app payload will be passed directly to the JWT payload.
    jwtExtra?: any,                 // For scan mode, return to websit
    signatureFieldName?: string,
}

type SignDigestIntent = IdentityIntent<SignDigestIntentParams> & {
}
@Component({
    selector: 'page-signdigest',
    templateUrl: 'signdigest.html',
    styleUrls: ['signdigest.scss']
})
export class SignDigestPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public receivedIntent: SignDigestIntent = null;
    private alreadySentIntentResponce = false;
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
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: null, iconPath: BuiltInIcon.CLOSE });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            void this.rejectRequest();
        });

        this.receivedIntent = this.intentService.getReceivedIntent();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    ngOnDestroy() {
        if (!this.alreadySentIntentResponce) {
            void this.rejectRequest(false);
        }
    }

    acceptRequest() {
        Logger.log('Identity', "Signing user data now");

        // Prompt password if needed
        void AuthService.instance.checkPasswordThenExecute(async () => {
            let password = AuthService.instance.getCurrentUserPassword();

            let intentRequestData = this.receivedIntent.params;

            var signature = await this.didService.getActiveDid().getLocalDIDDocument().signDigest(intentRequestData.data, password);
            signature = BASE64.decode(signature);

            // let publicKey = await this.didService.getActiveDid().getLocalDIDDocument().getDefaultPublicKey();

            //Create a jwtToken by payload
            var jwtToken: string;
            var payload: any = {};
            if (intentRequestData.jwtExtra instanceof Object) {
                payload = intentRequestData.jwtExtra
            }
            else if (intentRequestData.payload instanceof Object) {
                payload = intentRequestData.payload;
            }

            // Then, store the signed data using either the app signatureFieldName, or as default "signature" field.
            if (intentRequestData.signatureFieldName)
                payload[intentRequestData.signatureFieldName] = signature;
            else
                payload.signature = signature; // Default field name

            jwtToken = await this.didService.getActiveDid().getLocalDIDDocument().createJWT(payload,
                1, password);

            // Send the intent response as everything is completed
            try {
                await this.sendIntentResponse({ signature: signature, jwt: jwtToken }, this.receivedIntent.intentId);
            }
            catch (e) {
                await this.popup.ionicAlert("Response error", "Sorry, we were unable to return the signed information to the calling app. " + e);
            }
        }, () => {
            // Cancelled
        });
    }

    async rejectRequest(navigateBack = true) {
        await this.sendIntentResponse({}, this.receivedIntent.intentId, navigateBack);
    }

    private async sendIntentResponse(result, intentId, navigateBack = true) {
        this.alreadySentIntentResponce = true;
        await this.appServices.sendIntentResponse(result, intentId, navigateBack);
    }
}
