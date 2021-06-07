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
    private walletService: WalletManager
  ) {
      Logger.log('didsessions', "Entering PrepareDID page");
      const navigation = this.router.getCurrentNavigation();
      if(navigation.extras.state && navigation.extras.state.enterEvent) {
        this.nextStepId = navigation.extras.state.enterEvent.stepId;
        Logger.log('didsessions', 'PrepareDIDPage - nextStepId', this.nextStepId);
      }
  }

  async ionViewWillEnter() {
    this.getActiveSlide();
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

    // TMP DEBUG
    setTimeout(() => {
      this.zone.run(()=>{
        this.nextSlide();
        setTimeout(() => {
          this.zone.run(async ()=>{
            this.nextSlide();

            await this.walletService.createWalletFromNewIdentity(
              "test name", this.identityService.identityBeingCreated.mnemonic,
              this.identityService.identityBeingCreated.mnemonicPassphrase
            );

            setTimeout(() => {
              this.zone.run(()=>{
                this.nextSlide();
              });
            }, 2000);
          });
        }, 2000);
      });
    }, 2000);
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  showSlider() {
    Logger.log('didsessions', "Showing slider");
    this.hidden = false
    this.slide.getSwiper().then((swiper) => {
      swiper.init();
      this.slide.slideTo(0);
    });
  }

  async getActiveSlide() {
    this.slideIndex = await this.slide.getActiveIndex();
    this.slideIndex !== this.LAST_SLIDE_INDEX ?
      this.titleBar.setTitle(this.translate.instant('didsessions.getting-ready')) :
      this.titleBar.setTitle(this.translate.instant('didsessions.ready'));
  }

  nextSlide() {
    this.slide.slideNext();
  }

  prevSlide() {
    this.slide.slidePrev();
  }

  finalizePreparation() {
    Logger.log('didsessions', "Exiting the DID preparation screen, next step:", this.nextStepId);
    this.identityService.runNextStep(this.nextStepId);
  }

  cancelPreparation() {
    this.identityService.cancelIdentiyCreation();
  }
}
