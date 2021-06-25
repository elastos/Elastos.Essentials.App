import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonSlides, Platform } from '@ionic/angular';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';


@Component({
    selector: 'app-home',
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

    @ViewChild(IonSlides, { static: false }) private slide: IonSlides;

    hidden = true;

    // slider
    slideOpts = {
        initialSlide: 0,
        speed: 400,
        init: false
    };

    next(slide) {
        slide.slideNext();
    }

    prev(slide) {
        slide.slidePrev();
    }

    constructor(
        private router: Router,
        private storage: GlobalStorageService,
        private platform: Platform,
    ) {
    }

    ngOnInit() { }

    ionViewWillEnter() {
    }

    ionViewDidEnter() {
        // Dirty hack because on iOS we are currently unable to understand why the
        // ion-slides width is sometimes wrong when an app starts. Waiting a few
        // seconds (DOM fully rendered once...?) seems to solve this problem.
        if (this.platform.platforms().indexOf('ios') >= 0) {
            setTimeout(() => {
                this.showSlider();
            }, 3000)
        }
        else {
            this.showSlider();
        }
    }

    showSlider() {
        this.hidden = false
        this.slide.getSwiper().then((swiper) => {
            swiper.init();
        })
    }

    goToVote() {
        this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "dposvoting", "visited", true);
        this.router.navigate(['menu/vote']);
    }
}
