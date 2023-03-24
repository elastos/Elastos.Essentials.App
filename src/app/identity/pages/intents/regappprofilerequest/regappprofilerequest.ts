import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DIDURL } from '../../../model/didurl.model';
import { DIDDocumentPublishEvent } from '../../../model/eventtypes.model';
import { RegAppProfileIdentityIntent } from '../../../model/identity.intents';
import { AuthService } from '../../../services/auth.service';
import { DIDService } from '../../../services/did.service';
import { DIDSyncService } from '../../../services/didsync.service';
import { IntentReceiverService } from '../../../services/intentreceiver.service';
import { ProfileService } from '../../../services/profile.service';
import { UXService } from '../../../services/ux.service';

// TODO: Show credential(s) content that will be created to the user. He needs to make sure for example
// that no shared credential will overwrite existing ones like "name" or "email"...

type RegAppProfileIntentParamLocalizedString = {
  lang: string,
  value: string
}
type RegAppProfileIntentParamActionTitle = string | RegAppProfileIntentParamLocalizedString[];

// eslint-disable-next-line @typescript-eslint/ban-types
type RegAppProfileIntentParamFlatClaim = {}; // "key": "value"

/*
Request example:
{
  appPackageId: "org.mycompany.myapp",
  intentId: -1,
  allParams: {
    identifier: "",
    connectactiontitle: "", // Or [{lang:"", value:""},...]
    customcredentialtypes: [],
    sharedclaims:[
      {name: "Updated Ben"}
    ]
  }
}
*/
@Component({
  selector: 'page-regappprofilerequest',
  templateUrl: 'regappprofilerequest.html',
  styleUrls: ['regappprofilerequest.scss']
})
export class RegisterApplicationProfileRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public receivedIntent: RegAppProfileIdentityIntent = null;

  private alreadySentIntentResponse = false;

  credentials: DIDPlugin.VerifiableCredential[] = [];
  denyReason = '';

  public shouldPublishOnSidechain = true;
  private publishresultSubscription: Subscription = null;

  constructor(
    private didService: DIDService,
    private events: GlobalEvents,
    private translate: TranslateService,
    private appServices: UXService,
    public profileService: ProfileService,
    private didSyncService: DIDSyncService,
    public theme: GlobalThemeService,
    private intentService: IntentReceiverService
  ) {
  }

  ngOnInit() {
    // Listen to publication result event to know when the wallet app returns from the "didtransaction" intent
    // request initiated by publish() on a did document.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.publishresultSubscription = this.events.subscribe("diddocument:publishresultpopupclosed", async (result: DIDDocumentPublishEvent) => {
      Logger.log("identity", "diddocument:publishresultpopupclosed event received in regappprofile request", result);
      if (result.published) {
        await this.sendIntentResponse();
      }
    });
  }

  ngOnDestroy() {
    if (this.publishresultSubscription) {
      this.publishresultSubscription.unsubscribe();
      this.publishresultSubscription = null;
    }
    if (!this.alreadySentIntentResponse) {
      void this.rejectRequest(false);
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('identity.app-profile'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);

    this.receivedIntent = this.intentService.getReceivedIntent();

    // Fix missing or wrong values, just in case
    if (!this.receivedIntent.params.customcredentialtypes)
      this.receivedIntent.params.customcredentialtypes = [];

    if (!this.receivedIntent.params.sharedclaims)
      this.receivedIntent.params.sharedclaims = [];

    Logger.log("identity", "Modified request data:", this.receivedIntent);
  }

  acceptRequest() {
    // Prompt password if needed
    void AuthService.instance.checkPasswordThenExecute(async () => {
      let password = AuthService.instance.getCurrentUserPassword();

      // Create the main application profile credential
      await this.createMainApplicationProfileCredential(password);

      // Create individual credentials for each shared claim
      await this.createIndependantCredentials(password);

      // Publish new credential if permitted
      if (this.shouldPublishOnSidechain) {
        await this.didSyncService.publishActiveDIDDIDDocument(password, this.receivedIntent.intentId);
      } else {
        await this.sendIntentResponse();
      }
    }, () => {
      // Cancelled
    });
  }

  async sendIntentResponse() {
    this.alreadySentIntentResponse = true;
    // Send the intent response as everything is completed
    await this.appServices.sendIntentResponse({}, this.receivedIntent.intentId);
  }

  async createMainApplicationProfileCredential(password: string) {
    Logger.log("identity", "Creating application profile credential");

    // The credential title is the identifier given by the application. Ex: "twitter".
    let credentialTitle = this.receivedIntent.params.identifier;

    // Add the standard "ApplicationProfileCredential" credential type, plus any other type provided by the requester.
    let customCredentialTypes = [
      "ApplicationProfileCredential"
    ];
    this.receivedIntent.params.customcredentialtypes.map((type) => customCredentialTypes.push(type));

    // Map each parameter provided by the app as a custom parameter for the main credential
    let props = {};
    Object.keys(this.receivedIntent.params).map((key) => {
      // Skip non-user keys
      if (key == "identifier" || key == "sharedclaims" || key == "customcredentialtypes" || key == "connectactiontitle")
        return;

      let value = this.receivedIntent.params[key];
      Logger.log("identity", "Including field in app profile credential: key:", key, " value:", value);
      props[key] = value;
    });

    // Append mandatory credential properties
    props["identifier"] = this.receivedIntent.params.identifier;
    props["action"] = this.receivedIntent.params.connectactiontitle;
    props["apppackage"] = this.receivedIntent.params.appPackageId;
    props["apptype"] = "elastosbrowser";

    Logger.log("identity", "Credential properties:", props);

    // Create and append the new ApplicationProfileCredential credential to the local store.
    let credentialId = new DIDURL("#" + credentialTitle);
    let createdCredential = await this.didService.getActiveDid().upsertCredential(credentialId, props, password, true, customCredentialTypes);

    // Add this credential to the DID document.
    await this.didService.getActiveDid().getLocalDIDDocument().updateOrAddCredential(createdCredential, password);

    Logger.warn('identity', "diddoc after main app profile added:", this.didService.getActiveDid().getLocalDIDDocument());
  }

  createIndependantCredentials(password: string) {
    Logger.log("identity", "Creating independant credentials");

    let sharedClaims = this.receivedIntent.params.sharedclaims;
    for (let sharedClaim of sharedClaims) {
      Object.keys(sharedClaim).map(async (key) => {
        let value = sharedClaim[key];

        Logger.log("identity", "Creating independant credential with key " + key + " and value:", value);
        let credentialId = new DIDURL("#" + key);
        let createdCredential: DIDPlugin.VerifiableCredential = await this.didService.getActiveDid().upsertCredential(credentialId, { key: value }, password, true);
        this.credentials.push(createdCredential);
        // Add this credential to the DID document.
        await this.didService.getActiveDid().getLocalDIDDocument().updateOrAddCredential(createdCredential, password);
        Logger.warn('identity', "diddoc after shared claim added:", this.didService.getActiveDid().getLocalDIDDocument());
      });
    }
  }

  async rejectRequest(navigateBack = true) {
    this.alreadySentIntentResponse = true;
    await this.appServices.sendIntentResponse({ status: 'cancelled' }, this.receivedIntent.intentId, navigateBack);
  }
}
