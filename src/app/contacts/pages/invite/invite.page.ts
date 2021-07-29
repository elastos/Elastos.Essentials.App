import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { FriendsService } from '../../services/friends.service';
import { UxService } from '../../services/ux.service';

import { Contact } from '../../models/contact.model';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarNavigationMode, TitleBarIconSlot, TitleBarIcon, TitleBarMenuItem, BuiltInIcon } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';

@Component({
  selector: 'app-invite',
  templateUrl: './invite.page.html',
  styleUrls: ['./invite.page.scss'],
})
export class InvitePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  // Params
  public isFilter: boolean = false;
  public isSingleInvite: boolean = false;
  private intent: string = ''

  public filteredContacts: Contact[];
  public letters: string[] = [];
  public buttonLabel: string = null;

  constructor(
    public friendsService: FriendsService,
    public uxService: UxService,
    private route: ActivatedRoute,
    public translate: TranslateService,
    private globalNav: GlobalNavService,
    public theme: GlobalThemeService
  ) {}

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      Logger.log('contacts', 'pickfriend', params);

      if (params.singleInvite === true) {
        this.isSingleInvite = true;
        this.buttonLabel = this.translate.instant('contacts.invite-contact');
      } else {
        this.buttonLabel = this.translate.instant('contacts.invite-contacts');
      }

      if (params.friendsFiltered) {
        this.isFilter = true;
        this.sortContacts(this.isFilter);
      } else {
        this.isFilter = false;
        this.sortContacts(this.isFilter);
      }
      if(params.intent) {
        this.intent = params.intent;
      }
    });

    Logger.log('contacts', 'Is single invite?', this.isSingleInvite);
    Logger.log('contacts', 'Friends filtered?', this.isFilter);
    Logger.log('contacts', 'Intent', this.intent);
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('common.contacts'));
    this.titleBar.setNavigationMode(null); // Modals are not part of page stack, therefore we dont use navigation mode
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.globalNav.navigateBack();
    });
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  getContacts() {
    return this.friendsService.contacts.filter((contact) => contact.id !== 'did:elastos');
  }

  sortContacts(isFilter: boolean) {
    this.letters = [];
    if(isFilter) {
      this.friendsService.filteredContacts.map((contact) => {
        // Add letter for 'anonymous' contact
        if(
          !contact.credentials.name && contact.customName && contact.customName === 'Anonymous Contact' && !this.letters.includes('Anonymous') ||
          !contact.credentials.name && !contact.customName && !this.letters.includes('Anonymous')
        ) {
          this.letters.push('Anonymous');
        };
        // Add letter for name credential
        if(
          contact.credentials.name && !contact.customName && !this.letters.includes(contact.credentials.name[0].toUpperCase())
        ) {
          this.letters.push(contact.credentials.name[0].toUpperCase());
        }
        // Add letter for custom name
        if(
          !contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !this.letters.includes(contact.customName[0].toUpperCase()) ||
          contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !this.letters.includes(contact.customName[0].toUpperCase())
        ) {
          this.letters.push(contact.customName[0].toUpperCase());
        }
      });

      this.letters = this.letters.sort((a, b) => a > b ? 1 : -1);
      this.letters.push(this.letters.splice(this.letters.indexOf('Anonymous'), 1)[0]);
    } else {
      this.friendsService.contacts.map((contact) => {
        // Add letter for 'anonymous' contact
        if(
          !contact.credentials.name && contact.customName && contact.customName === 'Anonymous Contact' && !this.letters.includes('Anonymous') ||
          !contact.credentials.name && !contact.customName && !this.letters.includes('Anonymous')
        ) {
          this.letters.push('Anonymous');
        };
        // Add letter for name credential
        if(
          contact.id !== 'did:elastos' && contact.credentials.name && !contact.customName && !this.letters.includes(contact.credentials.name[0].toUpperCase())
        ) {
          this.letters.push(contact.credentials.name[0].toUpperCase());
        }
        // Add letter for custom name
        if(
          !contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !this.letters.includes(contact.customName[0].toUpperCase()) ||
          contact.id !== 'did:elastos' && contact.credentials.name && contact.customName && contact.customName !== 'Anonymous Contact' && !this.letters.includes(contact.customName[0].toUpperCase())
        ) {
          this.letters.push(contact.customName[0].toUpperCase());
        }
      });

      this.letters = this.letters.sort((a, b) => a > b ? 1 : -1);
      this.letters.push(this.letters.splice(this.letters.indexOf('Anonymous'), 1)[0]);
    }
  }

  // If pick-friend intent is single invite, disable checkboxes if a friend is picked //
  singlePicked(isFilter: boolean) {
    let selectedFriends = 0;
    if(!isFilter) {
      this.friendsService.contacts.map(contact => {
        if (contact.isPicked) {
          selectedFriends++;
        }
      });
    } else {
      this.friendsService.filteredContacts.map(contact => {
        if (contact.isPicked) {
          selectedFriends++;
        }
      });
    }

    if(selectedFriends >= 1) {
      return true;
    } else {
      return false;
    }
  }

  inviteClicked() {
    if (this.intent == "share") {
      // We were picking friend(s) for sharing content
      this.friendsService.shareToContacts(this.isFilter);
    }
    else {
      // We were picking fiends to get friends info
      this.friendsService.inviteContacts(this.isFilter, this.intent);
    }
  }
}
