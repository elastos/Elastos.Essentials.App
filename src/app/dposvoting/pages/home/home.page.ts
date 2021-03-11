import { Component, OnInit, ViewChild } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';
import { IonSlides, Platform } from '@ionic/angular';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  @ViewChild(IonSlides, {static:false}) private slide: IonSlides;

  hidden = true;

  // slider
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    init:false
  };

  next(slide) {
    slide.slideNext();
  }

  prev(slide) {
    slide.slidePrev();
  }

  constructor(
    private router: Router,
    private storageService: StorageService,
    private platform: Platform
  ) {
  }

  ngOnInit() {}

  ionViewWillEnter() {
  }

  ionViewDidEnter() {
    // Dirty hack because on iOS we are currently unable to understand why the
    // ion-slides width is sometimes wrong when an app starts. Waiting a few
    // seconds (DOM fully rendered once...?) seems to solve this problem.
    if (this.platform.platforms().indexOf('ios') >= 0) {
        setTimeout(()=>{
          this.showSlider();
        }, 3000)
      }
      else {
        this.showSlider();
      }
  }

  showSlider() {
    this.hidden = false
    this.slide.getSwiper().then((swiper)=>{
      swiper.init();
    })
  }

  goToVote() {
    this.storageService.setVisit(true);
    this.router.navigate(['menu/vote']);
  }
}
