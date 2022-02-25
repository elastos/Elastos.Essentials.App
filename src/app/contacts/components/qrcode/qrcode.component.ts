import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { FriendsService } from '../../services/friends.service';
import { NativeService } from '../../services/native.service';

@Component({
  selector: 'app-qrcode',
  templateUrl: './qrcode.component.html',
  styleUrls: ['./qrcode.component.scss'],
})
export class QRCodeComponent implements OnInit {

  public name = "";
  public didString = "";
  public qrCodeString = "";

  constructor(
    public theme: GlobalThemeService,
    private globalIntentService: GlobalIntentService,
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
    void this.modalCtrl.dismiss(null);
  }

  async copyDIDToClipboard() {
    await this.clipboard.copy(this.didString);
    this.native.shareToast();
  }

  async shareInvitationLink() {
    await this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("common.share-friend"),
      url: this.qrCodeString
    });
    void this.modalCtrl.dismiss();
  }
}
