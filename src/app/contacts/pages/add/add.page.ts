import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IonInput } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';
import { NativeService } from '../../services/native.service';
import { AppService } from '../../services/app.service';
import { DidService } from '../../services/did.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
})
export class AddPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('input', {static: false}) input: IonInput;

  didInput = '';

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public friendsService: FriendsService,
    public appService: AppService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private native: NativeService,
    private didService: DidService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('contacts.add-contact'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "scan",
      iconPath: BuiltInIcon.SCAN
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.appService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  ionViewDidEnter() {
    /* setTimeout(() => {
      void this.input.setFocus();
    }, 200); */
  }

  async addContact() {
    Logger.log('contacts', this.didInput.length, 'DID INPUT LENGTH');
    if(this.didInput.length < 33 || this.didInput.slice(0,11) !== 'did:elastos') {
      this.didInput = "";
      void this.native.genericToast('contacts.please-add-a-valid-identity');
    } else if(this.didService.getUserDID() === this.didInput) {
      void this.native.genericToast('contacts.please-dont-add-self');
    } else {
      void this.native.showLoading(this.translate.instant('common.please-wait'));
      Logger.log('contacts', "Resolving DID Document");

      await this.friendsService.resolveDIDDocument(this.didInput, false);
      void this.native.hideLoading();
      this.didInput = "";
    }
  }
}
