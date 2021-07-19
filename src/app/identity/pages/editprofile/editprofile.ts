import { Component, NgZone, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { IonInput, ModalController, AlertController } from "@ionic/angular";

import { Native } from "../../services/native";
import { Util } from "../../services/util";
import { DIDService } from "../../services/did.service";
import { AuthService } from "../../services/auth.service";
import { ProfileService } from "../../services/profile.service";

import { area } from "../../../../assets/identity/area/area";

import { BasicCredentialEntry } from "../../model/basiccredentialentry.model";
import { Profile } from "../../model/profile.model";
import { CountryCodeInfo } from "../../model/countrycodeinfo";

import { ProfileEntryPickerPage } from "../profileentrypicker/profileentrypicker";
import { PictureComponent } from "../../components/picture/picture.component";
import { VerifiableCredential } from "../../model/verifiablecredential.model";
import { PopupProvider } from "../../services/popup";
import { DIDURL } from "../../model/didurl.model";
import { Subscription } from "rxjs";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { GlobalThemeService } from "src/app/services/global.theme.service";
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from "src/app/components/titlebar/titlebar.types";
import { Logger } from "src/app/logger";
import { Events } from "src/app/services/events.service";
import { GlobalHiveService } from "src/app/services/global.hive.service";
import { GlobalConfig } from "src/app/config/globalconfig";
import { GlobalHiveCacheService } from "src/app/services/global.hivecache.service";
import { BASE64 } from "src/app/model/base64";
import { rawImageToBase64DataUrl } from "src/app/helpers/picture.helpers";
import { GlobalNativeService } from "src/app/services/global.native.service";

declare const hiveManager: HivePlugin.HiveManager;

@Component({
  selector: "page-editprofile",
  templateUrl: "./editprofile.html",
  styleUrls: ["editprofile.scss"],
})
export class EditProfilePage {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public isEdit = false;
  public profile: Profile;
  public credentials: VerifiableCredential[];
  private showSelectCountry = false;
  public avatarDataUrl: string = null;

  private selectCountrySubscription: Subscription = null;
  private showmenuSubscription: Subscription = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  option: any = {
    header: this.translate.instant("identity.select-gender"),
    cssClass: this.theme.darkMode ? "darkSelect" : "select",
  };

  constructor(
    public router: Router,
    public zone: NgZone,
    public events: Events,
    private didService: DIDService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    public profileService: ProfileService,
    private native: Native,
    private globalNativeService: GlobalNativeService,
    public theme: GlobalThemeService,
    private globalHiveService: GlobalHiveService,
    private hiveCache: GlobalHiveCacheService,
    private popup: PopupProvider)
  {
    Logger.log('Identity', "Entering EditProfile page");
    const navigation = this.router.getCurrentNavigation();
    if (
      !Util.isEmptyObject(navigation.extras.state) &&
      navigation.extras.state["create"] == false
    ) {
      Logger.log('Identity', "Editing an existing profile");

      // Edition - We clone the received profile in case user wants to cancel editing.
      this.profile = Profile.fromProfile(
        //this.didService.getActiveDid().getBasicProfile()

        this.profileService.getBasicProfile()
      );
      this.isEdit = true;
    } else {
      Logger.log('Identity', "Editing a new profile");
      // Creation
      this.profile = Profile.createDefaultProfile();
    }

    this.profileService.getAvatarDataUrl().subscribe(dataUrl => {
      console.log("DEBUG GOT AVATAR DATA URL IN EDIT PROFILE", this.avatarDataUrl)
      this.avatarDataUrl = dataUrl;
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("identity.edit-profile"));
    this.showMenu();
    Logger.log('Identity', this.profile);
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  /*   // Go to the countrypicker screen will trigger ionViewWillLeave
    if (!this.showSelectCountry) {
      this.next(false);
    } */
  }

  onVisibilityChange(e, entry: BasicCredentialEntry) {
    entry.isVisible = e;
    this.profileService.setCredentialVisibility(entry.key, e);
    this.profileService.updateDIDDocument();
  }

  showMenu() {
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "done",
      iconPath: "/assets/identity/icon/check-green.ico",
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (menuIcon) => {
      if (menuIcon.key == "done") {
        void this.next(false);
      }
    });
  }

  /********** For standard texts entry **********/
  entryIsStandardText(entry: BasicCredentialEntry): boolean {
    let specialEntries = [
      "avatar",
      "nation",
      "birthDate",
      "email",
      "gender",
      "telephone",
    ];
    if (!specialEntries.includes(entry.key)) {
      return true;
    } else {
      return false;
    }
  }

  /********** For 'birthDate' entry **********/
  formatBirthDay(entry) {
    entry.value = entry.value.split("T")[0];
  }

  /********** For 'nation' entry **********/
  async selectCountry(countryEntry: BasicCredentialEntry) {
    Logger.log('Identity', "CountryEntry: " + countryEntry.key);
    this.selectCountrySubscription = this.events.subscribe("selectarea", (params: CountryCodeInfo) => {
      Logger.log('Identity', "Country selected: " + params.alpha3);
      this.zone.run(() => {
        countryEntry.value = params.alpha3;
        this.showSelectCountry = false;
      });
      this.selectCountrySubscription.unsubscribe();
    });
    await this.native.go("/identity/countrypicker");
    this.showSelectCountry = true;
  }

  getDisplayableNation(countryAlpha3) {
    let countryInfo = area.find((a: CountryCodeInfo) => {
      return countryAlpha3 == a.alpha3;
    });

    if (!countryInfo) return null;

    return countryInfo.name;
  }

  /********** For 'avatar' entry **********/
  async editAvatar() {
    //Logger.log('Identity', "ENTRIES :", JSON.stringify(this.profile.entries));

    // Ensure hive is ready
    if (!this.globalHiveService.hiveUserVaultCanBeUsed()) {
      void this.globalNativeService.genericAlert('identity.hive-not-ready');
      return;
    }

    PictureComponent.shared.dataUrlImageIn = this.avatarDataUrl;
    const modal = await this.modalCtrl.create({
      component: PictureComponent,
      componentProps: {},
    });
    void modal.onDidDismiss().then(async (params) => {
      Logger.log('Identity', "getPhoto params", params);

      if (params.data && params.data.useImg) {
        // Upload picture to hive
        try {
          Logger.log('Identity', "Starting avatar upload to hive");

          await this.native.showLoading('identity.saving-picture-to-hive');

          // TODO: we probably need to delete older pictures from the vault somewhere...
          // But not that easy because we need to keep both the local and published avatars.

          // Upload the the picture and create the script to let others get this picture.
          let randomPictureID = new Date().getTime();
          let avatarFileName = "identity/avatar/"+randomPictureID;
          let uploader = await this.globalHiveService.getActiveVault().getFiles().upload(avatarFileName);
          let avatarData = Buffer.from(PictureComponent.shared.rawBase64ImageOut, "base64"); // Raw picture data, not base64 encoded
          Logger.log("identity", "Uploaded avatar buffer:", avatarData);
          await uploader.write(avatarData);
          await uploader.flush();
          await uploader.close();
          Logger.log('identity', "Completed avatar upload to hive");

          // Create a script to make this picture available to everyone
          let scriptName = "getMainIdentityAvatar"+randomPictureID;
          let couldCreateScript = await this.globalHiveService.getActiveVault().getScripting().setScript(scriptName, hiveManager.Scripting.Executables.newAggregatedExecutable(
            [hiveManager.Scripting.Executables.Files.newDownloadExecutable(avatarFileName)]
          ), null, true, true);
          Logger.log('identity', "Could create avatar script?", couldCreateScript);

          let currentUserDID = this.didService.getActiveDid().getDIDString();
          let essentialsAppDID = GlobalConfig.ESSENTIALS_APP_DID;
          let avatarHiveURL = "hive://"+currentUserDID+"@"+essentialsAppDID+"/"+scriptName+"?params={empty:0}"; // Fake params to prevent hive SDK bug crash
          Logger.log("identity", "Generated avatar url:", avatarHiveURL);

          // Save the new avatar to the cache
          this.hiveCache.set(currentUserDID+"-avatar", avatarData);

          // Update UI locally without saving to permanent profile yet.
          this.avatarDataUrl = await rawImageToBase64DataUrl(avatarData);

          let entry: BasicCredentialEntry = this.profile.getEntryByKey('avatar');
          let avatar = this.profileService.buildAvatar("image/png", "elastoshive", avatarHiveURL);
          if (entry == null) {
            entry = new BasicCredentialEntry("avatar", null);
            entry.value = avatar;
            this.profile.setValue(entry, entry.value);
          } else {
            entry.value = avatar;
          }

          Logger.log('identity', "New or updated avatar entry:", entry.value);
        }
        catch (e) {
          Logger.error("identity", "Error while saving the avatar", e);
        }

        await this.native.hideLoading();
      }
    });
    await modal.present();
  }

  /**
   * Move text input focus to the given item
   */
  // TODO - REWORK
  maybeMoveFocus(element: IonInput, event: KeyboardEvent) {
    if (event.keyCode == 13) {
      // Return
      void element.setFocus();
    }
  }

  // TODO - REWORK
  maybeClearFocus(element: IonInput, event: KeyboardEvent) {
    if (event.keyCode == 13) {
      // Return
      void element.getInputElement().then((el: HTMLInputElement) => {
        el.blur();
      });
    }
  }

  /********** Submit Entries **********/
  /*  async next(publishAvatar: boolean) {
    if(this.checkParams()){
      // Edition mode - go back to my profile after editing.
      let localDidDocumentHasChanged = false;
      await this.authService.checkPasswordThenExecute(async ()=>{
        Logger.log('Identity', "Password provided and valid. Now saving profile");

        // We are editing an existing DID: just ask the DID to save its profile.
        // DID being created are NOT saved here.
        await this.native.showLoading('loading-msg');
        localDidDocumentHasChanged = await this.didService.getActiveDid().writeProfile(this.profile, AuthService.instance.getCurrentUserPassword())

        this.native.hideLoading();

        // Tell others that DID needs to be refreshed (profile info has changed)
        this.events.publish('did:didchanged');

        if(publishAvatar) {
          this.events.publish('publish:avatar');
        }

        if (localDidDocumentHasChanged) {
          Logger.log('Identity', "Asking user to publish his DID document");

          // DID Document was modified: ask user if he wants to publish his new did document version now or not.
          this.events.publish('diddocument:changed');
          // Prompt publish permissions
          this.profileService.showWarning('publishIdentity', null).then(() => {
            this.navCtrl.pop();
          });
        }
        else {
          // Exit the screen.
          Logger.log('Identity', "Exiting profile edition");
          this.navCtrl.pop();
        }
      }, () => {
        // Operation cancelled
        Logger.log('Identity', "Password operation cancelled");
        this.native.hideLoading();
      });
    }
  } */


  async save() {
    await this.authService.checkPasswordThenExecute(
      async () => {
        Logger.log('Identity', "Password provided and valid. Now saving profile");
        // We are editing an existing DID: just ask the DID to save its profile.
        // DID being created are NOT saved here.
        await this.native.showLoading(this.translate.instant('identity.loading-msg'));

        Logger.log('Identity', "PROFILE TO WRITE: " + JSON.stringify(this.profile));
        await this.didService
          .getActiveDid()
          .writeProfile(
            this.profile,
            AuthService.instance.getCurrentUserPassword()
          );

        await this.native.hideLoading();
        this.events.publish("did:didchanged");
        this.events.publish("diddocument:changed", false);
      },
      () => {
        // Operation cancelled
        Logger.log('Identity', "Password operation cancelled");
        void this.native.hideLoading();
      }
    );
  }

  async next(publishAvatar: boolean) {
    if (await this.checkParams()) {
      // Edition mode - go back to my profile after editing.
      await this.authService.checkPasswordThenExecute(
        async () => {
          Logger.log('Identity', "Password provided and valid. Now saving profile");
          // We are editing an existing DID: just ask the DID to save its profile.
          // DID being created are NOT saved here.
          await this.native.showLoading(this.translate.instant('identity.loading-msg'));

          Logger.log('Identity', "PROFILE TO WRITE: " + JSON.stringify(this.profile));
          await this.didService
            .getActiveDid()
            .writeProfile(
              this.profile,
              AuthService.instance.getCurrentUserPassword()
            );

          await this.native.hideLoading();
          this.events.publish("did:didchanged");
          this.events.publish("diddocument:changed", publishAvatar);
          this.native.pop();
        },
        () => {
          // Operation cancelled
          Logger.log('Identity', "Password operation cancelled");
          void this.native.hideLoading();
        }
      );
    }
  }

  async checkParams() {
    // Get the form input data by field key
    let nameEntry = this.profile.getEntryByKey("name");
    if (!nameEntry || nameEntry.value === "") {
      this.native.toast_trans("common.name-is-missing");
      return false;
    }

    //Get the new profile having edited field(s)
    const newProfile: Profile = this.profile;

    //Get the existing credentials having saved data
    this.credentials = this.didService.getActiveDid().credentials;

    for (let entry of newProfile.entries) {
      let props = {};
      props[entry.key] = entry.value;

      let credentialId = new DIDURL("#" + entry.key);
      // Validate if the field(s) is/are modified
      if (!this.credentialContentHasChanged(credentialId, entry.value)) {
        // Logger.log('Identity', "Not updating credential "+entry.key+" as it has not changed");
        continue; // Skip this credential, go to next one.
      }

      //Validate if the modified credential is previously Verified
      let credentialVerified = this.isCredentialVerified(credentialId);

      // Alert and get consent from user for modification of verified credentials
      if (credentialVerified) {
        return await this.popup.ionicConfirm(
          "Warning",
          entry.key +
          " credential is Verified, modification will overwrite the credential and you will need to request another validation.",
          "OK",
          "Cancel"
        );
      }
    }

    return true;
  }

  /**
   * Compares the given credential properties with an existing credential properties to see if
   * something has changed or not.
   */
  credentialContentHasChanged(credentialId: DIDURL, newProfileValue: string) {
    let currentCredential: VerifiableCredential = this.credentials.find((c) => {
      return credentialId.matches(c.pluginVerifiableCredential.getId());
    });

    if (!currentCredential) {
      // Logger.log('Identity', "Just a new credential because credential with id "+credentialId+" not found in DID");
      return false; // Doesn't exist previously, no need to check for its verification type.
    }

    // NOTE: FLAT comparison only for now, not deep.
    let currentProps = currentCredential.pluginVerifiableCredential.getSubject();
    let credentialFragment = currentCredential.pluginVerifiableCredential.getFragment();
    if (currentProps[credentialFragment] != newProfileValue) {
      // Logger.log('Identity', "Credential has changed because "+currentProps[credentialFragment]+" <> "+newProfileValue);
      return true;
    }

    return false;
  }

  /**
   * Checks if the given credential is verified
   */
  isCredentialVerified(credentialId: DIDURL): boolean {
    let isCredVerified = false;
    const cred = this.credentials.find((c) => {
      return credentialId.matches(c.pluginVerifiableCredential.getId());
    });

    if (cred) {
      cred.pluginVerifiableCredential.getTypes().forEach((credType) => {
        if (credType === "VerifiableCredential") {
          isCredVerified = true;
        }
      });
    }

    return isCredVerified;
  }



  /*******************************************
   * Show the profile entry field picker to let
   * user pick a profile entry to create.
   *******************************************/
  async addProfileEntry() {
    let existingProfileItems: string[] = []; // List of credential keys - items already in the profile to filter out
    this.profile.entries.map((e) => {
      existingProfileItems.push(e.key);
    });

    Logger.log('Identity', "Filtered items for add profile: ", existingProfileItems);

    let modal = await this.modalCtrl.create({
      component: ProfileEntryPickerPage,
      componentProps: {
        filterOut: existingProfileItems,
      },
    });

    void modal.onDidDismiss().then((params) => {
      if (params && params.data && params.data.pickedItem) {
        let pickedItem: BasicCredentialEntry = params.data.pickedItem;

        // Add the new entry to the current profile
        // Default value is an empty string
        this.profile.setValue(pickedItem, "");
        void this.save();
      }
    });

    await modal.present();
  }

  /****************************************************
   * Removes an entry from the currently edited profile *
   *****************************************************/
  deleteProfileEntry(entry: BasicCredentialEntry, event: MouseEvent) {
    event.stopImmediatePropagation();
    this.profile.deleteEntry(entry);
    void this.save();
  }

  public async alertAvatarPublish() {
    const alert = await this.alertCtrl.create({
      mode: "ios",
      header: this.translate.instant("identity.avatar-publish"),
      buttons: [
        {
          text: this.translate.instant("identity.avatar-publish-cancel"),
          role: "cancel",
          cssClass: "secondary",
        },
        {
          text: this.translate.instant("identity.avatar-publish-yes"),
          handler: () => {
            void this.next(true);
          },
        },
      ],
    });

    await alert.present();
  }
}
