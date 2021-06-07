import { Component, NgZone, ViewChild } from '@angular/core';
import { DIDService } from '../../../services/did.service';
import { UXService } from '../../../services/ux.service';
import { PopupProvider } from '../../../services/popup';
import { AuthService } from '../../../services/auth.service';
import { VerifiableCredential } from '../../../model/verifiablecredential.model';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { CredImportIdentityIntent } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let didManager: DIDPlugin.DIDManager;

// TODO: Verify and show clear errors in case data is missing in credentials (expiration date, issuer, etc).
// TODO: Resolve issuer's DID and try to display more user friendly information about the issuer
// TODO: check if the credentials have not already been imported to avoid duplicates? (or update them if something has changed)

// Displayable version of a verifiable credential subject entry (a credential can contain several information
// in its subject).
type ImportedCredentialItem = {
  name: string,
  value: string,
  showData: boolean
}

// Displayable version of a verifiable credential. Can contain one or more ImportedCredentialItem that
// are displayable version of verifiable credential subject entries.
type ImportedCredential = {
  name: string,
  values: ImportedCredentialItem[],
  credential: VerifiableCredential,
}

/*
Request example:
{
  appPackageId: "org.mycompany.myapp",
  credentials: [{
    "id": "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN#email",
    "type": ["BasicProfileCredential"],
    "issuanceDate": "2020-02-04T19:20:18Z",
    "issuer": "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN",
    "credentialSubject": {
      "id": "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN",
      "email": "verifiedemail@provider.com",
      "name": "MyName"
    },
    "proof": {
        "type": "ECDSAsecp256r1",
        "verificationMethod": "did:elastos:icJ4z2DULrHEzYSvjKNJpKyhqFDxvYV7pN#master-key",
        "signatureValue": "pYw8XNi1..Cky6Ed="
    }
  }]
}
*/
@Component({
  selector: 'page-credentialimportrequest',
  templateUrl: 'credentialimportrequest.html',
  styleUrls: ['credentialimportrequest.scss']
})
export class CredentialImportRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public receivedIntent: CredImportIdentityIntent = null;
  private credentials: VerifiableCredential[] = []; // Raw material
  displayableCredentials: ImportedCredential[] = []; // Displayable reworked matarial
  preliminaryChecksCompleted: boolean = false;

  constructor(
    private zone: NgZone,
    public didService: DIDService,
    private popup: PopupProvider,
    private appServices: UXService,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private intentService: IntentReceiverService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('identity.credential-import'));
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);

    this.zone.run(async () => {
      this.receivedIntent = this.intentService.getReceivedIntent();

      await this.runPreliminaryChecks();
      await this.organizeImportedCredentials();

      Logger.log('Identity', "Displayable credentials:", this.displayableCredentials)
    });
  }

  /**
   * Check a few things after entering the screen. Mostly, imported credentials content quality.
   */
  async runPreliminaryChecks() {
    // Make sure that we received at least one credential in the list
    if (!this.receivedIntent.params.credentials || this.receivedIntent.params.credentials.length == 0) {
      await this.popup.ionicAlert("Error", "Sorry, there is actually no credential provided in the given information", "Close");
      return;
    }

    // Check credentials content
    // TODO

    Logger.log('Identity', 'Received credentials to be imported:', this.receivedIntent.params.credentials);

    // Auto-select the targeted DID. Show an error if user doesn't have a DID targeted by this issuance.
    let targetDIDString = this.receivedIntent.params.credentials[0].credentialSubject.id;
    let activeDIDString = this.didService.getActiveDid().getDIDString();
    if (targetDIDString != activeDIDString) {
      await this.popup.ionicAlert("Error", "Sorry, the credential you are trying to import does not belong to this identity.", "Close");
      return;
    }

    await this.didService.loadGlobalIdentity();

    this.preliminaryChecksCompleted = true; // Checks completed and everything is all right.
  }

  /**
   * From the raw list of credentials provided by the caller, we create our internal model
   * ready for UI.
   * NOTE: We can have several credentials passed at the same time. Each credential can have several entries in its subject.
   */
  async organizeImportedCredentials() {
    this.displayableCredentials = [];
    for (let key of Object.keys(this.receivedIntent.params.credentials)) {
      let importedCredential: DIDPlugin.VerifiableCredential = didManager.VerifiableCredentialBuilder.fromJson(JSON.stringify(this.receivedIntent.params.credentials[key]));
      Logger.log('Identity', "Received imported credential:", importedCredential);

      let credentialSubject = importedCredential.getSubject();

      // Generate a displayable version of each entry found in the credential subject
      let displayableEntries: ImportedCredentialItem[] = [];
      for (let subjectEntryKey of Object.keys(credentialSubject)) {
        let subjectEntryValue = credentialSubject[subjectEntryKey];

        if (subjectEntryKey == "id") // Don't display the special subject id entry
          continue;

        let displayableEntry: ImportedCredentialItem = {
          name: subjectEntryKey,
          value: subjectEntryValue,
          showData: false
        }

        displayableEntries.push(displayableEntry);
      }

      let displayableCredential: ImportedCredential = {
        name: this.didService.getUserFriendlyBasicProfileKeyName(importedCredential.getFragment()),
        values: displayableEntries,
        credential: new VerifiableCredential(importedCredential),
      };

      this.displayableCredentials.push(displayableCredential);
    }
  }

  getDisplayableIssuer() {
    // Assume we have checked that there is at least one credential earlier, and assume the issuer
    // is the same for all credentials.
    return this.receivedIntent.params.credentials[0].issuer;
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
      let importedCredentialsResult: String[] = [];
      for (let displayableCredential of this.displayableCredentials) {
        Logger.log('Identity', "CredImportRequest - storing credential: ", displayableCredential.credential);
        await this.didService.getActiveDid().addRawCredential(displayableCredential.credential);
        // NOTE: Currently, DID SDK's storeCredential() on a DID doesn't require a storepass, which is strange... // this.authService.getCurrentUserPassword());

        importedCredentialsResult.push(displayableCredential.credential.pluginVerifiableCredential.getId())
      }

      this.popup.ionicAlert(this.translate.instant('identity.credimport-success-title'), this.translate.instant('identity.credimport-success'), this.translate.instant('identity.credimport-success-done')).then(async ()=>{
        Logger.log('Identity', "Sending credimport intent response for intent id "+this.receivedIntent.intentId)
        await this.appServices.sendIntentResponse("credimport", {
          importedcredentials: importedCredentialsResult
        }, this.receivedIntent.intentId);
      })
    }, ()=>{
      // Cancelled
    });
  }

  async rejectRequest() {
    await this.appServices.sendIntentResponse("credimport", {}, this.receivedIntent.intentId);
  }
}
