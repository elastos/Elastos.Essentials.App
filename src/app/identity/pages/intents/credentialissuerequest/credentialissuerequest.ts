import { Component, NgZone, ViewChild } from '@angular/core';
import { DIDService } from '../../../services/did.service';
import { UXService } from '../../../services/ux.service';
import { PopupProvider } from '../../../services/popup';
import { AuthService } from '../../../services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { DIDURL } from '../../../model/didurl.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { CredIssueIdentityIntent } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

// TODO: Verify and show clear errors in case data is missing in credentials (expiration date, issuer, etc).
// TODO: Resolve issuer's DID and try to display more user friendly information about the issuer
// TODO: check if the credentials have not already been imported to avoid duplicates? (or update them if something has changed)


// Displayable version of a verifiable credential subject entry (a credential can contain several information
// in its subject).
type IssuedCredentialItem = {
  name: string,
  value: any,
  showData: boolean,
}

// Displayable version of a verifiable credential. Can contain one or more IssuedCredentialItem that
// are displayable version of verifiable credential subject entries.
type IssuedCredential = {
  identifier: string,
  receiver: string,
  expirationDate: Date,
  values: IssuedCredentialItem[],
}

/*
Request example:
{
  appPackageId: "org.mycompany.myapp",
  identifier: "customcredentialkey", // unique identifier for this credential
  types: [], // Additional credential types (strings) such as BasicProfileCredential.
  subjectdid: "did:elastos:abc", // DID targeted by the created credential. Only that did will be able to import the credential.
  properties: [{
      someCustomData: "Here is a test data that will appear in someone else's DID document after he imports it."
  }],
  expirationDate: new Date(2024,12,12)
}
*/
@Component({
  selector: 'page-credentialissuerequest',
  templateUrl: 'credentialissuerequest.html',
  styleUrls: ['credentialissuerequest.scss']
})
export class CredentialIssueRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public receivedIntent: CredIssueIdentityIntent = null;
  public displayableCredential: IssuedCredential = null; // Displayable reworked material
  public preliminaryChecksCompleted: boolean = false;

  public showIdentifier: boolean = false;
  public showReceiver: boolean = false;
  public showExpiration: boolean = false;
  public showValues: boolean = false;

  constructor(
    private zone: NgZone,
    public didService: DIDService,
    private popup: PopupProvider,
    private uxService: UXService,
    private authService: AuthService,
    private appServices: UXService,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private intentService: IntentReceiverService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('identity.credential-issue'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);

    this.zone.run(async () => {
      this.receivedIntent = this.intentService.getReceivedIntent();
      this.organizeDisplayableInformation();
      this.runPreliminaryChecks();

      Logger.log('Identity', "Displayable credential:", this.displayableCredential)
    });
  }

  /**
   * Check a few things after entering the screen. Mostly, issued credential content quality.
   */
  runPreliminaryChecks() {
    // Nothing yet

    this.preliminaryChecksCompleted = true; // Checks completed and everything is all right.
  }

  /**
   * From the raw data provided by the caller, we create our internal model ready for UI.
   */
  organizeDisplayableInformation() {
    // Generate a displayable version of each entry found in the credential subject
    let displayableEntries: IssuedCredentialItem[] = [];
    for (let propertyEntryKey of Object.keys(this.receivedIntent.params.properties)) {
      let propertyEntryValue = this.receivedIntent.params.properties[propertyEntryKey];

      let displayableEntry: IssuedCredentialItem = {
        name: propertyEntryKey,
        value: propertyEntryValue,
        showData: false
      }

      displayableEntries.push(displayableEntry);
    }

    this.displayableCredential = {
      // The received identitier should NOT start with #, but DID SDK credentials start with #.
      identifier: new DIDURL("#"+this.receivedIntent.params.identifier).getFragment(),
      receiver: this.receivedIntent.params.subjectdid,
      expirationDate: null,
      values: displayableEntries,
    };

    if (this.receivedIntent.params.expirationDate) // Should be a ISO date string
      this.displayableCredential.expirationDate = new Date(this.receivedIntent.params.expirationDate);
    else {
      let now = new Date().getTime();
      let fiveDaysAsMs = 5*24*60*60*1000;
      this.displayableCredential.expirationDate = new Date(now+fiveDaysAsMs);
    }
  }

  getDisplayableEntryValue(value: any) {
    if (value instanceof Object) {
      return JSON.stringify(value);
    }

    return value;
  }

  async acceptRequest() {
    // Save the credentials to user's DID.
    // NOTE: For now we save all credentials, we can't select them individually.
    AuthService.instance.checkPasswordThenExecute(async ()=>{
      Logger.log('Identity', "CredIssueRequest - issuing credential");

      let validityDays = (this.displayableCredential.expirationDate.getTime() - Date.now()) / 1000 / 60 / 60 / 24;

      this.didService.getActiveDid().pluginDid.issueCredential(
        this.displayableCredential.receiver,
        "#"+this.displayableCredential.identifier,
        this.receivedIntent.params.types,
        validityDays,
        this.receivedIntent.params.properties,
        this.authService.getCurrentUserPassword(),
        (issuedCredential)=>{
          this.popup.ionicAlert(this.translate.instant('identity.credential-issued'), this.translate.instant('identity.credential-issued-success'),this.translate.instant('common.done')).then(async ()=>{
            Logger.log('Identity', "Sending credissue intent response for intent id "+this.receivedIntent.intentId)
            let credentialAsString = await issuedCredential.toString();
            await this.appServices.sendIntentResponse("credissue", {
              credential: credentialAsString
            }, this.receivedIntent.intentId);
          })
        }, async (err)=>{
          await this.popup.ionicAlert(this.translate.instant('common.error'), this.translate.instant('identity.credential-issued-error')+JSON.stringify(err), this.translate.instant('common.close'));
          this.rejectRequest();
        });
    }, ()=>{
      // Cancelled
    });
  }

  async rejectRequest() {
    await this.appServices.sendIntentResponse("credissue", {}, this.receivedIntent.intentId);
  }
}
