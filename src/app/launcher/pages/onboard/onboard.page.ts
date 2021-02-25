import { Component, OnInit, ViewChild } from '@angular/core';
import { ThemeService } from 'src/app/services/theme.service';
import { StorageService } from 'src/app/services/storage.service';
import { Router } from '@angular/router';
import { IonSlides, Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { DIDSessionsService } from 'src/app/services/didsessions.service';

@Component({
  selector: 'app-onboard',
  templateUrl: './onboard.page.html',
  styleUrls: ['./onboard.page.scss'],
})
export class OnboardPage implements OnInit {

  @ViewChild('slider', {static: false}) slider: IonSlides;

  hidden = true;

  // Slider options
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    centeredSlides: true,
    slidesPerView: 1,
    init: false
  };

  constructor(
    public theme: ThemeService,
    private storage: StorageService,
    private router: Router,
    private platform: Platform,
    public translate: TranslateService,
    private didSessions: DIDSessionsService
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    // TODO @chad - titleBarManager.setTitle(this.translate.instant("dapp-browser"));
    // TODO @chad - titleBarManager.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.LIGHT);
  }

  ionViewDidEnter() {
    // Dirty hack because on iOS we are currently unable to understand why the
    // ion-slides width is sometimes wrong when an app starts. Waiting a few
    // seconds (DOM fully rendered once...?) seems to solve this problem.
    if (this.platform.platforms().indexOf('ios') >= 0) {
      setTimeout(() => {
        this.showSlider();
      }, 3000);
    } else {
      this.showSlider();
    }
  }

  showSlider() {
    this.hidden = false;
    this.slider.getSwiper().then((swiper) => {
      swiper.init();
    });
  }

  next(slide) {
    slide.slideNext();
  }

  prev(slide) {
    slide.slidePrev();
  }

  async exit() {
    await this.storage.setSetting(DIDSessionsService.signedInDIDString, "launcher", "visit", true);
    this.router.navigate(['launcher/home']);
  }
}
