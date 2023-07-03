import { Component, NgZone, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { DID as ConnSDKDID } from "@elastosfoundation/elastos-connectivity-sdk-js";
import { AlertController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import jsonpath from "jsonpath";
import { isNil } from 'lodash-es';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { DIDDocumentsService } from 'src/app/identity/services/diddocuments.service';
import { Logger } from 'src/app/logger';
import { JSONObject } from 'src/app/model/json';
import { GlobalCredentialToolboxService } from 'src/app/services/credential-toolbox/global.credential-toolbox.service';
import { GlobalCredentialTypesService } from 'src/app/services/credential-types/global.credential.types.service';
import { GlobalApplicationDidService } from 'src/app/services/global.applicationdid.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { SuccessComponent } from '../../../components/success/success.component';
import { DID } from '../../../model/did.model';
import { RequestCredentialsIntent } from '../../../model/identity.intents';
import { VerifiableCredential } from '../../../model/verifiablecredential.model';
import { AuthService } from '../../../services/auth.service';
import { DIDService } from '../../../services/did.service';
import { ExpirationService } from '../../../services/expiration.service';
import { IntentReceiverService } from '../../../services/intentreceiver.service';
import { UXService } from '../../../services/ux.service';
import { V1Claim } from './model/v1claim';

/**
 * TODO BPI:
 *
 * - For external credentials, display issuer avatar/name/did string or placeholders
 * - Test with UI customization
 * - Design + integration
 * - Cleanup old code
 *
 * - Save profile credentials with DisplayableCredential implementation
 *    - Display according to DisplayableCredential when possible
 * - Add related credential types to profile credentials (just the type, nothing else for now)
 * - Allow to add multiple emails, addresses, etc to profile.
 *    - When min and max are one, selecting an unselected credential should unselect the selected one.
 * - Replace "verified" by "from third party"
 * (low) - Fix credentials list screen blinking like crazy (lots of refresh)
 */

declare let didManager: DIDPlugin.DIDManager;

type IssuerDisplayEntry = {
  did: string,
  name: string,
  avatar: string
}

type IssuerInfo = {
  displayItem: IssuerDisplayEntry,
  isExpired: boolean,
  canBeDelivered: boolean,
  errorMessage: string
}

/* type ClaimRequest = {
  name: string,
  value: string,
  credential: DIDPlugin.VerifiableCredential, // credential related to this claim request
  canBeDelivered: boolean,  // Whether the requested claim can be delivered to caller or not. Almost similar to "credential" being null, except for "did"
  issuer: IssuerInfo, //Issuer details to display when credential is validated and/or requested
  isExpired: boolean,
  selected: boolean,
  reason: string // Additional usage info string provided by the caller
}
 */

type CredentialDisplayEntry = {
  credential: VerifiableCredential;
  selected: boolean;
  expired: boolean;
}

type ClaimDisplayEntry = {
  claimDescription: ConnSDKDID.ClaimDescription; // Original claim request from the intent
  matchingCredentials: CredentialDisplayEntry[]; // Credentials matching the requested claim
}

/**
 * This screen is the v2 version of "get credentials / credaccess" with support for
 * queries by type instead of only ID, json path queries, multiple credential choices,
 * displayable credential type and more.
 *
 * Request example:
   // TODO
 */
@Component({
  selector: 'page-requestcredentials',
  templateUrl: 'requestcredentials.html',
  styleUrls: ['requestcredentials.scss']
})
export class RequestCredentialsPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public receivedIntent: RequestCredentialsIntent = null;
  private rawClaims: ConnSDKDID.ClaimDescription[] = [];
  public requestingAppIconUrl: string = null;
  public requestingAppName: string = null;
  public requestDappColor = '#565bdb';

  public credentials: VerifiableCredential[] = [];
  public did: DID = null;

  private onlineDIDDocumentStatusSub: Subscription = null;

  public publishStatusFetched = false;
  public didNeedsToBePublished = false;
  public publishingDidRequired = false;
  public claimsHaveBeenOrganized = false;
  private alert = null;

  public organizedClaims: ClaimDisplayEntry[] = [];

  public sendingResponse = false;

  private alreadySentIntentResponse = false;

  public popup: HTMLIonPopoverElement = null;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    public appServices: UXService,
    public didService: DIDService,
    private authService: AuthService,
    private translate: TranslateService,
    private expirationService: ExpirationService,
    public theme: GlobalThemeService,
    private globalPopupService: GlobalPopupService,
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController,
    private didDocumentsService: DIDDocumentsService,
    private credentialTypesService: GlobalCredentialTypesService,
    private intentService: IntentReceiverService,
    private dappbrowserService: DappBrowserService,
    private globalHiveService: GlobalHiveService,
    private globalApplicationDidService: GlobalApplicationDidService,
    private credentialsToolboxService: GlobalCredentialToolboxService,
    private clipboard: Clipboard,
    private native: GlobalNativeService
  ) {
    GlobalFirebaseService.instance.logEvent("intent_req_cred_enter");
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(' ');
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = async (icon) => {
      // Close icon
      await this.rejectRequest();
      void this.titleBar.globalNav.exitCurrentContext();
    });

    this.organizedClaims = [];
    /*  this.mandatoryItems = [];
     this.optionalItems = []; */

    // Show the spinner while we make sure if the DID is published or not
    this.publishStatusFetched = false;

    this.credentials = this.didService.getActiveDidStore().getActiveDid().credentials;
    this.did = this.didService.getActiveDidStore().getActiveDid();
    Logger.log('Identity', 'Did needs to be published?', this.didNeedsToBePublished);

    this.receivedIntent = this.intentService.getReceivedIntent();

    // Fix all values in the request to make it straightforward in our process later
    this.prepareRawClaims();

    this.onlineDIDDocumentStatusSub = this.didDocumentsService.onlineDIDDocumentsStatus.get(this.did.getDIDString()).subscribe((status) => {
      if (status.checked) {
        this.publishStatusFetched = true;
        this.didNeedsToBePublished = status.document == null;

        if (!this.alert)
          void this.handleRequiresPublishing();
      }
    });

    void this.zone.run(async () => {
      void this.fetchApplicationDidInfo(); // Don't wait, just show app info when ready, if ready

      await this.getRequestedTheme();
      await this.organizeRequestedClaims();

      Logger.log('Identity', "Request Dapp color", this.requestDappColor);
      //Logger.log('Identity', "Mandatory claims:", this.mandatoryItems);
      //Logger.log('Identity', "Optional claims:", this.optionalItems);
      Logger.log('Identity', "Organized claims:", this.organizedClaims);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.onlineDIDDocumentStatusSub) {
      this.onlineDIDDocumentStatusSub.unsubscribe();
      this.onlineDIDDocumentStatusSub = null;
    }
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponse) {
      void this.rejectRequest(false);
    }
  }

  /**
   * Runs through all claims in the incoming request and set default value whenever needed.
   */
  private prepareRawClaims() {
    // Copy claims received as input as a new object that we can manipulate.
    this.rawClaims = JSON.parse(JSON.stringify((this.receivedIntent.params.request.claims)));

    // Convert old claim formats if needed
    this.convertRawClaimsIfNeeded();

    this.rawClaims.forEach(claim => {
      if (claim.min === undefined)
        claim.min = 1;
      if (claim.max === undefined)
        claim.max = 1;

      return claim;
    });
  }

  /**
   * Method for backward compatibility to convert v1 claim formats (before May 2022) to v2 claim
   * format (after May 2022).
   */
  private convertRawClaimsIfNeeded() {
    if (!("_version" in this.receivedIntent.params.request)) {
      // Version 1 - convert old claims to new format (with claim descriptions)
      let newClaims: ConnSDKDID.ClaimDescription[] = [];
      let oldClaims = this.receivedIntent.params.request.claims as any as V1Claim[];

      for (let oldClaim of oldClaims) {
        let newClaimDescription = ConnSDKDID.claimDescription(oldClaim.reason)
          .withMin(oldClaim.min)
          .withMax(oldClaim.max)
          .withNoMatchRecommendations(oldClaim.noMatchRecommendations)
          .withClaim(new ConnSDKDID.Claim()
            .withQuery(oldClaim.query)
            .withIssuers(oldClaim.issuers)
          );

        newClaims.push(newClaimDescription);
      }

      this.rawClaims = newClaims;
    }
    else {
      // Nothing to change - good format
    }
  }

  getRequestedTheme(): Promise<void> {
    return new Promise((resolve) => {
      const customization = this.receivedIntent.params.request.customization;
      if (customization) {
        if (customization.primaryColorDarkMode && customization.primaryColorDarkMode) {
          this.requestDappColor = !this.theme.darkMode ? customization.primaryColorLightMode : customization.primaryColorDarkMode;
        }
      }
      resolve();
    });
  }

  private handleRequiresPublishing() {
    return new Promise<void>((resolve) => {
      // Intent service marks value as true if intent does not specify 'publisheddid' params
      const publisheddidParams = this.receivedIntent.params.request.didMustBePublished;
      Logger.log('publisheddid params', this.receivedIntent.params.request.didMustBePublished);

      if (publisheddidParams) {
        if (this.publishStatusFetched && !this.didNeedsToBePublished) {
          this.publishingDidRequired = false;
        } else {
          void this.alertDidNeedsPublishing();
          this.publishingDidRequired = true;
        }
      } else {
        // Request does not require published did
        this.publishingDidRequired = false;
      }

      resolve();
    });
  }

  /**
   * From the raw list of claims requested by the caller, we create our internal model
   * ready for UI.
   */
  async organizeRequestedClaims() {
    // Split into mandatory and optional items
    for (let claimDescription of this.rawClaims) {
      Logger.log("identity", "Organizing claim", claimDescription);

      // Convert our DID store credentials list into a searcheable array of JSON data for jsonpath
      let searcheableCredentials: JSONObject[] = [];
      for (let vc of this.credentials) {
        let credentialJson = JSON.parse(await vc.pluginVerifiableCredential.toString());

        // Virtually append more "types" to the credential, to make json path resolve more queries
        // including full type like:
        // "$[?(@.type.indexOf('did://elastos/xxx/MyCred123#MyCred') >= 0)]"
        await this.appendTypesWithContextsToJsonCredential(vc, credentialJson);

        searcheableCredentials.push(credentialJson);
      }
      let matchingCredentialJsons: JSONObject[] = [];

      let matchingCredentials: CredentialDisplayEntry[] = [];
      for (let claim of claimDescription.claims) {
        try {
          matchingCredentialJsons = matchingCredentialJsons.concat(jsonpath.query(searcheableCredentials, claim.query));
          Logger.log("identity", "Matching credentials (json)", matchingCredentialJsons);
        }
        catch (e) {
          // jsonpath error
          Logger.warn("identity", "JSON Path exception", e);
        }

        // Rebuild a list of real credential objects from json results
        matchingCredentials = matchingCredentials.concat(matchingCredentialJsons.map(jsonCred => {
          let credential = this.credentials.find(c => c.pluginVerifiableCredential.getId() === jsonCred.id);

          // Check if the credential is expired
          let expirationInfo = this.expirationService.verifyCredentialExpiration(this.did.pluginDid.getDIDString(), credential.pluginVerifiableCredential, 0);
          let isExpired = false;
          if (expirationInfo) // hacky case, but null expirationInfo means we should not check the expiration... (legacy)
            isExpired = expirationInfo.daysToExpire <= 0;

          // Check if the issuers can match (credential issuer must be in claim's issuers list, if provided)
          if (claim.issuers) {
            let matchingIssuer = claim.issuers.find(i => i === credential.pluginVerifiableCredential.getIssuer());
            if (!matchingIssuer)
              return null;
          }

          return {
            credential: credential,
            selected: false, // Don't select anything yet, we'll update this just after
            expired: isExpired
          };
        }).filter(c => c !== null));
      }

      // Decide which credentials should be selected by default or not. Strategy:
      // - min = max = number of matching creds = 1 -> select the only cred
      // - all other cases: don't select anything
      if (claimDescription.min == 1 && claimDescription.max === claimDescription.min && matchingCredentials.length === 1) {
        matchingCredentials[0].selected = true;
      }

      let organizedClaim: ClaimDisplayEntry = {
        claimDescription: claimDescription,
        matchingCredentials
      }

      this.organizedClaims.push(organizedClaim);
    }

    this.claimsHaveBeenOrganized = true;

    Logger.log("identity", "Organized claims", this.organizedClaims);
  }

  private async fetchApplicationDidInfo(): Promise<void> {
    let callingAppDID = this.receivedIntent.params.caller;

    // Fetch the application from chain and extract info.
    let publishedAppInfo = await this.globalApplicationDidService.fetchPublishedAppInfo(callingAppDID);
    if (publishedAppInfo.didDocument) {
      Logger.log("identity", "Published application info:", publishedAppInfo);

      this.requestingAppName = publishedAppInfo.name;

      void this.fetchAppIcon(publishedAppInfo.iconUrl);
    }
  }

  private async fetchAppIcon(hiveIconUrl: string) {
    try {
      this.requestingAppIconUrl = await this.globalHiveService.fetchHiveScriptPictureToDataUrl(hiveIconUrl);
    }
    catch (e) {
      Logger.error("identity", `Failed to fetch application icon at ${hiveIconUrl}`);
    }
  }

  /**
   * Expands the credential using JSONLD in order to get a list of matching contexts + short types.
   * Based on this info, builds the corresponding elastos-queryable full types in the form of
   * context#shortType (this is a elastos format, not a real type in JSONLD) and appens
   * this "full type" to the current list of types in the credential json payload.
   *
   * This allows jsonpath / connectivity sdk to query full types easily.
   */
  private async appendTypesWithContextsToJsonCredential(vc: VerifiableCredential, credentialJson: JSONObject): Promise<void> {
    let typesWithContext = await this.credentialTypesService.resolveTypesWithContexts(vc.pluginVerifiableCredential);

    for (let twc of typesWithContext) {
      let fullQueryType = `${twc.context}#${twc.shortType}`;
      let jsonTypes = credentialJson.type as string[];
      if (jsonTypes.indexOf(fullQueryType) < 0)
        jsonTypes.push(fullQueryType);
    }
  }

  /**
   * Called when user clicks the credential checkbox.
   *
   * Several cases can happen, and it all depends the min and max number of credentials the calling
   * app is expecting for the parent claim.
   */
  public onCredentialSelection(claim: ClaimDisplayEntry, credentialEntry: CredentialDisplayEntry) {
    // If currently selected, we expect to unselect. But the code below will decide whether this
    // expectation can be fulfilled or not.
    let expectingToUnselect = credentialEntry.selected;

    Logger.log("identity-debug", "onCredentialSelection", claim, credentialEntry);

    if (expectingToUnselect) {
      // Expecting to unselect
      if (claim.claimDescription.min === 1 && claim.claimDescription.max === 1) {
        // Do nothing, cannot unselect. Need to select another one
      }
      else {
        credentialEntry.selected = false;
      }
    }
    else {
      // Expecting to select
      if (claim.claimDescription.min === 1 && claim.claimDescription.max === 1) {
        // We can select yes, but we also need to unselect the currently selected one
        let selectedCredentialEntry = this.getFirstSelectedCredentialInClaim(claim);
        if (selectedCredentialEntry)
          selectedCredentialEntry.selected = false;
      }

      credentialEntry.selected = true;
    }
  }

  public numberOfSelectedCredentialsInClaim(claim: ClaimDisplayEntry): number {
    return claim.matchingCredentials.reduce((acc, c) => c.selected ? acc + 1 : acc, 0);
  }

  private getFirstSelectedCredentialInClaim(claim: ClaimDisplayEntry): CredentialDisplayEntry {
    return claim.matchingCredentials.find(c => c.selected);
  }

  /**
   * Some credentials are complex objects, not string. We want to returne a string representation for easier
   * display.
   */
  /* private credentialValueAsString(credentialValue: any): string {
    if (typeof credentialValue === "string")
      return credentialValue as string;
    else
      return this.translate.instant("identity.cant-be-displayed");
  } */

  async alertDidNeedsPublishing() {
    if (this.alert) return; // already be shown.

    this.alert = await this.alertCtrl.create({
      mode: 'ios',
      header: this.translate.instant('identity.credaccess-alert-publish-required-title'),
      message: this.translate.instant('identity.credaccess-alert-publish-required-msg'),
      backdropDismiss: false,
      buttons: [
        {
          text: this.translate.instant('identity.credaccess-alert-publish-required-btn'),
          handler: () => {
            this.zone.run(() => {
              void this.sendIntentResponse(
                { jwt: null },
                this.receivedIntent.intentId
              );
              this.alert = null;
            });
          }
        }
      ]
    });
    await this.alert.present();
  }

  /**
   * NOTE: For now we assume that the credential name (fragment) is the same as the requested claim value.
   * But this may not be tue in the future: we would have to search inside credential properties one by one.
   *
   * key format: "my-key" (credential fragment)
   */
  findCredential(key: string): VerifiableCredential {
    return this.credentials.find((c) => {
      return c.pluginVerifiableCredential.getFragment() == key;
    })
  }

  /**
   * NOTE: For now we assume that the credential name (fragment) is the same as the requested claim value.
   * But this may not be true in the future: we would have to search inside credential properties one by one.
   */
  /* getBasicProfileCredentialValue(credential: DIDPlugin.VerifiableCredential): any {
    return credential.getSubject()[credential.getFragment()];
  } */

  /**
   * Check if self proclaimed credentials are accepted
   */
  acceptsSelfProclaimedCredentials(iss: any): boolean {
    let response = true
    if (!isNil(iss) && iss instanceof Object) {
      response = iss["selfproclaimed"];
    }

    Logger.log('Identity', "acceptsSelfProclaimedCredentials", iss, response)

    return response;
  }

  /**
  * Check if credential issuer match with requested
  */
  acceptsIssuer(iss: any, issuerDid: string): boolean {
    Logger.log('Identity', "acceptsIssuer", iss, issuerDid)

    if (isNil(iss)) return true;

    let issuersAccepted: string[] = iss["did"] || []

    return issuersAccepted.includes(issuerDid);
  }

  /**
   * Build a list of credentials ready to be packaged into a presentation, according to selections
   * done by the user.
   */
  buildDeliverableCredentialsList(): VerifiableCredential[] {
    let selectedCredentials: VerifiableCredential[] = [];
    for (let organizedClaim of this.organizedClaims) {
      for (let displayCredential of organizedClaim.matchingCredentials) {
        if (displayCredential.selected)
          selectedCredentials.push(displayCredential.credential);
      }
    }

    Logger.log('Identity', 'Deliverable credentials:', JSON.parse(JSON.stringify(selectedCredentials)));

    return selectedCredentials;
  }

  acceptRequest() {
    this.sendingResponse = true;

    setTimeout(() => {
      let selectedCredentials = this.buildDeliverableCredentialsList();

      // Create and send the verifiable presentation that embeds the selected credentials
      void AuthService.instance.checkPasswordThenExecute(async () => {
        let presentation: DIDPlugin.VerifiablePresentation = null;
        let currentDidString: string = this.didService.getActiveDid().getDIDString();
        presentation = await this.didService.getActiveDid().createVerifiablePresentationFromCredentials(selectedCredentials.map(c => c.pluginVerifiableCredential), this.authService.getCurrentUserPassword(), this.receivedIntent.params.request.nonce, this.receivedIntent.params.request.realm);
        Logger.log('Identity', "Created presentation:", presentation);

        let payload = {
          type: "requestcredentials",
          did: currentDidString,
          presentation: JSON.parse(await presentation.toJson()), // Get presentation as json from the DID SDK then parse as a json object to send the response back.
        };

        // Return the original JWT token in case this intent was called by an external url (elastos scheme definition)
        // TODO: Currently adding elastos://requestcredentials/ in front of the JWT because of CR website requirement. But we should cleanup this and pass only the JWT itself
        if (this.receivedIntent.originalJwtRequest) {
          Logger.log('Identity', 'Intent is called by external intent', this.receivedIntent.originalJwtRequest);
          payload["req"] = "elastos://requestcredentials/" + this.receivedIntent.originalJwtRequest;

          let parsedJwt = await didManager.parseJWT(false, this.receivedIntent.originalJwtRequest);
          if (parsedJwt) {
            if (parsedJwt.payload["iss"]) {
              // If we had a ISS (jwt issuer) field in the JWT request, we return this as our AUD for the response
              // accoding the the elastos scheme
              payload["aud"] = parsedJwt.payload["iss"];
            }
          }
        }

        // Let the credentials stats service know about this usage
        // TODO let appDid = this.receivedIntent.params.appdid;
        await this.credentialsToolboxService.recordCredentialUsage("request", selectedCredentials, this.receivedIntent.params.caller);

        const jwtToken = await this.didService.getActiveDid().getLocalDIDDocument().createJWT(
          payload,
          1, // Presentation JWT validity expires after 1 day  //this.receivedIntent.jwtExpirationDays,
          this.authService.getCurrentUserPassword()
        );

        Logger.log('Identity', "Sending intent response for intent id " + this.receivedIntent.intentId);
        try {
          if (this.receivedIntent.originalJwtRequest) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setTimeout(async () => {
              await this.sendIntentResponse({ jwt: jwtToken }, this.receivedIntent.intentId);
              this.sendingResponse = false;
            }, 1000);

          } else {
            await this.sendIntentResponse({ jwt: jwtToken }, this.receivedIntent.intentId);
            this.sendingResponse = false;
          }
        }
        catch (e) {
          this.popup = await this.globalPopupService.ionicAlert("Response error", "Sorry, we were unable to return the right information to the calling app. " + e, 'common.close');
          this.sendingResponse = false;
        }
      }, () => {
        // Cancelled
        this.sendingResponse = false;
      });
    }, 100);
  }

  async rejectRequest(navigateBack = true) {
    await this.sendIntentResponse({ did: null, presentation: null }, this.receivedIntent.intentId, navigateBack);
  }

  private async sendIntentResponse(result, intentId, navigateBack = true) {
    this.alreadySentIntentResponse = true;
    await this.appServices.sendIntentResponse(result, intentId, navigateBack);
  }

  async showSuccess(jwtToken) {
    this.popup = await this.popoverCtrl.create({
      backdropDismiss: false,
      mode: 'ios',
      cssClass: 'successComponent',
      component: SuccessComponent,
    });
    /*     this.popup.onWillDismiss().then(async () => {
          await this.sendIntentResponse("requestcredentials", {jwt: jwtToken}, this.requestDapp.intentId);
        }); */
    return await this.popup.present();
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getDappIcon() {
    if (this.requestingAppIconUrl) {
      return this.sanitize(this.requestingAppIconUrl);
    } else {
      return 'assets/shared/essentials-black-circle.svg'
    }
  }

  getDappName() {
    if (this.requestingAppName) {
      return this.requestingAppName;
    } else {
      return this.receivedIntent.params.appPackageId;
    }
  }

  getIntro() {
    if (this.publishingDidRequired) {
      return this.translate.instant('identity.credaccess-publish-required');
    } else {
      return this.translate.instant('identity.credaccess-intro');
    }
  }

  getItemValueDisplay(credentialEntry: CredentialDisplayEntry) {
    return credentialEntry.credential.pluginVerifiableCredential.getFragment();

    /* if (!item.canBeDelivered) {
      return this.translate.instant('identity.missing');
    } else if (item.canBeDelivered && !item.issuer.canBeDelivered) {
      return this.translate.instant(item.issuer.errorMessage)
    } else {
      return item.value;
    } */
  }

  /**
   * Convenient string format that describes the currenty claim selection status and requirement.
   *
   * min 1 max 1: "x / 1"
   * min 0 max 3: "x / max 3"
   * min 2 max 2: "x / 2"
   * min 2 max 4: "x / min 2, max 4"
   */
  public claimSelectionSummary(claim: ClaimDisplayEntry): string {
    let selectedNb = this.numberOfSelectedCredentialsInClaim(claim);

    if (claim.claimDescription.min === claim.claimDescription.max)
      return `${selectedNb} / ${claim.claimDescription.min}`;
    else {
      if (claim.claimDescription.min === 0)
        return `${selectedNb} / max ${claim.claimDescription.max}`;
      else
        return `${selectedNb} / min ${claim.claimDescription.min}, max ${claim.claimDescription.max}`;
    }
  }

  /**
   * Tells if current user selection of credentials fulfills the request requirements.
   * If true, the confirmation button may be displayed. If false, a cancel button may show
   * instead.
   */
  public selectionFulfillsTheRequest(): boolean {
    if (this.sendingResponse || !this.publishStatusFetched)
      return false; // Fetching something, can't fuflill the request.

    if (this.publishingDidRequired)
      return false; // DID is not published but it should be.

    // Make sure that we got the right number of credentials we expected for each claim.
    for (let organizedClaim of this.organizedClaims) {
      let nbOfSelectedCredentials = this.numberOfSelectedCredentialsInClaim(organizedClaim);
      if (nbOfSelectedCredentials < organizedClaim.claimDescription.min || nbOfSelectedCredentials > organizedClaim.claimDescription.max)
        return false;
    }

    return true;
  }

  public validationButtonClicked() {
    if (this.sendingResponse || this.popup)
      return; // Do nothing

    if (this.selectionFulfillsTheRequest())
      this.acceptRequest();
    else
      void this.rejectRequest();
  }

  /**
   * Whether the confirmation button should display a spinner icon or not.
   */
  public shouldShowValidationButtonSpinner(): boolean {
    return this.sendingResponse || !this.publishStatusFetched || !this.claimsHaveBeenOrganized;
  }

  /**
   * Tells if some "no match" recommendations were provided in the claim to guide user
   * or not.
   */
  public claimHasNoMatchRecommendations(claim: ClaimDisplayEntry): boolean {
    return claim.claimDescription.noMatchRecommendations && claim.claimDescription.noMatchRecommendations.length > 0;
  }

  public openRecommendation(recommendation: ConnSDKDID.NoMatchRecommendation) {
    // Don't open the recommended dapp link, because the target dapp may use a sign in intent that we don't want to "queue".
    // And if we first send the intent response for the current intent, essentials returns to the original app which is not right either.
    //void this.dappbrowserService.open(recommendation.url, recommendation.title);

    // Instead, copy the recommended url to the clipboard
    void this.clipboard.copy(recommendation.url);
    this.native.genericToast('common.copied-to-clipboard', 2000);
  }
}
