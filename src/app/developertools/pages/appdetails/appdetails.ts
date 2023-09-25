import { Component, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AggregatedExecutable, FileDownloadExecutable } from '@elastosfoundation/hive-js-sdk';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { DIDHelper } from 'src/app/helpers/did.helper';
import { pictureMimeType, rawImageToBase64DataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { ApplicationDIDInfo, GlobalApplicationDidService } from 'src/app/services/global.applicationdid.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DeleteComponent } from '../../components/delete/delete.component';
import { DIDSession } from '../../model/didsession.model';
import { StorageDApp } from '../../model/storagedapp.model';
import { DAppService } from '../../services/dapp.service';
import { HiveService } from '../../services/hive.service';
import { IdentityService } from '../../services/identity.service';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'page-appdetails',
  templateUrl: 'appdetails.html',
  styleUrls: ['appdetails.scss']
})
export class AppDetailsPage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  app: StorageDApp = null;
  didSession: DIDSession = null;

  didStorePasswordIsValid = false;
  showPassword = false;
  passwordToggle = 'eye';
  appDIDDocumentStatusWasChecked = false; // Whether the App DID document has been checked on chain or not yet
  private publishedAppInfo: ApplicationDIDInfo = null;
  developerDIDDocument: DIDPlugin.DIDDocument = null;
  signedInUserDID: string = null;
  public publishingDid = false;
  public fetchingIcon = false;
  public uploadingIcon = false;

  public base64iconPath: string = null;

  public appName = "";
  private appIconUrl = null;
  public nativeRedirectUrl = "";
  public nativeCustomScheme = "";
  public nativeCallbackUrl = "";

  public appIdentityHelpMessage = "developertools.appIdentityHelpMessage";
  public nativeRedirectUrlHelpMessage = "developertools.nativeRedirectUrlHelpMessage";
  public nativeCustomSchemeHelpMessage = "developertools.nativeCustomSchemeHelpMessage";
  public nativeCallbackUrlHelpMessage = "developertools.nativeCallbackUrlHelpMessage";

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public dAppService: DAppService,
    public route: ActivatedRoute,
    private router: Router,
    private popoverController: PopoverController,
    private identityService: IdentityService,
    private zone: NgZone,
    private hiveService: HiveService,
    private popup: PopupService,
    public theme: GlobalThemeService,
    private native: GlobalNativeService,
    private nav: GlobalNavService,
    public translate: TranslateService,
    private globalApplicationDidService: GlobalApplicationDidService,
    private globalHiveService: GlobalHiveService,
    private globalNavService: GlobalNavService
  ) {
    route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras.state) {
        this.app = this.router.getCurrentNavigation().extras.state.app;
      }
    });
  }

  async ionViewWillEnter() {
    // Update system status bar every time we re-enter this screen.
    this.titleBar.setTitle(this.translate.instant('developertools.manage-app'));
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: "appdetails-back",
      iconPath: BuiltInIcon.BACK
    });

    this.titleBarIconClickedListener = (clickedIcon) => {
      switch (clickedIcon.key) {
        case "appdetails-back":
          void this.nav.navigateBack();
          break;
      }
    }
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener);

    this.signedInUserDID = DIDSessionsStore.signedInDIDString;

    // Unlock the DID store and load did data
    await this.checkDIDPassword();

    await this.didSession.synchronizeDIDDocument();

    await this.refreshAppIdentityStatus();
  }

  ionViewWillLeave() {
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private async refreshAppIdentityStatus() {
    Logger.log("developertools", "Checking if the application DID is on chain or not");

    this.appDIDDocumentStatusWasChecked = false;

    this.publishedAppInfo = await this.globalApplicationDidService.fetchPublishedAppInfo(this.didSession.did.getDIDString());

    if (this.publishedAppInfo.didDocument) {
      Logger.log("developertools", "App DID is on chain");
      this.developerDIDDocument = await this.identityService.getDeveloperIdentityOnChain(this.getOnChainAppDeveloperDID());

      this.appName = this.publishedAppInfo.name;
      this.appIconUrl = this.publishedAppInfo.iconUrl;
      this.nativeRedirectUrl = this.getOnChainRedirectUrlEndpoint();
      this.nativeCallbackUrl = this.getOnChainCallbackUrlEndpoint();
      this.nativeCustomScheme = this.getOnChainCustomSchemeEndpoint();

      // Fetch, don't wait
      void this.fetchAppIcon();
    }
    else {
      Logger.log("developertools", "App DID is NOT on chain");

      this.appName = this.app.name;
    }

    this.appDIDDocumentStatusWasChecked = true;
  }

  async publishAppIdentity() {
    if (this.publishingDid)
      return;

    // Must set the app icon
    if (!this.base64iconPath) {
      return this.native.genericToast('developertools.set-app-icon', 2000);
    }

    this.publishingDid = true;
    let publishedSuccessfully = await this.identityService.publishAppIdentity(this.didSession, this.appName, this.appIconUrl, this.nativeRedirectUrl, this.nativeCallbackUrl, this.nativeCustomScheme);
    this.publishingDid = false;

    if (publishedSuccessfully) {
      // Update the dapp info on disk in case the name was changed
      this.app.name = this.appName;
      await this.dAppService.updateDapp(this.app);

      // Refresh all data
      await this.refreshAppIdentityStatus();
    }
  }

  public isAppIdentityPublished(): boolean {
    return this.appDIDDocumentStatusWasChecked && this.publishedAppInfo != null
  }

  private getOnChainRedirectUrlEndpoint(): string {
    return this.getOnChainEndpoint("redirectUrl");
  }

  private getOnChainCustomSchemeEndpoint(): string {
    return this.getOnChainEndpoint("customScheme");
  }

  private getOnChainCallbackUrlEndpoint(): string {
    return this.getOnChainEndpoint("callbackUrl");
  }

  private getOnChainEndpoint(endPointName: string): string {
    if (!this.publishedAppInfo || !this.publishedAppInfo.didDocument)
      return "";

    let credential = this.publishedAppInfo.didDocument.getCredential("#appinfo");
    if (!credential)
      return "";

    let subject = credential.getSubject();
    if (!("endpoints" in subject))
      return "";
    else
      return subject["endpoints"][endPointName] || "";
  }

  public getOnChainAppDeveloperDID(): string {
    if (!this.publishedAppInfo || !this.publishedAppInfo.didDocument)
      return null;

    let credential = this.publishedAppInfo.didDocument.getCredential("#appinfo");
    if (!credential)
      return null;

    let subject = credential.getSubject();
    if (!("developer" in subject))
      return "";
    else
      return subject["developer"]["did"] || "";
  }

  public chainDeveloperDIDMatchesLocalDID(): boolean {
    return this.signedInUserDID == this.getOnChainAppDeveloperDID();
  }

  public chainRedirectURLMatchesLocalRedirectURL(): boolean {
    return this.nativeRedirectUrl == this.getOnChainRedirectUrlEndpoint();
  }

  public chainCustomSchemeMatchesLocalCustomScheme(): boolean {
    return this.nativeCustomScheme == this.getOnChainCustomSchemeEndpoint();
  }

  public chainCallbackURLMatchesLocalCallbackURL(): boolean {
    return this.nativeCallbackUrl == this.getOnChainCallbackUrlEndpoint();
  }

  public chainAppNameMatchesLocalAppName(): boolean {
    return this.appName == this.publishedAppInfo.name;
  }

  public chainAppIconMatchesLocalAppIcon(): boolean {
    return this.appIconUrl === this.publishedAppInfo.iconUrl; // TODO CHECK THIS
  }

  public appIdentityNeedsToBePublished(): boolean {
    return !this.isAppIdentityPublished() ||
      !this.chainAppNameMatchesLocalAppName() ||
      !this.chainAppIconMatchesLocalAppIcon() ||
      !this.chainDeveloperDIDMatchesLocalDID() ||
      !this.chainCallbackURLMatchesLocalCallbackURL() ||
      !this.chainRedirectURLMatchesLocalRedirectURL() ||
      !this.chainCustomSchemeMatchesLocalCustomScheme();
  }

  // Try to open the DID store and extract the mnemonic info which will be needed next.
  async checkDIDPassword() {
    Logger.log("developertools", "Checking DID password.");

    try {
      let storePassword = await this.dAppService.getStorePassword(this.app.didStoreId);

      this.didSession = await DIDSession.create(this.app.didStoreId, this.app.didString, storePassword);

      this.didStorePasswordIsValid = true;
    }
    catch (err) {
      let ex = DIDHelper.reworkedPluginException(err)
      Logger.error("developertools", ex);

      void this.nav.navigateBack();
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    if (this.passwordToggle === 'eye') {
      this.passwordToggle = 'eye-off'
    } else {
      this.passwordToggle = 'eye';
    }
  }

  public async deleteApp() {
    const popover = await this.popoverController.create({
      mode: 'ios',
      component: DeleteComponent,
      cssClass: 'developertools-delete-component',
      componentProps: {
        app: this.app
      },
      translucent: false
    });

    // eslint-disable-next-line require-await
    void popover.onDidDismiss().then(async event => {
      if (event && event.data && event.data.delete) {
        // Delete for real
        await this.dAppService.deleteApp(this.app);

        // Forget current screen to not come back here with back key
        this.globalNavService.clearIntermediateRoutes(["/developertools/appdetails"]);

        // Go back to dev home
        void this.router.navigate(['/developertools/home']);
      }
    });

    return await popover.present();
  }

  public async copyAppDIDToClipboard() {
    await this.native.copyClipboard(this.app.didString);
    this.native.genericToast('developertools.app-did-copied', 2000);
  }

  private async fetchAppIcon() {
    if (this.appIconUrl) {
      this.fetchingIcon = true;
      Logger.log("developertools", `Fetching app icon from ${this.appIconUrl}`);
      this.base64iconPath = await this.globalHiveService.fetchHiveScriptPictureToDataUrl(this.appIconUrl);
      Logger.log("developertools", `Got app icon`);
      this.fetchingIcon = false;
    }
  }

  public getAppIcon(): string {
    return this.base64iconPath || "assets/developertools/images/logo.png";
  }

  /**
   * Lets user pick a picture from his gallery. The picture is uploaded to the developer's hive vault
   * as the application icon. Then, a hive script is created to make this picture publicly accessible
   * by everyone.
   */
  public selectAndUploadAppIconFromLibrary() {
    const options: CameraOptions = {
      quality: 90,
      mediaType: 0,
      correctOrientation: true,
      targetWidth: 256, // Reduce picture size to avoid memory problems
      targetHeight: 256,
      destinationType: 0, // Return as base64 data string
      sourceType: 0, // Pick from photo library
      encodingType: 1 // Return as PNG base64 data
    };

    navigator.camera.getPicture((imageData) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.zone.run(async () => {
        if (imageData) {
          let mimeType = await pictureMimeType(imageData);

          if (["image/png", "image/jpg", "image/jpeg"].indexOf(mimeType) < 0) {
            this.native.genericToast('identity.not-a-valid-picture');
            return;
          }

          await this.uploadAppIconToHive(imageData);

          // Free the memory
          navigator.camera.cleanup(() => { }, (err) => { });
        }
      });
    }, ((err) => {
      Logger.error('developertools', err);
    }), options);
  }

  private async uploadAppIconToHive(rawBase64ImageOut: string): Promise<void> {
    this.uploadingIcon = true;

    try {
      // Upload the the picture and create the script to let others get this picture.
      let randomPictureID = new Date().getTime();
      let appIconFileName = "developertools/appicons/" + randomPictureID;
      let avatarData = Buffer.from(rawBase64ImageOut, "base64"); // Raw picture data, not base64 encoded
      let uploadResponse = await this.globalHiveService.getActiveVaultServices().getFilesService().upload(appIconFileName, avatarData);
      Logger.log('developertools', "Completed app icon upload to hive", uploadResponse);

      // Create a script to make this picture available to everyone
      let scriptName = "getAppIcon" + randomPictureID;
      let couldCreateScript = await this.globalHiveService.getActiveVaultServices().getScriptingService().registerScript(scriptName, new AggregatedExecutable(
        "appIconDownload",
        [new FileDownloadExecutable('download', appIconFileName)]
      ), null, true, true);
      Logger.log('developertools', "Could create avatar script?", couldCreateScript);

      let essentialsAppDID = GlobalConfig.ESSENTIALS_APP_DID;
      let avatarHiveURL = "hive://" + DIDSessionsStore.signedInDIDString + "@" + essentialsAppDID + "/" + scriptName + "?params={\"empty\":0}"; // Fake params to prevent hive SDK bug crash
      Logger.log("developertools", "Generated avatar url:", avatarHiveURL);

      // Update UI locally without saving to permanent profile yet.
      this.appIconUrl = avatarHiveURL;
      this.base64iconPath = await rawImageToBase64DataUrl(avatarData);
    }
    catch (e) {
      Logger.error('developertools', 'Failed to upload app icon to hive', e);
      this.native.errToast('developertools.failed-to-upload-picture-to-hive');
    }

    this.uploadingIcon = false;
  }
}
