import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { IdentityService } from '../../services/identity.service';
import { PrepareDIDCallbacks, PrepareDIDService } from '../../services/prepare-did.service';

@Component({
  selector: 'page-preparedid',
  templateUrl: 'preparedid.html',
  styleUrls: ['preparedid.scss']
})
export class PrepareDIDPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private nextStepId: number;
  private backButtonSub: Subscription;

  // UI
  public slideIndex = 0;
  public slideOpts = {
    initialSlide: 0,
    speed: 400,
    init: false,
    allowTouchMove: false,
    slidesPerView: 1
  };
  public hidden = true;
  public isLightweightMode = false;

  // True when we are doing the very last finalization before showing the launch screen.
  public finalizingPreparation = false;

  // Errors
  public publishError: string = null;
  public signInError: string = null;
  public hiveError: string = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public router: Router,
    public translate: TranslateService,
    private identityService: IdentityService,
    private platform: Platform,
    private prepareDIDService: PrepareDIDService,
    private globalPreferences: GlobalPreferencesService,
    public theme: GlobalThemeService
  ) {
    Logger.log('didsessions', 'Entering PrepareDID page');
    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state && navigation.extras.state.enterEvent) {
      this.nextStepId = navigation.extras.state.enterEvent.stepId;
      Logger.log('didsessions', 'PrepareDIDPage - nextStepId', this.nextStepId);
    }
  }

  async ionViewWillEnter() {
    // Check lightweight mode preference
    try {
      this.isLightweightMode = await this.globalPreferences.getLightweightMode('', '');
    } catch (error) {
      Logger.log('didsessions', 'Error getting lightweight mode preference, defaulting to false:', error);
      this.isLightweightMode = false;
    }

    this.titleBar.setTitle(' ');
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);

    // Do not nav back.
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(100, () => {});

    // Dirty hack because on iOS we are currently unable to understand why the
    // ion-slides width is sometimes wrong when an app starts. Waiting a few
    // milliseconds (DOM fully rendered once...?) seems to solve this problem.
    if (this.platform.platforms().indexOf('ios') >= 0) {
      setTimeout(() => {
        this.showSlider();
      }, 300);
    } else {
      this.showSlider();
    }

    this.resetErrors();

    // Start preparation using the service
    const callbacks: PrepareDIDCallbacks = {
      onSlideChange: (slideIndex: number) => {
        this.slideIndex = slideIndex;
      },
      onError: (step: string, error: string) => {
        switch (step) {
          case 'publish':
            this.publishError = error;
            break;
          case 'signIn':
            this.signInError = error;
            break;
          case 'hive':
            this.hiveError = error;
            break;
          default:
            Logger.warn('didsessions', 'Unknown error step:', step);
        }
      },
      onIdentityPublished: () => {
        Logger.log('didsessions', 'Identity published');
      },
      onWalletCompleted: () => {
        Logger.log('didsessions', 'Wallet creation completed');
      },
      onAllStepsCompleted: () => {
        Logger.log('didsessions', 'All preparation steps completed');

        // If lightweight mode, directly finalize the preparation.
        // In advanced mode, keep the last "all done" shown waiting for user to click "continue".
        if (this.isLightweightMode) {
          this.finalizePreparation();
        }
      }
    };

    await this.prepareDIDService.startPreparation({
      isLightweightMode: this.isLightweightMode,
      callbacks: callbacks
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.backButtonSub) {
      this.backButtonSub.unsubscribe();
      this.backButtonSub = null;
    }
  }

  showSlider() {
    Logger.log('didsessions', 'Showing slider');
    this.hidden = false;
  }

  onSlideIndexChange(slideIndex: number) {
    this.slideIndex = slideIndex;
  }

  private resetErrors() {
    this.publishError = null;
    this.signInError = null;
    this.hiveError = null;
    this.finalizingPreparation = false;
  }

  finalizePreparation() {
    Logger.log('didsessions', 'Exiting the DID preparation screen, next step:', this.nextStepId);
    this.finalizingPreparation = true;
    void this.identityService.runNextStep(this.nextStepId);
  }

  cancelPreparation() {
    void this.identityService.cancelIdentiyCreation();
  }
}
