import { HttpClient } from '@angular/common/http';
import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Contact } from '../../models/contact.model';
import { DApp } from '../../models/dapp.model';
import { AppService } from '../../services/app.service';
import { DidService } from '../../services/did.service';
import { FriendsService } from '../../services/friends.service';
import { NativeService } from '../../services/native.service';
import { PopupService } from '../../services/popup.service';
import { UxService } from '../../services/ux.service';

type DisplayableAppInfo = {
  packageId: string,
  app: DApp,
  action: string,
  isInstalled: boolean
}

@Component({
  selector: 'app-friend-details',
  templateUrl: './friend-details.page.html',
  styleUrls: ['./friend-details.page.scss'],
})
export class FriendDetailsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public contact: Contact;
  //public contactsApps: DisplayableAppInfo[] = [];
  public fetchingApps = false;
  public detailsActive = true;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public friendsService: FriendsService,
    public uxService: UxService,
    public didService: DidService,
    public appService: AppService,
    public popupService: PopupService,
    private native: NativeService,
    private route: ActivatedRoute,
    private zone: NgZone,
    private http: HttpClient,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private clipboard: Clipboard,
    private globalNavService: GlobalNavService,
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      if (!paramMap.has('friendId')) {
        void this.globalNavService.navigateRoot('contacts', '/contacts/friends');
        return;
      }

      const targetContact = this.friendsService.getContact(paramMap.get('friendId'));
      for (let contact of this.friendsService.getContacts()) {
        if (contact.id === targetContact.id) {
          this.contact = contact;
        }
      }

      Logger.log('contacts', 'Contact profile for', this.contact);
      //this.buildDisplayableAppsInfo();
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('contacts.contact-profile'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM, { key: 'backToHome', iconPath: BuiltInIcon.BACK });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.appService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  changeList(activateDetails: boolean) {
    this.zone.run(() => {
      this.detailsActive = activateDetails;
    });
  }

  fixBirthDate(birth) {
    return moment(birth).format("MMMM Do YYYY");
  }

  copyAddress(type: string, address: string) {
    void this.clipboard.copy(address);
    void this.native.genericToast(
      this.translate.instant(type) + this.translate.instant('contacts.copied-with-type')
    );
  }
}
