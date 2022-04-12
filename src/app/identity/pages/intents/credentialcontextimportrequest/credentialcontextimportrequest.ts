import { Component, NgZone, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { CredContextImportIdentityIntent } from 'src/app/identity/model/identity.intents';
import { IntentReceiverService } from 'src/app/identity/services/intentreceiver.service';
import { Logger } from 'src/app/logger';
import { DIDPublicationStatus, GlobalPublicationService } from 'src/app/services/global.publication.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VerifiableCredential } from '../../../model/verifiablecredential.model';
import { AuthService } from '../../../services/auth.service';
import { DIDService } from '../../../services/did.service';
import { PopupProvider } from '../../../services/popup';
import { UXService } from '../../../services/ux.service';

declare let didManager: DIDPlugin.DIDManager;

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
  showData: boolean,
  credential: VerifiableCredential,
}

@Component({
  selector: 'page-credentialcontextimportrequest',
  templateUrl: 'credentialcontextimportrequest.html',
  styleUrls: ['credentialcontextimportrequest.scss']
})
export class CredentialContextImportRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  public receivedIntent: CredContextImportIdentityIntent = null;
  public requestDappIcon: string = null;
  public requestDappName: string = null;
  public requestDappColor = '#565bdb';

  private alreadySentIntentResponce = false;

  public accepting = false;
  public popup: HTMLIonPopoverElement = null;
  public wrongTargetDID = false; // Whether the credential we are trying to import is for us or not.

  displayableCredential: ImportedCredential = null; // Displayable reworked matarial
  preliminaryChecksCompleted = false;

  constructor(
    private zone: NgZone,
    public didService: DIDService,
    private popupProvider: PopupProvider,
    private appServices: UXService,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private intentService: IntentReceiverService,
    private globalPublicationService: GlobalPublicationService
  ) {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Credential context import");
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
      // Close icon
      await this.rejectRequest();
      void this.titleBar.globalNav.exitCurrentContext();
    });

    void this.zone.run(async () => {
      this.receivedIntent = this.intentService.getReceivedIntent();

      await this.runPreliminaryChecks();
      await this.organizeImportedCredential();
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponce) {
      void this.rejectRequest(false);
    }
  }

  /**
   * Check a few things after entering the screen. Mostly, imported credentials content quality.
   */
  async runPreliminaryChecks() {
    // Make sure that we received the credential
    if (!this.receivedIntent.params.credential) {
      await this.popupProvider.ionicAlert("Error", "Sorry, there is actually no credential provided in the given information", "Close");
      return;
    }

    // Check credentials content
    // TODO

    Logger.log('Identity', 'Received credential to be imported:', this.receivedIntent.params.credential);

    // Auto-select the targeted DID. Show an error if user doesn't have a DID targeted by this issuance.
    let targetDIDString = this.receivedIntent.params.credential.credentialSubject.id;
    let activeDIDString = this.didService.getActiveDid().getDIDString();
    if (targetDIDString != activeDIDString) {
      this.wrongTargetDID = true;
      return;
    }

    await this.didService.loadGlobalIdentity();

    this.preliminaryChecksCompleted = true; // Checks completed and everything is all right.
  }

  /**
   * From the raw credential provided by the caller, we create our internal model
   * ready for UI.
   */
  organizeImportedCredential() {
    let credential = this.receivedIntent.params.credential;
    let importedCredential: DIDPlugin.VerifiableCredential = didManager.VerifiableCredentialBuilder.fromJson(JSON.stringify(credential));
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

    this.displayableCredential = {
      name: this.didService.getUserFriendlyBasicProfileKeyName(importedCredential.getFragment()),
      values: displayableEntries,
      showData: false,
      credential: new VerifiableCredential(importedCredential),
    };
  }

  getDisplayableIssuer() {
    return this.receivedIntent.params.credential.issuer;
  }

  getDisplayableEntryValue(value: any) {
    if (value instanceof Object) {
      return JSON.stringify(value);
    }

    return value;
  }

  acceptRequest() {
    if (this.accepting) // Prevent double action
      return;

    this.accepting = true;

    // Save the credential to user's DID.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    AuthService.instance.checkPasswordThenExecute(async () => {
      Logger.log('Identity', "CredContextImportRequest - accepting credential context import request: ", this.displayableCredential.credential, this.receivedIntent.params.serviceName);

      let password = AuthService.instance.getCurrentUserPassword();

      // Save the credential locally
      Logger.log('Identity', "CredContextImportRequest - storing the credential locally");
      await this.didService.getActiveDid().upsertRawCredential(this.displayableCredential.credential, true);

      // Also add the credential to the DID document
      Logger.log('Identity', "CredContextImportRequest - storing the credential to the DID document");
      await this.didService.getActiveDid().getLocalDIDDocument().updateOrAddCredential(this.displayableCredential.credential.pluginVerifiableCredential, password);

      let importedCredentialId = this.displayableCredential.credential.pluginVerifiableCredential.getId();

      // Add or update the service entry with a reference to the new credential
      // Expected service format:
      // "service": [
      //   {
      //     "id": "did:elastos:insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq#DiplomaCredential",
      //     "type": "CredentialContext",
      //     "serviceEndpoint": "did:elastos:insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq#1234567890"
      //   }
      // ],
      let shortServiceName = this.receivedIntent.params.serviceName; // Eg: "DiplomaCredential"
      let longServiceName = `${this.didService.getActiveDid().getDIDString()}#${shortServiceName}`;
      let service: DIDPlugin.Service = await this.didService.getActiveDid().getLocalDIDDocument().getService(longServiceName);
      if (service) {
        Logger.log("identity", `The ${longServiceName} service already exists, deleting it to update it`);
        await this.didService.getActiveDid().getLocalDIDDocument().removeService(longServiceName, password);
      }

      service = didManager.ServiceBuilder.createService(longServiceName, 'CredentialContext', importedCredentialId);
      await this.didService.getActiveDid().getLocalDIDDocument().addService(service, password);

      void this.publishAndFinalize(importedCredentialId);
    }, () => {
      // Cancelled
      this.accepting = false;
    });
  }

  private async publishAndFinalize(importedCredentialId: string) {
    let publicationStatus = this.globalPublicationService.publicationStatus.subscribe((status) => {
      Logger.log("identity", "(import credential context) DID publication status update for DID", status);
      if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
        Logger.log("identity", "(import credential context) DID publication complete");
        publicationStatus.unsubscribe();
        this.finalizeRequest(importedCredentialId);
      }
      else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
        Logger.warn("identity", "(import credential context) DID publication failure");
        publicationStatus.unsubscribe();
        // Publication failed but still, we return the imported credential list because
        // they were at least imported locally, we are not going to revert this.
        this.finalizeRequest(importedCredentialId);
      }
    });

    await this.didService.getActiveDid().getLocalDIDDocument().publish(AuthService.instance.getCurrentUserPassword(), this.receivedIntent.intentId);
  }

  private finalizeRequest(importedCredentialId: string) {
    void this.popupProvider.ionicAlert(this.translate.instant('identity.credimport-success-title'), this.translate.instant('identity.credimport-success'), this.translate.instant('identity.credimport-success-done')).then(async () => {
      Logger.log('Identity', "Sending credimport intent response for intent id " + this.receivedIntent.intentId)
      await this.sendIntentResponse({
        importedcredential: importedCredentialId
      }, this.receivedIntent.intentId);
    })
  }

  async rejectRequest(navigateBack = true) {
    await this.sendIntentResponse({}, this.receivedIntent.intentId, navigateBack);
  }

  private async sendIntentResponse(result, intentId, navigateBack = true) {
    this.intentService.clearOnGoingIntentId();

    this.alreadySentIntentResponce = true;
    await this.appServices.sendIntentResponse(result, intentId, navigateBack);
  }

  getDappIcon() {
    return 'assets/identity/icon/elastos-icon.svg';
  }
}
