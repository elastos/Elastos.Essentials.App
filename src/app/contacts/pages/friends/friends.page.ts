import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { IonSlides } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';
import { DidService } from '../../services/did.service';
import { UxService } from '../../services/ux.service';

import { Contact } from '../../models/contact.model';
import { PopupService } from '../../services/popup.service';
import { AppService } from '../../services/app.service';
import { Events } from '../../services/events.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarIconSlot, BuiltInIcon } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.page.html',
  styleUrls: ['./friends.page.scss'],
})
export class FriendsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('slider', {static: false}) slider: IonSlides;

  public favActive = false;
  private subscription: Subscription = null;

  slideOpts = {
    initialSlide: 0,
    speed: 200,
    zoom: true,
    centeredSlides: true,
    slidesPerView: 3.5
  };

  constructor(
    public friendsService: FriendsService,
    public didService: DidService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public popupService: PopupService,
    public appService: AppService,
    public uxService: UxService,
    private zone: NgZone,
    private events: Events,
    private router: Router,
    private globalNav: GlobalNavService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.subscription = this.events.subscribe("friends:updateSlider", () => {
      this.zone.run(() => {
        console.log('friends:updateSlider event');
        this.getActiveSlide();
      });
    });

    this.titleBar.setNavigationMode(null);
    this.titleBar.setTitle(this.translate.instant('contacts'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "add",
      iconPath:  BuiltInIcon.ADD
    });
    this.titleBar.addOnItemClickedListener((icon) => {
      if(icon.key === 'add') {
        this.globalNav.navigateTo('contacts', '/contacts/add');
      }
    });

    this.getContacts();
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.subscription.unsubscribe()
  }

  changeList(activateFav: boolean) {
    this.zone.run(() => {
      this.favActive = activateFav;
    });
  }

  getFavorites(): Contact[] {
    return this.friendsService.contacts.filter((contact) => contact.isFav);
  }

  async getContacts() {
    console.log('Initializing home - "friends" pg');
    await this.getActiveSlide();
  }

  async getActiveSlide() {
    if(this.friendsService.contacts.length) {
      const index = await this.slider.getActiveIndex();
      this.friendsService.activeSlide = this.friendsService.contacts[index] || this.friendsService.contacts[this.friendsService.contacts.length - 1];
      console.log('friends.getActiveSlide - ', this.friendsService.activeSlide);
    } else {
      console.log('friends.getActiveSlide - No contacts');
    }
  }

  // Reveal 'First Contact' Intro if user's only contact is 'First Contact'
  firstContact(): boolean {
    if (
      this.friendsService.contacts.length === 1 &&
      this.friendsService.contacts[0].id === 'did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2'
    ) {
      return true;
    } else {
      return false;
    }
  }

  goToAdd() {
    console.log("FRIENDS - goToAdd() clicked - fix this.");
  }
}
