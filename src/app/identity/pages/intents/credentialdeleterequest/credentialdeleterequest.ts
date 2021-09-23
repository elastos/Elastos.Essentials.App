import { Component, NgZone, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { DIDURL } from 'src/app/identity/model/didurl.model';
import { CredDeleteIdentityIntent } from 'src/app/identity/model/identity.intents';
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
  credentialids: ["#email", "did:xxx:yyy#id"]
}
*/
@Component({
  selector: 'page-credentialdeleterequest',
  templateUrl: 'credentialdeleterequest.html',
  styleUrls: ['credentialdeleterequest.scss']
})
export class CredentialDeleteRequestPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public receivedIntent: CredDeleteIdentityIntent = null;
  public requestDappIcon: string = null;

  public accepting = false;
  public popup: HTMLIonPopoverElement = null;

  private credentials: VerifiableCredential[] = []; // Raw material
  displayableCredentials: ImportedCredential[] = []; // Displayable reworked matarial
  preliminaryChecksCompleted = false;
  public forceToPublishCredentials = false; // Whether the did document should be published after deletion.
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

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
    this.titleBar.setTitle(this.translate.instant('identity.credential-delete'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.rejectRequest();
    });

    void this.zone.run(async () => {
      this.receivedIntent = this.intentService.getReceivedIntent();

      await this.runPreliminaryChecks();
      await this.organizeCredentialsToDelete();

      Logger.log('Identity', "Displayable credentials:", this.displayableCredentials)
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  /**
   * Check a few things after entering the screen. Mostly, deleted credentials content quality.
   */
  async runPreliminaryChecks() {
    // Make sure that we received at least one credential in the list
    if (!this.receivedIntent.params.credentialsids || this.receivedIntent.params.credentialsids.length == 0) {
      void this.popupProvider.ionicAlert("Error", "No credential ID was provided. At least one ID must be passed for deletion.", "Close");
      await this.failingRequest();
      return;
    }

    Logger.log('Identity', 'Received credentials to be deleted:', this.receivedIntent.params.credentialsids);

    await this.didService.loadGlobalIdentity();

    Logger.log('Identity', "Looking for those credentials in user's profile");

    // Make a list of the credentials that can actually find in the DID
    this.credentials = [];
    for (let credentialId of this.receivedIntent.params.credentialsids) {
      let credential = this.didService.getActiveDid().getCredentialById(new DIDURL(credentialId));
      if (credential)
        this.credentials.push(credential);
    }

    // Make sure that we could find at least one credential to delete
    if (this.credentials.length == 0) {
      void this.popupProvider.ionicAlert("Error", "Credential IDs given for deletion are not part of the currently active user's profile", "Close");
      await this.failingRequest();
      return;
    }

    if ("forceToPublishCredentials" in this.receivedIntent.params) {
      this.forceToPublishCredentials = true;
    }

    this.preliminaryChecksCompleted = true; // Checks completed and everything is all right.
  }

  /**
   * From the raw list of credentials provided by the caller, we create our internal model
   * ready for UI.
   * NOTE: We can have several credentials passed at the same time. Each credential can have several entries in its subject.
   */
  organizeCredentialsToDelete() {
    this.displayableCredentials = [];
    for (let credentialToDelete of this.credentials) {
      let credentialSubject = credentialToDelete.pluginVerifiableCredential.getSubject();

      // Generate a displayable version of each entry found in the credential subject
      let displayableEntries: ImportedCredentialItem[] = [];
      for (let subjectEntryKey of Object.keys(credentialSubject)) {
        let subjectEntryValue = credentialSubject[subjectEntryKey];

        if (subjectEntryKey == "id") // Don't display the special subject id entry
          continue;

        let displayableEntry: ImportedCredentialItem = {
          name: subjectEntryKey,
          value: subjectEntryValue,
          showData: true
        }

        displayableEntries.push(displayableEntry);
      }

      let displayableCredential: ImportedCredential = {
        name: this.didService.getUserFriendlyBasicProfileKeyName(credentialToDelete.pluginVerifiableCredential.getFragment()),
        values: displayableEntries,
        credential: credentialToDelete,
      };

      this.displayableCredentials.push(displayableCredential);
    }
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

    // Delete the credentials from user's DID and DID Document.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    AuthService.instance.checkPasswordThenExecute(async () => {
      let deletedCredentialsResult: string[] = [];
      for (let displayableCredential of this.displayableCredentials) {
        Logger.log('Identity', "CredDeleteRequest - deleting credential: ", displayableCredential.credential);
        let credentialId = new DIDURL(displayableCredential.credential.pluginVerifiableCredential.getId());
        let credential = displayableCredential.credential.pluginVerifiableCredential;

        // Delete from the DID Document, if any
        if (this.didService.getActiveDid().getDIDDocument().getCredentialById(credentialId))
          await this.didService.getActiveDid().getDIDDocument().deleteCredential(credential, AuthService.instance.getCurrentUserPassword());

        // Delete from credentials list
        await this.didService.getActiveDid().deleteCredential(credentialId, true);

        deletedCredentialsResult.push(credentialId.toString());
      }

      if (!this.forceToPublishCredentials) {
        // We don't need to publish - finalize the action
        Logger.log("identity", "DID document doesn't have to be published, operation is complete");
        this.finalizeRequest(deletedCredentialsResult);
      }
      else {
        Logger.log("identity", "DID document has to be published, publishing");
        void this.publishAndFinalize(deletedCredentialsResult);
      }
    }, () => {
      // Cancelled
      this.accepting = false;
    });
  }

  private async publishAndFinalize(deletedCredentialsResult: string[]) {
    let publicationStatus = this.globalPublicationService.publicationStatus.subscribe((status) => {
      Logger.log("identity", "(delete credentials) DID publication status update for DID", status);
      if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
        Logger.log("identity", "(delete credentials) DID publication complete");
        publicationStatus.unsubscribe();
        this.finalizeRequest(deletedCredentialsResult);
      }
      else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
        Logger.warn("identity", "(delete credentials) DID publication failure");
        publicationStatus.unsubscribe();
        // Publication failed but still, we return the imported credentials list because
        // they were at least imported locally, we are not going to revert this.
        this.finalizeRequest(deletedCredentialsResult);
      }
    });

    await this.didService.getActiveDid().getDIDDocument().publish(AuthService.instance.getCurrentUserPassword());
  }

  private finalizeRequest(deletedCredentialsIds: string[]) {
    void this.popupProvider.ionicAlert(this.translate.instant('identity.creddelete-success-title'), this.translate.instant('identity.creddelete-success'), this.translate.instant('identity.creddelete-success-done')).then(async () => {
      Logger.log('Identity', "Sending creddelete intent response for intent id " + this.receivedIntent.intentId)
      await this.appServices.sendIntentResponse("creddelete", {
        deletedcredentialsids: deletedCredentialsIds
      }, this.receivedIntent.intentId);
    })
  }

  async rejectRequest() {
    await this.appServices.sendIntentResponse("creddelete", {
      deletedcredentialsids: []
    }, this.receivedIntent.intentId);
  }

  async failingRequest() {
    await this.appServices.sendIntentResponse("creddelete", {
      deletedcredentialsids: []
    }, this.receivedIntent.intentId);
  }

  getDappIcon() {
    return 'assets/identity/icon/elastos-icon.svg';
  }
}
