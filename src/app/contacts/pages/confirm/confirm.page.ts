import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { FriendsService } from '../../services/friends.service';
import { AppService } from '../../services/app.service';

import { Avatar } from '../../models/avatar';
import { NativeService } from '../../services/native.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ContactNotifierService } from 'src/app/services/contactnotifier.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';

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
    private appService: AppService,
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
        console.log("Confirm params", params)
        console.log("Avatar:", this.avatar);

        if(params.isPublished === 'true') {
          this.isPublished = true;
        } else {
          this.isPublished = false;
        }
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('confirm-contact'));
    this.appService.setTitleBarBackKeyShown(true, false);

    this.native.hideLoading();
  }

  ionViewWillLeave() {
    this.appService.setTitleBarBackKeyShown(false, null);
  }

  ionViewDidEnter() {
  }

  async addContact() {
    const contactAlreadyAdded = await this.friendsService.addContact();

    this.zone.run(() => {
      if(contactAlreadyAdded) {
        this.globalNav.navigateRoot('contacts', '/contacts/friends');
      } else {
        if(!this.name) {
          this.friendsService.showCustomization(this.friendsService.pendingContact, true);
        } else {
          this.globalNav.navigateTo('contacts', '/contacts/friends/'+this.id);
        }
      }
    });
  }

  denyContact() {
    if(this.friendsService.contactNotifierInviationId) {
      console.log('Rejecting contact notifier invitation', this.friendsService.contactNotifierInviationId);
      this.contactNotifier.rejectInvitation(this.friendsService.contactNotifierInviationId);
      this.friendsService.contactNotifierInviationId = null;
    } else {
      console.log('Rejected contact did not come from a "viewfriendinvitation" intent');
    }

    this.globalNav.navigateRoot('contacts', '/contacts/friends');
  }
}
