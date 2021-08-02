import { Component, NgZone, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ActionSheetController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { DIDURL } from "../../model/didurl.model";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { HttpClient } from "@angular/common/http";
import * as moment from "moment";
import { DIDDocument } from "../../model/diddocument.model";
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { Subscription } from "rxjs";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { isNil } from "lodash-es";
import { Logger } from "src/app/logger";
import { Events } from "src/app/services/events.service";
import { transparentPixelIconDataUrl } from "src/app/helpers/picture.helpers";
import { AuthService } from "src/app/identity/services/auth.service";
import { CredentialDisplayEntry } from "../../model/credentialdisplayentry.model";

type IssuerDisplayEntry = {
  did: string;
  name: string;
  avatar: string;
};

type DisplayProperty = {
  name: string;
  value: string;
};

@Component({
  selector: "credentialdetails-profile",
  templateUrl: "credentialdetails.page.html",
  styleUrls: ["credentialdetails.page.scss"],
})
export class CredentialDetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public credentials: VerifiableCredential[];
  public currentOnChainDIDDocument: DIDDocument = null;
  public credential: VerifiableCredential;
  public issuer: IssuerDisplayEntry;
  private avatarImg = null;

  public segment = "validator";
  public credentialId: string = null;
  public appIcon: string;

  public isCredentialInLocalDocument = true;
  public hasCheckedCredential = false;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private promptpublishdidSubscription: Subscription = null;
  private onlineDIDDocumentStatusSub: Subscription = null;

  public displayableProperties: DisplayProperty[];

  constructor(
    private http: HttpClient,
    public events: Events,
    public route: ActivatedRoute,
    private router: Router,
    public zone: NgZone,
    private translate: TranslateService,
    private didService: DIDService,
    private didSyncService: DIDSyncService,
    public theme: GlobalThemeService,
    public actionSheetController: ActionSheetController,
    public profileService: ProfileService,
    private basicCredentialService: BasicCredentialsService,
    private globalIntentService: GlobalIntentService,
    private authService: AuthService
  ) {
    this.init();
  }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state.credentialId) {
      this.credentialId = navigation.extras.state.credentialId;

      let didString = this.didService.getActiveDid().getDIDString();
      this.onlineDIDDocumentStatusSub = this.didSyncService.onlineDIDDocumentsStatus.get(didString).subscribe((document) => {
        void this.selectCredential();
      });
    }

    this.didchangedSubscription = this.events.subscribe("did:didchanged", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.documentChangedSubscription = this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {
      Logger.log('Identity', "Publish avatar?", publishAvatar);
      // When the did document content changes, we rebuild our profile entries on screen.
      this.init(publishAvatar);
    });

    this.credentialaddedSubscription = this.events.subscribe("did:credentialadded", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.promptpublishdidSubscription = this.events.subscribe("did:promptpublishdid", () => {
      this.zone.run(() => {
        void this.profileService.showWarning("publishIdentity", null);
      });
    });
  }

  unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.unsubscribe(this.didchangedSubscription);
    this.unsubscribe(this.publicationstatusSubscription);
    this.unsubscribe(this.documentChangedSubscription);
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.promptpublishdidSubscription);
    this.unsubscribe(this.onlineDIDDocumentStatusSub);
  }

  init(publishAvatar?: boolean) {
    let identity = this.didService.getActiveDid();
    if (identity) {
      this.credentials = identity.credentials;

      this.profileService.getAvatarDataUrl().subscribe(avatarDataUrl => {
        this.avatarImg = avatarDataUrl;
      });
    }
  }

  async ionViewWillEnter() {
    await this.getIssuer();
    this.displayableProperties = this.getDisplayableProperties();
    this.titleBar.setTitle(this.translate.instant('identity.credentialdetails-title'));
  }

  ionViewWillLeave() {
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();

    Logger.log('Identity',
      "Credential details ionViewDidEnter did: " + this.profileService.didString
    );

    /* if (this.isApp()) {
      this.getAppIcon();
    } */
  }

  async selectCredential() {
    Logger.log("identity", "Computing credential status");

    this.credential = null;
    this.issuer = null;
    this.segment = "validator";

    if (
      isNil(this.credentialId) ||
      isNil(this.credentials) ||
      this.credentials.length <= 0
    ) {
      return;
    }

    let selected = this.credentials.filter(
      (item) => item.pluginVerifiableCredential.getId() == this.credentialId
    );

    if (selected.length > 0) this.credential = selected[0];

    if (this.credential == null) { return; }

    await this.getIssuer();

    //await this.isLocalCredSyncOnChain();
    this.hasCheckedCredential = true;
  }

  async getIssuer() {
    let issuerDid = this.credential.pluginVerifiableCredential.getIssuer();
    //issuerDid = "did:elastos:ibXZJqeN19iTpvNvqo5vU9XH4PEGKhgS6d";
    if (isNil(issuerDid) || issuerDid == "") return;

    this.issuer = await this.profileService.getIssuerDisplayEntryFromID(
      issuerDid
    );
  }

  getDisplayableCredentialTitle(): string {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let translationKey = "identity.credential-info-type-" + fragment;
    let translated = this.translate.instant(translationKey);

    if (!translated || translated == "" || translated == translationKey)
      return fragment;

    return translated;
  }

  getDisplayableProperties() {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    if (fragment === "avatar") return [];

    let subject = this.credential.pluginVerifiableCredential.getSubject();
    return Object.keys(subject)
      .filter((key) => key != "id")
      .sort()
      .map((prop) => {
        return {
          name: prop,
          value:
            subject[prop] != ""
              ? subject[prop]
              : this.translate.instant("identity.not-set"),
        };
      });
  }

  isAvatarCred(): boolean {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    if (fragment === "avatar") {
      return true;
    } else {
      return false;
    }
  }

  getAvatar(): string {
    return this.avatarImg || transparentPixelIconDataUrl(); // Transparent pixel while loading
  }

  hasIssuerName() {
    return this.issuer.name !== null && this.issuer.name !== "";
  }

  isVerified() {
    let types = this.credential.pluginVerifiableCredential.getTypes();
    return !types.includes("SelfProclaimedCredential");
  }

  getCredIconSrc(entry: CredentialDisplayEntry): string {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();

    if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
      fragment = "finger-print";
    }

    let skin = this.theme.darkMode ? "dark" : "light";
    return this.isVerified() ? `/assets/identity/headerIcons/${skin}/${fragment}-verified.svg` : `/assets/identity/headerIcons/${skin}/${fragment}.svg`;
  }

  getSmallIcon(iconName: string) {
    return this.theme.darkMode ? `/assets/identity/smallIcons/dark/${iconName}.svg` : `/assets/identity/smallIcons/light/${iconName}.svg`
  }

  getCredIcon(): string {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    switch (fragment) {
      case "avatar":
        return "image";
      case "wechat":
        return "logo-whatsapp";
      case "instagram":
        return "logo-instagram";
      case "facebook":
        return "logo-facebook";
      case "snapchat":
        return "logo-snapchat";
      case "twitter":
        return "logo-twitter";
      case "email":
        return "mail";
      case "birthDate":
        return "calendar";
      case "nation":
        return "flag";
      case "gender":
        return "transgender";
      case "telephone":
        return "call";
      case "nickname":
        return "glasses";
      case "birthPlace":
        return "globe";
      case "occupation":
        return "briefcase";
      case "education":
        return "school";
      case "interests":
        return "football";
      case "description":
        return "book";
      case "url":
        return "link";
      case "telegram":
        return "send";
      case "tiktok":
        return "logo-tiktok";
      case "twitch":
        return "logo-twitch";
      case "venmo":
        return "logo-venmo";
      case "paypal":
        return "logo-paypal";
      case "elaAddress":
        return "wallet";
      default:
        return "finger-print";
    }
  }

  transformDate(date): string {
    return moment(date).format("DD, MMMM YYYY");
  }

  getIssuanceDate(): string {
    return this.transformDate(
      this.credential.pluginVerifiableCredential.getIssuanceDate()
    );
  }

  getExpirationDate(): string {
    return this.transformDate(
      this.credential.pluginVerifiableCredential.getExpirationDate()
    );
  }

  issuerSegmentChanged(ev: any) {
    this.segment = ev.detail.value;
  }

  /******************** Display Data Sync Status between Local and Onchain ********************/
  getLocalCredByProperty(property: string): string {
    const credHasProp = (property in this.credential.pluginVerifiableCredential.getSubject());
    if (credHasProp)
      return this.credential.pluginVerifiableCredential.getSubject()[property];

    return null;
  }

  getOnChainCredByProperty(property: string): string {
    const chainValue = this.currentOnChainDIDDocument
      .getCredentials()
      .filter((c) => {
        if (property in c.getSubject()) {
          return c;
        }
      });

    return chainValue.length ? chainValue[0].getSubject()[property] : null;
  }

  /* async isLocalCredSyncOnChain() {
    let didString = this.didService.getActiveDid().getDIDString();
    this.currentOnChainDIDDocument = await this.didSyncService.onlineDIDDocumentsStatus.get(didString).value.document;
    if (this.currentOnChainDIDDocument === null) {
      this.isCredentialInLocalDocument = false;
      return false;
    }

    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let localValue = this.credential.pluginVerifiableCredential.getSubject()[fragment];

    let chainValue = this.currentOnChainDIDDocument.getCredentialById(new DIDURL("#" + fragment));
    if (!chainValue) {
      this.isCredentialInLocalDocument = false;
      return false;
    }

    if (!localValue) {
      // handle external credentials
      this.isCredentialInLocalDocument = true;
      return;
    }

    chainValue = chainValue.getSubject()[fragment];

    if (typeof localValue === "object" || typeof chainValue === "object") {
      //avatar
      this.isCredentialInLocalDocument = JSON.stringify(localValue) === JSON.stringify(chainValue);
      return;
    }

    Logger.log('Identity', 'Local ' + localValue + " ; Chain " + chainValue);
    this.isCredentialInLocalDocument = localValue === chainValue;
  } */

  public isCredentialInLocalDIDDocument(): boolean {
    if (!this.credential)
      return false;

    return this.profileService.credentialIsInLocalDIDDocument(this.credential.pluginVerifiableCredential);
  }

  async publishCredential(): Promise<void> {
    await this.authService.checkPasswordThenExecute(
      async () => {
        // Make the credential visible in the did document
        await this.profileService.setCredentialVisibility(this.credential.pluginVerifiableCredential.getFragment(), true, this.authService.getCurrentUserPassword());

        // Show the publish prompt
        void this.profileService.showWarning("publishVisibility", "");
      },
      () => {
      }
    );
  }

  verifyCredential() {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let localValue = this.credential.pluginVerifiableCredential.getSubject()[
      fragment
    ];

    let claimsObject = {
      id: this.didService.getActiveDid().getDIDString(),
    };

    claimsObject[fragment] = localValue;

    void this.globalIntentService.sendIntent(
      "https://did.elastos.net/credverify",
      {
        claims: claimsObject,
      }
    );
  }
}
