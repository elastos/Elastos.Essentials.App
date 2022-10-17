import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Contact } from '../../models/contact.model';
import { FriendsService } from '../../services/friends.service';
import { IntentService } from '../../services/intent.service';
import { UxService } from '../../services/ux.service';

export type InvitePageParams = {
  singleInvite: boolean;
  contacts?: Contact[]; // Filtered contaccts to use.
  actionType: 'pickfriend' | 'share'
}

@Component({
  selector: 'app-invite',
  templateUrl: './invite.page.html',
  styleUrls: ['./invite.page.scss'],
})
export class InvitePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  // Params
  public isFilter = false;
  public isSingleInvite = false;
  private actionType: 'pickfriend' | 'share' = null;
  private actionByUser = false;

  public contacts: Contact[];
  public letters: string[] = [];
  public buttonLabel: string = null;

  constructor(
    public friendsService: FriendsService,
    private intentService: IntentService,
    public uxService: UxService,
    private route: ActivatedRoute,
    public translate: TranslateService,
    private globalNav: GlobalNavService,
    public theme: GlobalThemeService,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state) {
      let state = <InvitePageParams>navigation.extras.state;

      if (state.singleInvite === true) {
        this.isSingleInvite = true;
        this.buttonLabel = this.translate.instant('contacts.invite-contact');
      } else {
        this.buttonLabel = this.translate.instant('contacts.invite-contacts');
      }

      if (state.contacts) {
        this.contacts = state.contacts;
        this.isFilter = true;
      } else {
        this.contacts = this.friendsService.contacts.value;
        this.isFilter = false;
      }

      this.letters = this.friendsService.extractContactFirstLetters(this.contacts);

      if (state.actionType) {
        this.actionType = state.actionType;
      }


      Logger.log('contacts', 'Is single invite?', this.isSingleInvite);
      Logger.log('contacts', 'Friends filtered?', this.isFilter);
      Logger.log('contacts', 'Intent', this.actionType);
    }
  }

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  ngOnInit() {
    this.friendsService.contacts.subscribe(contacts => {
      if (contacts) {

      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('common.contacts'));
    this.titleBar.setNavigationMode(null); // Modals are not part of page stack, therefore we dont use navigation mode
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.CLOSE }); // Replace ela logo with close icon
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.globalNav.navigateBack();
    });
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    if (this.actionType.length > 0 && !this.actionByUser) {
      this.intentService.sendEmptyIntentRes();
    }
  }

  getContacts() {
    return this.contacts.filter((contact) => contact.id !== 'did:elastos');
  }

  // If pick-friend intent is single invite, disable checkboxes if a friend is picked //
  singlePicked(isFilter: boolean) {
    let selectedFriends = 0;
    this.contacts.map(contact => {
      if (contact.isPicked) {
        selectedFriends++;
      }
    });

    if (selectedFriends >= 1) {
      return true;
    } else {
      return false;
    }
  }

  inviteClicked() {
    let pickedContacts = this.contacts.filter(c => c.isPicked);
    this.actionByUser = true;

    if (this.actionType == "share") {
      // We were picking friend(s) for sharing content
      void this.intentService.shareToContacts(pickedContacts);
    }
    else {
      // We were picking friends to get friends info
      this.intentService.inviteContacts(this.actionType, pickedContacts);
    }
  }
}
