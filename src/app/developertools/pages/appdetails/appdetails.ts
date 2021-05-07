import { Component, NgZone, ViewChild } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { DAppService } from '../../services/dapp.service';
import { StorageDApp } from '../../model/storagedapp.model';
import { ActivatedRoute, Router } from '@angular/router';
import { DIDHelper } from '../../helpers/did.helper';
import { DIDSession } from '../../model/didsession.model';
import { DeleteComponent } from '../../components/delete/delete.component';
import { IdentityService } from '../../services/identity.service';
import { HiveService } from '../../services/hive.service';
import { PopupService } from '../../services/popup.service';;
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarForegroundMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { App } from "src/app/model/app.enum"

// TODO: When opening the screen we could fetch the existing app on chain and display its info.

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
  passwordToggle: string = 'eye';
  appDIDDocumentStatusWasChecked = false; // Whether the App DID document has been checked on chain or not yet
  appDIDDocument: DIDPlugin.DIDDocument = null;
  developerDIDDocument: DIDPlugin.DIDDocument = null;
  trinityPubStatusWasChecked = false; // Whether the Elastos Essentials application publication status was checked
  signedInUserDID: string = null;

  public base64iconPath: string = null;

  public nativeRedirectUrl: string = "";
  public nativeCustomScheme: string = "";
  public nativeCallbackUrl: string = "";

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
    this.titleBar.setBackgroundColor("#181d20");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, {
      key: "appdetails-back",
      iconPath: BuiltInIcon.BACK
    });

    this.titleBarIconClickedListener = (clickedIcon) => {
      switch (clickedIcon.key) {
        case "appdetails-back":
          this.nav.navigateBack();
          break;
      }
    }
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener);

    this.signedInUserDID = GlobalDIDSessionsService.signedInDIDString;

    // Unlock the DID store and load did data
    await this.checkDIDPassword();

    await this.didSession.synchronizeDIDDocument();

    await this.downloadAppIconFromDeveloperHive();
    await this.checkAppIdentityStatus();
  }

  ionViewWillLeave() {
    this.titleBar.setIcon(TitleBarIconSlot.INNER_LEFT, null);
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private async checkAppIdentityStatus() {
    Logger.log("developertools", "Checking if the application DID is on chain or not");

    this.appDIDDocumentStatusWasChecked = false;
    this.appDIDDocument = await this.identityService.getAppIdentityOnChain(this.didSession.did.getDIDString());
    this.developerDIDDocument = await this.identityService.getDeveloperIdentityOnChain(this.getOnChainAppDeveloperDID());
    this.appDIDDocumentStatusWasChecked = true;

    if (this.appDIDDocument) {
      Logger.log("developertools", "App DID is on chain");

      this.nativeRedirectUrl = this.getOnChainNativeRedirectUrl();
      this.nativeCallbackUrl = this.getOnChainNativeCallbackUrl();
      this.nativeCustomScheme = this.getOnChainNativeCustomScheme();
    }
    else
      Logger.log("developertools", "App DID is NOT on chain");
  }

  publishAppIdentity() {
    // TODO - disable button when publishing - show spinner
    this.identityService.publishAppIdentity(this.didSession, this.nativeRedirectUrl, this.nativeCallbackUrl, this.nativeCustomScheme);
  }

  publishAppToElastos() {
    this.nav.navigateTo(
      App.DEVELOPER_TOOLS,
      "/developertools/publishapptrinity",
      {
        state: {
          "app": this.app,
          "didsession": this.didSession
        }
      }
    );
  }

  public isAppIdentityPublished(): boolean {
    return this.appDIDDocumentStatusWasChecked && this.appDIDDocument != null
  }

  private getOnChainNativeRedirectUrl(): string {
    if (!this.appDIDDocument)
      return "";

    let credential = this.appDIDDocument.getCredential("#native");
    if (!credential)
      return "";

    return credential.getSubject()["redirectUrl"] || "";
  }

  private getOnChainNativeCustomScheme(): string {
    if (!this.appDIDDocument)
      return "";

    let credential = this.appDIDDocument.getCredential("#native");
    if (!credential)
      return "";

    return credential.getSubject()["customScheme"] || "";
  }

  private getOnChainNativeCallbackUrl(): string {
    if (!this.appDIDDocument)
      return "";

    let credential = this.appDIDDocument.getCredential("#native");
    if (!credential)
      return "";

    return credential.getSubject()["callbackUrl"] || "";
  }

  public getOnChainAppDeveloperDID(): string {
    if (!this.appDIDDocument)
      return null;

    let credential = this.appDIDDocument.getCredential("#developer");
    if (!credential)
      return null;

    return credential.getSubject()["did"];
  }

  public chainDeveloperDIDMatchesLocalDID(): boolean {
    return this.signedInUserDID == this.getOnChainAppDeveloperDID();
  }

  public chainRedirectURLMatchesLocalRedirectURL(): boolean {
    return this.nativeRedirectUrl == this.getOnChainNativeRedirectUrl();
  }

  public chainCustomSchemeMatchesLocalCustomScheme(): boolean {
    return this.nativeCustomScheme == this.getOnChainNativeCustomScheme();
  }

  public chainCallbackURLMatchesLocalCallbackURL(): boolean {
    return this.nativeCallbackUrl == this.getOnChainNativeCallbackUrl();
  }

  public appIdentityNeedsToBePublished(): boolean {
    return !this.isAppIdentityPublished() ||
      !this.chainDeveloperDIDMatchesLocalDID() ||
      !this.chainCallbackURLMatchesLocalCallbackURL() ||
      !this.chainRedirectURLMatchesLocalRedirectURL() ||
      !this.chainCustomSchemeMatchesLocalCustomScheme();
  }

  // Try to open the DID store and extract the mnemonic info which will be needed next.
  async checkDIDPassword() {
    Logger.log("developertools", "Checking DID password.");

    let storePassword = await this.dAppService.getStorePassword(this.app.didStoreId);

    try {
      this.didSession = await DIDSession.create(this.app.didStoreId, this.app.didString, storePassword);

      this.didStorePasswordIsValid = true;
    }
    catch (err) {
      let ex = DIDHelper.reworkedDIDPluginException(err)
      Logger.error("developertools", ex);
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
    return await popover.present();
  }

  public async copyAppDIDToClipboard() {
    this.native.copyClipboard(this.app.didString);
    this.native.genericToast('developertools.app-did-copied', 2000, 'dark');
  }

  public async downloadAppIconFromDeveloperHive() {
    let vault = await this.hiveService.getDeveloperVault();
    let filePath = this.didSession.didString + "/" + "appicon.png";

    try {
      let reader = await vault.getFiles().download(filePath);
      if (!reader) {
        Logger.log("developertools", "Failed to get reader");
      }
      else {
        let fileParts: ArrayBuffer[] = [];
        let readContent: Uint8Array = null;
        const BYTES_TO_READ = 40000;
        while (true) {
          readContent = await reader.read(BYTES_TO_READ);
          if (readContent && readContent.byteLength > 0) {
            fileParts.push(readContent);
          }
          else
            break; // No more content to read, stop looping.
        }
        let fileContent = new Blob(fileParts);
        await reader.close();

        if (fileContent) {
          Logger.log("developertools", "Got the whole file content");

          this.base64iconPath = await new Promise((resolve)=>{
            var fileReader = new FileReader();
            fileReader.onload = function(event){
              var base64 = event.target["result"];
              resolve(base64 as string);
            };
            fileReader.readAsDataURL(fileContent);
          });

          Logger.log("developertools", "base64iconPath", this.base64iconPath);
        }
        else {
          Logger.log("developertools", "Invalid fileContent or no fileContent.text() available", fileContent);
        }
      }
    }
    catch (e) {
      Logger.warn("developertools", e);
      Logger.warn("developertools", "Failure during file download (not found?): " + e);
    }
  }

  public getAppIcon(): string {
    return this.base64iconPath || "assets/developertools/images/logo.png";
  }

  /**
   * Lets user pick a picture from his gallery. The picture is uploaded to the developer's hive vault
   * as the application icon.
   */
  public selectAndUploadAppIconFromLibrary() {
    navigator.camera.getPicture((data) => {
      Logger.log("developertools", "Got gallery data");
      if (data) {
        this.zone.run(async () => {
          try {
            let rawData = Buffer.from(data, 'base64');
            await this.uploadAppIconToHive(rawData);

            // Free the memory
            navigator.camera.cleanup(() => { }, (err) => { });
          }
          catch (e) {
            //this.alertNoScannedContent('sorry', 'scan-err');
            Logger.log("developertools", "Error while loading the picture as PNG:", e);
          }
        });
      }
      else {
        Logger.log("developertools", "No picture picked?");
      }
    }
      , (err) => {
        //this.alertNoScannedContent('sorry', 'gallery-err');
        Logger.log("developertools", err);
      }, {
      targetWidth: 512, // Reduce picture size to avoid memory problems - keep it large enough for QR code readabilitiy
      targetHeight: 512,
      destinationType: 0, // Return as base64 data string
      sourceType: 0, // Pick from photo library
      encodingType: 1 // Return as PNG base64 data
    });
  }

  private async uploadAppIconToHive(rawData: Uint8Array) {
    await this.popup.showLoading("developertools.uploading-icon");

    try {
      let vault = await this.hiveService.getDeveloperVault();
      let filePath = this.didSession.didString + "/" + "appicon.png";

      Logger.log("developertools", "Starting to upload app icon to the developer's hive vault at path: " + filePath);

      let writer = await vault.getFiles().upload(filePath);
      if (!writer) {
        Logger.error("developertools", "Failed to get writer");
      }
      else {
        await writer.write(rawData);
        await writer.flush();
        await writer.close();

        Logger.log("developertools", "Binary file upload completed");
      }
    }
    catch (e) {
      Logger.error("developertools", e);
      Logger.log("developertools", "Exception while uploading the application icon: " + e);
    }

    await this.popup.hideLoading();
  }
}
