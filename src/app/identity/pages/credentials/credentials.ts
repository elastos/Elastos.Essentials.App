import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ActionSheetController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { GlobalCredentialTypesService } from "src/app/services/credential-types/global.credential.types.service";
import { Events } from "src/app/services/events.service";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { CredentialDisplayEntry } from "../../model/credentialdisplayentry.model";
import { DIDDocument } from "../../model/diddocument.model";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { DIDService } from "../../services/did.service";
import { DIDDocumentsService } from "../../services/diddocuments.service";
import { Native } from "../../services/native";
import { ProfileService } from "../../services/profile.service";

type SegmentType = "all" | "private" | "public" | "issuedbyuser" | "issuedbyothers" | "notconform" | "conform";

type DisplayableCredential = {
  credential: VerifiableCredential; // The credential itself
  isInRemoteDIDDocument: boolean; // The credential is in the DID document, meaning that it's visible by everyone
  isConform: boolean; // The credential format can be fully verified and all of its properties match the implemented credential types
  isIssuedByThirdParty: boolean;
}

@Component({
  selector: "credentials-profile",
  templateUrl: "credentials.html",
  styleUrls: ["credentials.scss"],
})
export class CredentialsPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public displayableCredentials: DisplayableCredential[] = [];
  public creatingIdentity = false;
  public fetchingApps = false;

  public segment: SegmentType = "all";

  public currentOnChainDIDDocument: DIDDocument = null;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private onlineDIDDocumentStatusSub: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private credentialdeletedSubscription: Subscription = null;

  constructor(
    public events: Events,
    public route: ActivatedRoute,
    public zone: NgZone,
    private translate: TranslateService,
    private didService: DIDService,
    private native: Native,
    public theme: GlobalThemeService,
    public actionSheetController: ActionSheetController,
    public profileService: ProfileService,
    private didDocumentsService: DIDDocumentsService,
    private globalCredentialTypesService: GlobalCredentialTypesService
  ) {
    this.init();
  }

  ngOnInit() {
    this.didchangedSubscription = this.events.subscribe("did:didchanged", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    let didString = this.didService.getActiveDid().getDIDString();
    this.onlineDIDDocumentStatusSub = this.didDocumentsService.onlineDIDDocumentsStatus.get(didString).subscribe((document) => {
      // When the did document content changes, we rebuild our profile entries on screen.
      // (published status)
      this.init();
    });

    this.documentChangedSubscription = this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {
      // When the did document content changes, we rebuild our profile entries on screen.
      this.init();
    });

    this.credentialaddedSubscription = this.events.subscribe("did:credentialadded", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.credentialdeletedSubscription = this.events.subscribe("did:credentialdeleted", () => {
        this.zone.run(() => {
          this.init();
        });
      });
  }

  unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
  }

  ngOnDestroy() {
    this.unsubscribe(this.didchangedSubscription);
    this.unsubscribe(this.onlineDIDDocumentStatusSub);
    this.unsubscribe(this.publicationstatusSubscription);
    this.unsubscribe(this.documentChangedSubscription);
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.credentialdeletedSubscription);
  }

  init() {
    this.displayableCredentials = [];

    //this.publishedCredentials = this.profileService.getPublishedCredentials();

    let identity = this.didService.getActiveDid();
    if (identity) {
      let credentials = identity.credentials;
      let activeDidString = identity.getDIDString();

      // Sort credentials by title
      credentials.sort((c1, c2) => {
        let c1Comparable: string = c1.getDisplayableTitle() || c1.getFragment();
        let c2Comparable: string = c2.getDisplayableTitle() || c2.getFragment();
        return c1Comparable.localeCompare(c2Comparable);
      });

      // Prepare displayable credential information with pre-computed data
      for (let credential of credentials) {
        let issuer = credential.pluginVerifiableCredential.getIssuer();

        let displayableCredential: DisplayableCredential = {
          credential,
          isInRemoteDIDDocument: this.profileService.credentialIsInPublishedDIDDocument(credential.pluginVerifiableCredential),
          isConform: false, // false, while getting the real value asynchronously
          isIssuedByThirdParty: issuer && (issuer !== activeDidString)
        };

        void this.globalCredentialTypesService.verifyCredential(credential.pluginVerifiableCredential).then((isFullyConform) => {
          displayableCredential.isConform = isFullyConform;
        });

        this.displayableCredentials.push(displayableCredential);
      }
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("identity.my-identity"));
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();
  }

  /**
   * Publish an updated DID document locally and to the DID sidechain, according to user's choices
   * for each profile item (+ the DID itself).
   */
  publishVisibilityChanges() {
    void this.profileService.showWarning("publishVisibility", null);
  }

  /******************** Display Helpers  ********************/
  getCredentialKey(entry: CredentialDisplayEntry): string {
    let fragment = entry.credential.getFragment();
    return fragment;
  }

  hasIssuer(issuerId: string): boolean {
    return this.profileService.hasIssuer(issuerId);
  }

  hasAvatarIssuer(issuerId: string): boolean {
    if (!this.profileService.hasIssuer(issuerId)) return false;
    let issuer = this.profileService.getIssuer(issuerId);
    return issuer.avatar !== null && issuer.avatar !== "";
  }

  credentialsListChanged(ev: any) {
    this.segment = ev.detail.value;
  }

  get filteredCredentials(): DisplayableCredential[] {
    switch (this.segment) {
      case "all":
        return this.displayableCredentials;
      case "private":
        return this.displayableCredentials.filter(c => !c.isInRemoteDIDDocument);
      case "public":
        return this.displayableCredentials.filter(c => c.isInRemoteDIDDocument);
      case "issuedbyuser":
        return this.displayableCredentials.filter(c => !c.isIssuedByThirdParty);
      case "issuedbyothers":
        return this.displayableCredentials.filter(c => c.isIssuedByThirdParty);
      case "notconform":
        return this.displayableCredentials.filter(c => !c.isConform);
      case "conform":
        return this.displayableCredentials.filter(c => c.isConform);
    }
  }

  openCredential(entry: CredentialDisplayEntry) {
    void this.native.go("/identity/credentialdetails", {
      credentialId: entry.credential.getId(),
    });
  }
}
