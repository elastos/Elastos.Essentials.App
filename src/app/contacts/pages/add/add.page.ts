import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IonInput } from '@ionic/angular';

import { FriendsService } from '../../services/friends.service';
import { NativeService } from '../../services/native.service';
import { AppService } from '../../services/app.service';
import { DidService } from '../../services/did.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
})
export class AddPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('input', {static: false}) input: IonInput;

  didInput: string = '';

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
    this.titleBar.setTitle(this.translate.instant('add-contact'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "scan",
      iconPath: BuiltInIcon.SCAN
    });
    this.appService.setTitleBarBackKeyShown(true, true);
  }

  ionViewWillLeave() {
    this.appService.setTitleBarBackKeyShown(false, null);
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.input.setFocus();
    }, 200);
  }

  async addContact() {
    console.log(this.didInput.length, 'DID INPUT LENGTH')
    if(this.didInput.length < 33 || this.didInput.slice(0,11) !== 'did:elastos') {
      this.didInput = "";
      this.native.genericToast(this.translate.instant('please-add-a-valid-identity'));
    } else if(await this.didService.getUserDID() === this.didInput) {
      this.native.genericToast('please-dont-add-self');
    } else {
      this.native.showLoading('please-wait');
      console.log("Resolving DID Document");

      await this.friendsService.resolveDIDDocument(this.didInput, false);
      this.native.hideLoading();
      this.didInput = "";
    }
  }
}
