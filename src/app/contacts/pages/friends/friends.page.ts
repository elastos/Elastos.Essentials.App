import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { defaultContacts } from '../../config/config';
import { Contact } from '../../models/contact.model';
import { AppService } from '../../services/app.service';
import { DidService } from '../../services/did.service';
import { FriendsService } from '../../services/friends.service';
import { PopupService } from '../../services/popup.service';
import { UxService } from '../../services/ux.service';




@Component({
  selector: 'app-friends',
  templateUrl: './friends.page.html',
  styleUrls: ['./friends.page.scss'],
})
export class FriendsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('slider', { static: false }) slider: IonSlides;

  public favActive = false;
  private subscription: Subscription = null;
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

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
    private events: GlobalEvents,
    private globalNav: GlobalNavService
  ) {
    GlobalFirebaseService.instance.logEvent("contacts_friends_enter");
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.subscription = this.events.subscribe("friends:updateSlider", () => {
      this.zone.run(() => {
        Logger.log('contacts', 'friends:updateSlider event');
        void this.getActiveSlide();
      });
    });

    this.titleBar.setTitle(this.translate.instant('common.contacts'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "add",
      iconPath: BuiltInIcon.ADD
    });

    this.titleBarIconClickedListener = (clickedIcon) => {
      this.appService.onTitleBarItemClicked(clickedIcon);
    }
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener)

    void this.getContacts();
  }

  ionViewWillLeave() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
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
    Logger.log('contacts', 'Initializing home - "friends" pg');
    await this.getActiveSlide();
  }

  async getActiveSlide() {
    if (this.friendsService.contacts.length) {
      const index = await this.slider.getActiveIndex();
      this.friendsService.activeSlide = this.friendsService.contacts[index] || this.friendsService.contacts[this.friendsService.contacts.length - 1];
      Logger.log('contacts', 'friends.getActiveSlide - ', this.friendsService.activeSlide);
    } else {
      Logger.log('contacts', 'friends.getActiveSlide - No contacts');
    }
  }

  // Reveal 'First Contact' Intro if user's list of contacts exactly matches the default
  // contacts list.
  shouldShowFirstContactInformation(): boolean {
    // Different list size means different content.
    if (this.friendsService.contacts.length != defaultContacts.length)
      return false;

    for (let userContact of this.friendsService.contacts) {
      if (!defaultContacts.find(c => c === userContact.id))
        return false;
    }

    return true;
  }

  goToContact(contact: Contact) {
    void this.globalNav.navigateTo('contacts', '/contacts/friends/' + contact.id);
  }
}
