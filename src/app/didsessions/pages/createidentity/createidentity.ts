import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IonSlides, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DrawerState } from 'ion-bottom-drawer';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { Styling } from 'src/app/didsessions/services/styling';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';


@Component({
  selector: 'page-createidentity',
  templateUrl: 'createidentity.html',
  styleUrls: ['./createidentity.scss']
})
export class CreateIdentityPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild(IonSlides, { static: false }) private slide: IonSlides;

  public hidden = true;
  public slideIndex = 0;
  public slideOpts = {
    initialSlide: 0,
    speed: 400,
    init: false
  };

  public isfirst = true;
  public styling = Styling;

  public passwordSheetState = DrawerState.Bottom;
  public passwordSheetMinHeight = 0;
  public passwordSheetDockedHeight = 350;
  public password = "";
  public passwordConfirmation = "";

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public router: Router,
    private platform: Platform,
    private identityService: IdentityService,
    private uxService: UXService,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private splashScreen: SplashScreen,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      this.isfirst = false;
      Logger.log('didsessions', "Setting create identity screen initial slide to index 1");
      this.slideOpts.initialSlide = 1;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("didsessions.create-identity"));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'backToRoot', iconPath: BuiltInIcon.BACK });
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
  }

  ionViewDidEnter() {
    // We are ready, we can hide the splash screen
    this.splashScreen.hide();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  showSlider() {
    Logger.log('didsessions', "Showing created identity screen slider");
    this.hidden = false
    void this.slide.getSwiper().then((swiper) => {
      swiper.init();
    });
  }

  async getActiveSlide() {
    this.slideIndex = await this.slide.getActiveIndex();
  }

  nextSlide() {
    void this.slide.slideNext();
  }

  createNewIdentity() {
    this.identityService.startCreatingNewDIDWithNewMnemonic();
  }

  async importIdentity(existingMnemonic: string = null) {
    // Import by typing a mnemonic or from an existing one (wallet)
    await this.identityService.startImportingMnemonic(existingMnemonic);
  }

  shouldShowBack() {
    return !this.isfirst;
  }
}
