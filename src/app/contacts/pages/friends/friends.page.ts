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

  public letters: string[] = [];
  public contacts: Contact[] = [];

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
    this.friendsService.contacts.subscribe(contacts => {
      if (contacts) {
        this.contacts = contacts;
        this.letters = this.friendsService.extractContactFirstLetters(contacts);
        void this.initContacts();

        // Start refreshing contacts data when we enter the contact app's main screen. But do this
        // only once per app session as this is a heavy process (did documents, download avatars, etc)
        void this.friendsService.remoteUpdateContactsOnlyOnce();
      }
    });
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
    return this.contacts.filter((contact) => contact.isFav);
  }

  async initContacts() {
    await this.getActiveSlide();
  }

  async getActiveSlide() {
    if (this.contacts.length && this.slider) {
      const index = await this.slider.getActiveIndex();
      this.friendsService.activeSlide = this.contacts[index] || this.contacts[this.contacts.length - 1];
      Logger.log('contacts', 'friends.getActiveSlide - ', this.friendsService.activeSlide);
    }
  }

  // Reveal 'First Contact' Intro if user's list of contacts exactly matches the default
  // contacts list.
  shouldShowFirstContactInformation(): boolean {
    // Different list size means different content.
    if (this.contacts.length != defaultContacts.length)
      return false;

    for (let userContact of this.contacts) {
      if (!defaultContacts.find(c => c === userContact.id))
        return false;
    }

    return true;
  }

  goToContact(contact: Contact) {
    void this.globalNav.navigateTo('contacts', '/contacts/friends/' + contact.id);
  }
}
