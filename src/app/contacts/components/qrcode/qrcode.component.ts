import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, NavParams } from '@ionic/angular';
import { Clipboard } from '@ionic-native/clipboard/ngx';

import { FriendsService } from '../../services/friends.service';
import { NativeService } from '../../services/native.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Component({
  selector: 'app-qrcode',
  templateUrl: './qrcode.component.html',
  styleUrls: ['./qrcode.component.scss'],
})
export class QRCodeComponent implements OnInit {

  public name: string = "";
  public didString: string = "";
  public qrCodeString: string = "";

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private native: NativeService,
    public friendsService: FriendsService,
    private clipboard: Clipboard,
    public modalCtrl: ModalController,
    private navParams: NavParams
  ) {
    this.name = this.navParams.get("name");
    this.didString = this.navParams.get("didstring");
    this.qrCodeString = this.navParams.get("qrcodestring");
  }

  ngOnInit() {
  }

  hideModal() {
    this.modalCtrl.dismiss(null);
  }

  copyDIDToClipboard() {
    this.clipboard.copy(this.didString);
    this.native.shareToast();
  }

  async shareInvitationLink() {
    await essentialsIntent.sendIntent("share", {
      title: this.translate.instant("share-friend"),
      url: this.qrCodeString
    });
    this.modalCtrl.dismiss();
  }
}
