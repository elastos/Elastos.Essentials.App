import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { FriendsService } from '../../services/friends.service';

import { Avatar } from '../../models/avatar';
import { NativeService } from '../../services/native.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.page.html',
  styleUrls: ['./confirm.page.scss'],
})
export class ConfirmPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public id = '';
  public name = '';
  public avatar: Avatar = null;
  public isPublished: boolean;

  constructor(
    public friendsService: FriendsService,
    public theme: GlobalThemeService,
    private route: ActivatedRoute,
    private router: Router,
    public translate: TranslateService,
    private zone: NgZone,
    private native: NativeService,
    private contactNotifier: ContactNotifierService,
    private globalNav: GlobalNavService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params) {
        this.id = params.id;
        this.name = params.name;
        this.avatar = params.image ? JSON.parse(params.image) : null;
        Logger.log('contacts', "Confirm params", params)
        Logger.log('contacts', "Avatar:", this.avatar);

        if(params.isPublished === 'true') {
          this.isPublished = true;
        } else {
          this.isPublished = false;
        }
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('contacts.confirm-contact'));
    void this.native.hideLoading();
  }

  ionViewWillLeave() {
  }

  ionViewDidEnter() {
  }

  async addContact() {
    const contactAlreadyAdded = await this.friendsService.addContact();

    this.zone.run(() => {
      if(contactAlreadyAdded) {
        void this.globalNav.navigateRoot(App.CONTACTS, '/contacts/friends');
      } else {
        if(!this.name) {
          this.friendsService.showCustomization(this.friendsService.pendingContact, true);
        } else {
          void this.globalNav.navigateRoot(App.CONTACTS, '/contacts/friends/'+this.id);
        }
      }
    });
  }

  async denyContact() {
    if(this.friendsService.contactNotifierInviationId) {
      Logger.log('contacts', 'Rejecting contact notifier invitation', this.friendsService.contactNotifierInviationId);
      await this.contactNotifier.rejectInvitation(this.friendsService.contactNotifierInviationId);
      this.friendsService.contactNotifierInviationId = null;
    } else {
      Logger.log('contacts', 'Rejected contact did not come from a "viewfriendinvitation" intent');
    }

    void this.globalNav.navigateRoot(App.CONTACTS, '/contacts/friends');
  }
}
