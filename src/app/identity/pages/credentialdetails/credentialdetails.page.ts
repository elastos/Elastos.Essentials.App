import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  ActionSheetController
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { Profile } from "../../model/profile.model";
import { DIDURL } from "../../model/didurl.model";
import { DIDPublicationStatusEvent } from "../../model/eventtypes.model";
import { UXService } from "../../services/ux.service";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { HiveService } from "../../services/hive.service";
import { HttpClient } from "@angular/common/http";
import { Native } from "../../services/native";
import * as moment from "moment";
import { DIDDocument } from "../../model/diddocument.model";
import { BasicCredentialsService } from '../../services/basiccredentials.service';
import { Events } from "../../services/events.service";
import { Subscription } from "rxjs";
import { isNullOrUndefined } from "lodash";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { TitleBarNavigationMode } from "src/app/components/titlebar/titlebar.types";
import { TemporaryAppManagerPlugin } from "src/app/TMP_STUBS";

declare let appManager: AppManagerPlugin.AppManager;

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

  public hasCredential: boolean = false;
  public creatingIdentity: boolean = false;

  public fetchingApps = false;

  public segment: string = "validator";

  public currentOnChainDIDDocument: DIDDocument = null;

  public credentialId: string = null;

  public isPublished: boolean = true;

  public isVisible: boolean = false;

  public hasCheckedCredentia: boolean = false;

  public credential: VerifiableCredential;

  public issuer: IssuerDisplayEntry;

  public appIcon: string;

  private didchangedSubscription: Subscription = null;
  private publicationstatusSubscription: Subscription = null;
  private documentChangedSubscription: Subscription = null;
  private credentialaddedSubscription: Subscription = null;
  private promptpublishdidSubscription: Subscription = null;

  constructor(
    private http: HttpClient,
    public events: Events,
    public route: ActivatedRoute,
    private router: Router,
    public zone: NgZone,
    private translate: TranslateService,
    private didService: DIDService,
    private didSyncService: DIDSyncService,
    private uxService: UXService,
    private native: Native,
    public theme: GlobalThemeService,
    public hiveService: HiveService,
    public actionSheetController: ActionSheetController,
    public profileService: ProfileService,
    private basicCredentialService: BasicCredentialsService,
    private appManager: TemporaryAppManagerPlugin
  ) {
    this.init();
  }

  async ngOnInit() {
    const navigation = this.router.getCurrentNavigation();


    if (navigation.extras.state.credentialId) {
      this.credentialId = navigation.extras.state.credentialId;

      await this.selectCredential();
    }

    this.didchangedSubscription = this.events.subscribe("did:didchanged", () => {
      this.zone.run(() => {
        this.init();
      });
    });

    this.publicationstatusSubscription = this.events.subscribe(
      "did:publicationstatus",
      (status: DIDPublicationStatusEvent) => {
        let activeDid = this.didService.getActiveDid();
        if (activeDid && activeDid === status.did)
          this.profileService.didNeedsToBePublished = status.shouldPublish;
      }
    );

    this.documentChangedSubscription = this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {
      console.log("Publish avatar?", publishAvatar);
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
        this.profileService.showWarning("publishIdentity", null);
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
    this.unsubscribe(this.publicationstatusSubscription);
    this.unsubscribe(this.documentChangedSubscription);
    this.unsubscribe(this.credentialaddedSubscription);
    this.unsubscribe(this.promptpublishdidSubscription);
  }

  init(publishAvatar?: boolean) {
    let identity = this.didService.getActiveDid();
    if (identity) {
      this.profile = identity.getBasicProfile();
      this.credentials = identity.credentials;
    }
  }

  ionViewWillEnter() {
    this.uxService.makeAppVisible();
    this.uxService.setTitleBarBackKeyShown(true);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.BACK);

    this.getIssuer();

  }
  ionViewWillLeave() {
    this.uxService.setTitleBarBackKeyShown(false);
  }

  ionViewDidEnter() {
    let identity = this.didService.getActiveDid();
    this.profileService.didString = identity.getDIDString();

    console.log(
      "Credential details ionViewDidEnter did: " + this.profileService.didString
    );

    if (this.isApp()) {
      this.getAppIcon();
      console.log(this.appIcon);
    }
  }

  async selectCredential() {
    console.log("select");
    this.credential = null;
    this.issuer = null;
    this.segment = "validator";

    if (
      isNullOrUndefined(this.credentialId) ||
      isNullOrUndefined(this.credentials) ||
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
    this.hasCheckedCredentia = true;
  }

  async getIssuer() {

    let issuerDid = this.credential.pluginVerifiableCredential.getIssuer();
    //issuerDid = "did:elastos:ibXZJqeN19iTpvNvqo5vU9XH4PEGKhgS6d";
    if (isNullOrUndefined(issuerDid) || issuerDid == "") return;

    this.issuer = await this.profileService.getIssuerDisplayEntryFromID(
      issuerDid
    );
  }



  getDisplayableCredentialTitle(): string {
    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let translationKey = "credential-info-type-" + fragment;
    let translated = this.translate.instant(translationKey);

    if (!translated || translated == "" || translated == translationKey)
      return fragment;

    return translated;
  }

  displayableProperties() {
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
              : this.translate.instant("not-set"),
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
    return this.isVerified() ? `/assets/headerIcons/${skin}/${fragment}-verified.svg` : `/assets/headerIcons/${skin}/${fragment}.svg`;
  }

  getSmallIcon(iconName: string) {
    return this.theme.darkMode ? `/assets/smallIcons/dark/${iconName}.svg` : `/assets/smallIcons/light/${iconName}.svg`
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
          console.log("Got app!", manifest);
          this.zone.run(async () => {
            let iconUrl = "https://dapp-store.elastos.org/apps/" + manifest.id + "/icon";
            //console.log(iconUrl);
            this.appIcon = iconUrl;

          })
        }, (error: any) => {
          let skin = this.theme.darkMode ? "dark" : "light";
          this.appIcon = `../../../assets/headerIcons/${skin}/finger-print.svg`;
        });
  }


  isApp() {
    return this.credential.pluginVerifiableCredential
      .getSubject()
      .hasOwnProperty("apppackage");
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
    const credHasProp = this.credential.pluginVerifiableCredential
      .getSubject()
      .hasOwnProperty(property);

    if (credHasProp)
      return this.credential.pluginVerifiableCredential.getSubject()[property];

    return null;
  }

  getOnChainCredByProperty(property: string): string {
    const chainValue = this.currentOnChainDIDDocument
      .getCredentials()
      .filter((c) => {
        if (c.getSubject().hasOwnProperty(property)) {
          return c;
        }
      });

    return chainValue.length ? chainValue[0].getSubject()[property] : null;
  }

  async isLocalCredSyncOnChain() {

    let didString = this.didService.getActiveDid().getDIDString();
    console.log('didstring ' + didString);
    this.currentOnChainDIDDocument = await this.didSyncService.getDIDDocumentFromDID(didString);
    console.log("0");
    if (this.currentOnChainDIDDocument === null) {
      console.log("1");
      this.isPublished = false;
      return false;
    }

    let fragment = this.credential.pluginVerifiableCredential.getFragment();
    let localValue = this.credential.pluginVerifiableCredential.getSubject()[fragment];

    let chainValue = this.currentOnChainDIDDocument.getCredentialById(new DIDURL("#" + fragment));
    if (!chainValue) {
      console.log("1");
      this.isPublished = false;
      return false;
    }

    if (!localValue) {
      //handling capsules credential
      localValue = this.getLocalCredByProperty("apppackage");
      if (localValue) {
        let apppackage = chainValue.getSubject().apppackage;
        this.isPublished = localValue === apppackage;
        console.log("3");
        return;
      }
      else {
        // handle external credentials
        this.isPublished = true;
        console.log("3.5");
        return;
      }
    }

    chainValue = chainValue.getSubject()[fragment];

    if (typeof localValue === "object" || typeof chainValue === "object") {
      //avatar
      this.isPublished = JSON.stringify(localValue) === JSON.stringify(chainValue);
      console.log("4");
      return;
    }

    console.log('Local ' + localValue + " ; Chain " + chainValue);
    console.log("5");
    this.isPublished = localValue === chainValue;
  }

  async presentActionSheet() {
    await this.native.showActionSheet([
      {
        title: this.translate.instant("publish"),
        description: this.translate.instant("publish-description"),
        icon: "publish",
        action: () => {
          console.log("publish clicked");
          this.profileService.showWarning("publishIdentity", "");
        },
      },
      {
        title: this.translate.instant("edit"),
        description: this.translate.instant("edit-description"),
        icon: "edit",
        action: () => {
          console.log("edit clicked");
          this.profileService.editProfile();
        },
      },
    ]);
  }

  publishCredential() {
    this.profileService.showWarning("publishVisibility", "");
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

    appManager.sendIntent(
      "https://did.elastos.net/credverify",
      {
        claims: claimsObject,
      }
    );
  }
}
