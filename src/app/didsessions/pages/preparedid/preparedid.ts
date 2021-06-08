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
const MIN_SLIDE_SHOW_DURATION_MS = 2000;

@Component({
    selector: 'page-preparedid',
    templateUrl: 'preparedid.html',
    styleUrls: ['preparedid.scss']
})
export class PrepareDIDPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild(IonSlides, { static: false }) slide: IonSlides;

  public LAST_SLIDE_INDEX = 3;

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

    // Automated slides transitions upon operations completions.
    let vaultAddress = await this.appendHiveInfoToDID(); // Add a random hive vault provider to the DID Document before publishing it (to avoid publishing again right after)
    await this.publishIdentity();
    this.nextSlide();
    await this.setupHiveStorage(vaultAddress);
    this.nextSlide();
    await this.createWalletFromIdentity();
    this.nextSlide();
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

  private async appendHiveInfoToDID(): Promise<string> {
    let didDocument = await this.identityService.getCreatedDIDDocument();
    let vaultAddress = await this.globalHiveService.addRandomHiveToDIDDocument(didDocument, this.identityService.identityBeingCreated.storePass);
    return vaultAddress;
  }

  private async publishIdentity(): Promise<void> {
    await Promise.all([
      sleep(MIN_SLIDE_SHOW_DURATION_MS),
      // TMP NOT USED WAITING FOR DID 2.0 - this.globalPublicationService.publishIdentity()
    ]);
  }

  private async setupHiveStorage(vaultAddress: string): Promise<void> {
    await Promise.all([
      sleep(MIN_SLIDE_SHOW_DURATION_MS),
      this.globalHiveService.prepareHiveVault(vaultAddress)
    ]);
  }

  private async createWalletFromIdentity(): Promise<void> {
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
