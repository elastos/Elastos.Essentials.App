import { Component, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import QRCode from 'easyqrcodejs';

import { Util } from '../../services/util';
import { TranslateService } from '@ngx-translate/core';
import { UXService } from '../../services/ux.service';
import { IdentityService } from '../../services/identity.service';
import { ThemeService } from 'src/app/didsessions/services/theme.service';
import { ModalController, IonSlides, Platform } from '@ionic/angular';
import { PrintoptionsComponent } from '../../components/printoptions/printoptions.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { sleep } from 'src/app/helpers/sleep.helper';
import { GlobalPublicationService } from 'src/app/services/global.publication.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';

// Minimal duration during which a slide remains shown before going to the next one.
const MIN_SLIDE_SHOW_DURATION_MS = 1000;

@Component({
    selector: 'page-preparedid',
    templateUrl: 'preparedid.html',
    styleUrls: ['preparedid.scss']
})
export class PrepareDIDPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild(IonSlides, { static: false }) slide: IonSlides;

  public LAST_SLIDE_INDEX = 4;

  private nextStepId: number;
  public mnemonic: string;
  public mnemonicList: string[] = [];
  public isCreation = false;

  public slideIndex = 0;
  public slideOpts = {
    initialSlide: 0,
    speed: 400,
    init: false,
    allowTouchMove: false
  };
  public hidden = true;

  // Errors
  public publishError: string = null;
  public signInError: string = null;
  public hiveError: string = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public router: Router,
    public translate: TranslateService,
    private identityService: IdentityService,
    private uxService: UXService,
    private modalCtrl: ModalController,
    private zone: NgZone,
    private platform: Platform,
    private walletService: WalletManager,
    private globalHiveService: GlobalHiveService,
    private globalPublicationService: GlobalPublicationService
  ) {
      Logger.log('didsessions', "Entering PrepareDID page");
      const navigation = this.router.getCurrentNavigation();
      if(navigation.extras.state && navigation.extras.state.enterEvent) {
        this.nextStepId = navigation.extras.state.enterEvent.stepId;
        Logger.log('didsessions', 'PrepareDIDPage - nextStepId', this.nextStepId);
      }
  }

  async ionViewWillEnter() {
    await this.onSlideChanged();

    this.titleBar.setTheme('#f8f8ff', TitleBarForegroundMode.DARK);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "language", iconPath: BuiltInIcon.EDIT });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });

    // Dirty hack because on iOS we are currently unable to understand why the
    // ion-slides width is sometimes wrong when an app starts. Waiting a few
    // seconds (DOM fully rendered once...?) seems to solve this problem.
    if (this.platform.platforms().indexOf('ios') >= 0) {
      setTimeout(() => {
        this.showSlider();
      }, 300)
    } else {
      this.showSlider();
    }

    this.resetErrors();

    // Automated slides transitions upon operations completions.
    let vaultAddress = await this.appendHiveInfoToDID(); // Add a random hive vault provider to the DID Document before publishing it (to avoid publishing again right after)
    if (await this.publishIdentity()) {
      this.nextSlide();

      // Enter the real user context (sign in) to make sure following operations such as creating
      // a wallet run in the user context.
      if (await this.signIn()) {
        this.nextSlide();

        if (await this.setupHiveStorage(vaultAddress)) {
          Logger.log('didsessions', "Hive storage setup successful");
          this.nextSlide();

          // Note: we don't check if there is an error during wallet creation. This is not a blocking error,
          // we can continue.
          await this.createWalletFromIdentity();
          this.nextSlide();
        } else {
          Logger.log('didsessions', "Hive storage setup failed");
        }
      }
      else {
        Logger.log('didsessions', "Sign in failed");
      }
    }
    else {
      Logger.log('didsessions', "Publish identity failed");
    }
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  showSlider() {
    Logger.log('didsessions', "Showing slider");
    this.hidden = false
    void this.slide.getSwiper().then((swiper) => {
      swiper.init();
      void this.slide.slideTo(0);
    });
  }

  public async onSlideChanged() {
    this.slideIndex = await this.slide.getActiveIndex();
    this.slideIndex !== this.LAST_SLIDE_INDEX ?
      this.titleBar.setTitle(this.translate.instant('didsessions.getting-ready')) :
      this.titleBar.setTitle(this.translate.instant('didsessions.ready'));
  }

  nextSlide() {
    void this.slide.slideNext();
  }

  prevSlide() {
    void this.slide.slidePrev();
  }

  private resetErrors() {
    this.signInError = null;
    this.hiveError = null;
  }

  private async appendHiveInfoToDID(): Promise<string> {
    Logger.log("didsessions", "Adding hive vault information to local DID");
    let didDocument = await this.identityService.getCreatedDIDDocument();
    let vaultAddress = await this.globalHiveService.addRandomHiveToDIDDocument(didDocument, this.identityService.identityBeingCreated.storePass);
    return vaultAddress;
  }

  private async publishIdentity(): Promise<boolean> {
    Logger.log("didsessions", "Publishing identity");
    try {
      await Promise.all([
        sleep(MIN_SLIDE_SHOW_DURATION_MS),
        // TMP NOT USED WAITING FOR DID 2.0 - this.globalPublicationService.publishIdentity()
      ]);
      return true;
    }
    catch(e) {
      console.warn("Publish identity error in prepare did:", e);
      this.signInError = "Failed to publis identity: " + e;
      return false;
    }
  }

  private async signIn(): Promise<boolean> {
    Logger.log("didsessions", "Signing in");
    try {
      await Promise.all([
        sleep(MIN_SLIDE_SHOW_DURATION_MS),
        this.identityService.signIn(this.identityService.identityBeingCreated.didSessionsEntry)
      ]);
      return true;
    }
    catch(e) {
      console.warn("Sign in error in prepare did:", e);
      this.signInError = "Failed to sign in: " + e;
      return false;
    }
  }

  private async setupHiveStorage(vaultAddress: string): Promise<boolean> {
    Logger.log("didsessions", "Setting up hive storage");
    try {
      await Promise.all([
        sleep(MIN_SLIDE_SHOW_DURATION_MS),
        // TMP CANT USE IF DID NOT PUBLISHED FOR NOW this.globalHiveService.prepareHiveVault(vaultAddress)
      ]);
      return true;
    }
    catch(e) {
      console.warn("Hive storage error in prepare did:", e);
      this.hiveError = "Failed to setup the hive storage: " + e;
      return false;
    }
  }

  private async createWalletFromIdentity(): Promise<void> {
    Logger.log("didsessions", "Creating a default wallet with the same mnemonic as the identity");
    await Promise.all([
      sleep(MIN_SLIDE_SHOW_DURATION_MS),
      this.walletService.createWalletFromNewIdentity(
        "test name", this.identityService.identityBeingCreated.mnemonic,
        this.identityService.identityBeingCreated.mnemonicPassphrase
      )
    ]);
  }

  finalizePreparation() {
    Logger.log('didsessions', "Exiting the DID preparation screen, next step:", this.nextStepId);
    void this.identityService.runNextStep(this.nextStepId);
  }

  cancelPreparation() {
    void this.identityService.cancelIdentiyCreation();
  }
}
