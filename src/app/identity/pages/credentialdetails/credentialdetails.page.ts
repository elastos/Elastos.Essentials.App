import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ActionSheetController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { Profile } from "../../model/profile.model";
import { DIDURL } from "../../model/didurl.model";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { HiveService } from "../../services/hive.service";
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


type ProfileDisplayEntry = {
  credentialId: string; // related credential id
  label: string; // "title" to display
  value: string; // value to display
  willingToBePubliclyVisible?: boolean; // Whether it's currently set to become published or not.
};

type IssuerDisplayEntry = {
  did: string;
  name: string;
  avatar: string;
};

type DisplayProperty = {
  name: string;
  value: string;
};

type CredentialDisplayEntry = {
  credential: DIDPlugin.VerifiableCredential;
  issuer: string;
  willingToBePubliclyVisible: boolean;
  willingToDelete: boolean;
  canDelete: boolean;
};

@Component({
  selector: "credentialdetails-profile",
  templateUrl: "credentialdetails.page.html",
  styleUrls: ["credentialdetails.page.scss"],
})
export class CredentialDetailsPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public profile: Profile;
  public credentials: VerifiableCredential[];
  public currentOnChainDIDDocument: DIDDocument = null;
  public credential: VerifiableCredential;
  public issuer: IssuerDisplayEntry;

  public segment = "validator";
  public credentialId: string = null;
  public appIcon: string;

  public isPublished = true;
  public isVisible = false;
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
    public hiveService: HiveService,
    public actionSheetController: ActionSheetController,
    public profileService: ProfileService,
    private basicCredentialService: BasicCredentialsService,
    private globalIntentService: GlobalIntentService
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
      this.profile = identity.getBasicProfile();
      this.credentials = identity.credentials;
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

    if (this.isApp()) {
      this.getAppIcon();
    }
  }

  async selectCredential() {
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

    this.isVisible = this.credentialIsVisibleOnChain();

    await this.isLocalCredSyncOnChain();
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
  avatarImg = "";

  getAvatar(): string {
    if (this.avatarImg == "") {
      let subject = this.credential.pluginVerifiableCredential.getSubject();
      let avatar = subject["avatar"];
      this.avatarImg = `data:${avatar["content-type"]};${avatar["type"]},${avatar["data"]}`;
    }
    return this.avatarImg;
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

  getAppIcon() {
    this.http
      .get<any>(
        "https://dapp-store.elastos.org/apps/" +
        this.credential.pluginVerifiableCredential.getSubject().apppackage +
        "/manifest"
      )
      .subscribe(
        (manifest: any) => {
          Logger.log('Identity', "Got app!", manifest);
          void this.zone.run(() => {
            let iconUrl = "https://dapp-store.elastos.org/apps/" + manifest.id + "/icon";
            //Logger.log('Identity', iconUrl);
            this.appIcon = iconUrl;

          })
        }, (error: any) => {
          let skin = this.theme.darkMode ? "dark" : "light";
          this.appIcon = `../../../assets/identity/headerIcons/${skin}/finger-print.svg`;
        });
  }

  isApp() {
    return "apppackage" in this.credential.pluginVerifiableCredential.getSubject();
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

  /**
   * Tells if a given credential is currently visible on chain or not (inside the DID document or not).
   */
  credentialIsVisibleOnChain() {
    let currentDidDocument = this.didService.getActiveDid().getDIDDocument();
    if (!currentDidDocument) return false;

    let didDocumentCredential = currentDidDocument.getCredentialById(
      new DIDURL(this.credential.pluginVerifiableCredential.getId())
    );
    return didDocumentCredential != null;
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

  async isLocalCredSyncOnChain() {
    let didString = this.didService.getActiveDid().getDIDString();
    this.currentOnChainDIDDocument = await this.didSyncService.onlineDIDDocumentsStatus.get(didString).value.document;
    if (this.currentOnChainDIDDocument === null) {
      this.isPublished = false;
      return false;
    }

    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let localValue = this.credential.pluginVerifiableCredential.getSubject()[fragment];

    let chainValue = this.currentOnChainDIDDocument.getCredentialById(new DIDURL("#" + fragment));
    if (!chainValue) {
      this.isPublished = false;
      return false;
    }

    if (!localValue) {
      //handling capsules credential
      localValue = this.getLocalCredByProperty("apppackage");
      if (localValue) {
        let apppackage = chainValue.getSubject().apppackage;
        this.isPublished = localValue === apppackage;
        return;
      }
      else {
        // handle external credentials
        this.isPublished = true;
        return;
      }
    }

    chainValue = chainValue.getSubject()[fragment];

    if (typeof localValue === "object" || typeof chainValue === "object") {
      //avatar
      this.isPublished = JSON.stringify(localValue) === JSON.stringify(chainValue);
      return;
    }

    Logger.log('Identity', 'Local ' + localValue + " ; Chain " + chainValue);
    this.isPublished = localValue === chainValue;
  }

  publishCredential() {
    // Make the credential visible in the did document
    this.profileService.setCredentialVisibility(this.credential.pluginVerifiableCredential.getFragment(), true);
    this.profileService.updateDIDDocument();

    // Show the publish prompt
    void this.profileService.showWarning("publishVisibility", "");
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
