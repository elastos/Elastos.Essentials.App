import { Component, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DIDService } from '../../../services/did.service';
import { Native } from '../../../services/native';
import { PopupProvider } from '../../../services/popup';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { DIDSyncService } from '../../../services/didsync.service';
import { Events } from '../../../services/events.service';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { DIDDocument } from '../../../model/diddocument.model';
import { DIDURL } from '../../../model/didurl.model';
import { VerifiableCredential } from 'src/app/didsessions/model/verifiablecredential.model';
import { AdvancedPopupController } from '../../../components/advanced-popup/advancedpopup.controller';
import { Profile } from '../../../model/profile.model';

type CredentialDisplayEntry = {
  credential: DIDPlugin.VerifiableCredential,
  willingToBePubliclyVisible: boolean,
  willingToDelete: boolean,
  canDelete: boolean
}

@Component({
  selector: 'page-credentiallist',
  templateUrl: 'credentiallist.html',
  styleUrls: ['credentiallist.scss']
})
export class CredentialListPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  didString: DIDPlugin.DIDString = "";
  public credentials: VerifiableCredential[];
  public hasCredential: boolean = false;
  public profile: Profile = null;
  visibleData: CredentialDisplayEntry[];
  invisibleData: CredentialDisplayEntry[];
  public editingVisibility: boolean = false;
  public deletionMode: boolean = false;

  private credentialaddedSubscription: Subscription = null;
  private didchangedSubscription: Subscription = null;
  private documentchangedSubscription: Subscription = null;

  constructor(public event: Events, public route:ActivatedRoute, public zone: NgZone,
      private didService: DIDService,
      private translate: TranslateService,
      private didSyncService: DIDSyncService,
      private events: Events,
      private advancedPopup: AdvancedPopupController,
      private native: Native, private popupProvider: PopupProvider) {
    this.init();
  }

  ngOnInit() {
    this.credentialaddedSubscription = this.event.subscribe('did:credentialadded', ()=> {
      this.zone.run(() => {
        this.init();
      });
    });

    this.didchangedSubscription = this.event.subscribe('did:didchanged', ()=> {
      this.zone.run(() => {
        this.init();
      });
    });

    this.documentchangedSubscription = this.events.subscribe('diddocument:changed', ()=>{
      // When the did document content changes, we rebuild our credentials entries on screen.
      this.buildDisplayEntries();
    });
  }

  unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
  }

  ngOnDestroy() {
    console.log("ON DESTROY")
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.didchangedSubscription);
    this.unsubscribe(this.documentchangedSubscription);
  }

  init() {
    if (!this.didService.getActiveDid()) // Could happen when creating a DID while already in another DID
      return;

    this.profile = this.didService.getActiveDid().getBasicProfile();
    this.didString = this.didService.getActiveDid().getDIDString();
    this.credentials = this.didService.getActiveDid().credentials;
    this.hasCredential = this.credentials.length > 0 ? true : false;

    // Sort credentials by title
    this.credentials.sort((c1, c2)=>{
      if (c1.pluginVerifiableCredential.getFragment() > c2.pluginVerifiableCredential.getFragment())
        return 1;
      else
        return -1;
    });

    this.buildDisplayEntries();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('did-credentials'));
  }

  ionViewDidLeave() {
    // Restore some UI state in case we just go refreshed
    this.editingVisibility = false;
    this.deletionMode = false;
  }



  /**
   * Convenience conversion to display credential data on UI.
   */
  buildDisplayEntries() {
    // Initialize
    this.visibleData = [];
    this.invisibleData = [];

    for(let c of this.credentials) {
      let canDelete = this.credentialIsCanDelete(c);
      if (this.credentialIsVisibleOnChain(c)) {
        this.visibleData.push({
          credential: c.pluginVerifiableCredential,
          willingToBePubliclyVisible: true,
          willingToDelete: false,
          canDelete: canDelete
        })
      }
      else {
        this.invisibleData.push({
          credential: c.pluginVerifiableCredential,
          willingToBePubliclyVisible: false,
          willingToDelete: false,
          canDelete: canDelete
        })
      }
    }
  }

  /**
   * Tells if a given credential is currently visible on chain or not (inside the DID document or not).
   */
  credentialIsVisibleOnChain(credential: VerifiableCredential) {
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();
    if (!currentDidDocument)
      return false;

    let didDocumentCredential = currentDidDocument.getCredentialById(new DIDURL(credential.pluginVerifiableCredential.getId()));
    return didDocumentCredential != null;
  }

  /**
   * The name credential can not be deleted.
   */
  credentialIsCanDelete(credential: VerifiableCredential) {
    let fragment = credential.pluginVerifiableCredential.getFragment();
    if (fragment === 'name') return false;
    else return true;
  }

  /**
   * Toggle credential visibility edition mode.
   */
  toggleVisibilityMode() {
    this.deletionMode = false;
    this.editingVisibility = !this.editingVisibility;
  }

  toggleDeleteMode() {
    this.editingVisibility = false;
    this.deletionMode = !this.deletionMode;
  }

  createCredential() {
    this.native.go('/credentialcreate');
  }

  backupCredential(credential) {
    this.didService.credentialToJSON(credential).then( (ret)=> {
      this.native.go('/credentialbackup', {content: ret});
    })
  }

  getDisplayableCredentialTitle(entry: CredentialDisplayEntry): string {
    let fragment = entry.credential.getFragment();
    let translationKey = "credential-info-type-"+fragment;
    let translated = this.translate.instant(translationKey);

    if (!translated || translated == "" || translated == translationKey)
      return fragment;

    return translated;
  }

  getSelectedCount() {
    let count = 0;
    for (let i = 0; i < this.credentials.length; i++) {
      /*if (this.credentials[i].isChecked === true) {
        count++;
      }*/
    }
    return count;
  }

  /**
   * User friendly string that shows who issued a credential in the list.
   */
  getDisplayableIssuer(credential: DIDPlugin.VerifiableCredential) {
    let issuer = credential.getIssuer();
    if (issuer == this.didService.getActiveDid().getDIDString())
      return this.translate.instant("issuer-myself");
    else
      return issuer;
  }

  displayableProperties(credential: DIDPlugin.VerifiableCredential) {
    let subject = credential.getSubject();
    return Object.keys(subject).filter(key=>key!="id").sort().map((prop)=>{
      return {
        name: prop,
        value: (subject[prop] != "" ? subject[prop] : this.translate.instant("not-set"))
      }
    });
  }

  /**
   * Tells if gender in current profile is a male
   */
  isMale() {
    let genderEntry = this.profile.getEntryByKey("gender");
    return (!genderEntry || genderEntry.value == "" || genderEntry.value == "male")
  }

  saveVisibilityChanges() {
    AuthService.instance.checkPasswordThenExecute(async ()=>{
      let password = AuthService.instance.getCurrentUserPassword();

      await this.updateDIDDocumentFromSelection(password);
      this.promptPublishVisibilityChanges(password);
    }, ()=>{
      // Cancelled
    });
  }

  promptPublishVisibilityChanges(password: string) {
    this.advancedPopup.create({
      color:'var(--ion-color-primary)',
      info: {
          picture: '/assets/identity/images/Visibility_Icon.svg',
          title: this.translate.instant("publish-popup-title"),
          content: this.translate.instant("publish-popup-content")
      },
      prompt: {
          title: this.translate.instant("publish-popup-confirm-question"),
          confirmAction: this.translate.instant("confirm"),
          cancelAction: this.translate.instant("go-back"),
          confirmCallback: async ()=>{
            this.publishDIDDocumentReal(password);
          }
      }
    }).show();
  }

  private publishDIDDocumentReal(password: string) {
    this.didSyncService.publishActiveDIDDIDDocument(password);
  }

  /**
   * Checks visibility status for each credential and update the DID document accordingly
   * (add / remove items).
   */
  private async updateDIDDocumentFromSelection(password: string) {
    let changeCount = 0;
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();

    console.log("Updating DID document from selection");

    for (let displayEntry of this.visibleData) {
      let somethingChanged = await this.updateDIDDocumentFromSelectionEntry(currentDidDocument, displayEntry, password);
      changeCount += (somethingChanged?1:0);
    }

    for (let displayEntry of this.invisibleData) {
      let somethingChanged = await this.updateDIDDocumentFromSelectionEntry(currentDidDocument, displayEntry, password);
      changeCount += (somethingChanged?1:0);
    }

    // Tell everyone that the DID document has some modifications.
    if (changeCount > 0) {
      this.events.publish("diddocument:changed");
    }
  }

  /**
   * Returns true if something has been modified, false otherwise.
   */
  private async updateDIDDocumentFromSelectionEntry(currentDidDocument: DIDDocument, displayEntry: CredentialDisplayEntry, password: string): Promise<boolean> {
    console.log("Updating document from selection entry", displayEntry);
    if (!displayEntry.credential)
      return false;

    let relatedCredential = this.didService.getActiveDid().getCredentialById(new DIDURL(displayEntry.credential.getId()));

    let existingCredential = await currentDidDocument.getCredentialById(new DIDURL(relatedCredential.pluginVerifiableCredential.getId()));
    if (this.editingVisibility && !existingCredential && displayEntry.willingToBePubliclyVisible) {
      // Credential doesn't exist in the did document yet but user wants to add it? Then add it.
      await currentDidDocument.addCredential(relatedCredential.pluginVerifiableCredential, password);
      return true;
    }
    else if (this.editingVisibility && existingCredential && !displayEntry.willingToBePubliclyVisible) {
      // Credential exists but user wants to remove it from chain? Then delete it from the did document
      await currentDidDocument.deleteCredential(relatedCredential.pluginVerifiableCredential, password);
      return true;
    }

    return false;
  }

  /**
   * Ask user if he really wants to proceed to deletion of selected credentials, then delete if
   * agreed.
   */
  deleteSelectedCredentials(password) {
    this.advancedPopup.create({
      color:'#FF4D4D',
      info: {
          picture: '/assets/identity/images/Local_Data_Delete_Icon.svg',
          title: this.translate.instant("deletion-popup-warning"),
          content: this.translate.instant("credential-deletion-popup-content")
      },
      prompt: {
          title: this.translate.instant("deletion-popup-confirm-question"),
          confirmAction: this.translate.instant("confirm"),
          cancelAction: this.translate.instant("go-back"),

          confirmCallback: async ()=>{
            console.log("Deletion confirmed by user");
            this.deleteSelectedCredentialsReal();
          }
      }
    }).show();
  }

  private async deleteSelectedCredentialsReal() {
    AuthService.instance.checkPasswordThenExecute(async ()=>{
      let password = AuthService.instance.getCurrentUserPassword();

      let currentDidDocument = this.didService.getActiveDid().getDIDDocument();

      let documentChangeCount = 0;

      for (let entry of this.visibleData) {
        if (entry.willingToDelete) {
          let didDocumentHasChanged = await this.deleteSelectedEntryReal(entry, currentDidDocument);
          documentChangeCount += (didDocumentHasChanged?1:0);
        }
      }

      for (let entry of this.invisibleData) {
        if (entry.willingToDelete) {
          let didDocumentHasChanged = await this.deleteSelectedEntryReal(entry, currentDidDocument);
          documentChangeCount += (didDocumentHasChanged?1:0);
        }
      }

      // Prompt user to publish his DID document (he can skip this)
      if (documentChangeCount > 0) {
        await this.promptPublishVisibilityChanges(password);

        // Tell everyone that the DID document has some modifications.
        this.events.publish("diddocument:changed");
      }

      // Exit deletion mode
      this.deletionMode = false;

      // Rebuild entries
      this.buildDisplayEntries();
    }, ()=>{
      // Cancelled
    });
  }

  /**
   * Returns true if the current did document has been modified, false otherwise.
   */
  private async deleteSelectedEntryReal(entry: CredentialDisplayEntry, currentDidDocument: DIDDocument): Promise<boolean> {
    // Delete locally
    await this.didService.getActiveDid().deleteCredential(new DIDURL(entry.credential.getId()));

    // Delete from local DID document
    if (currentDidDocument.getCredentialById(new DIDURL(entry.credential.getId()))) {
      await currentDidDocument.deleteCredential(entry.credential, AuthService.instance.getCurrentUserPassword());
      return true;
    }

    return false;
  }
}
