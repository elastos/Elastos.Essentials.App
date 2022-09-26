import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { Native } from '../../services/native';



@Component({
  selector: 'showqrcode',
  templateUrl: './showqrcode.component.html',
  styleUrls: ['./showqrcode.component.scss'],
})
export class ShowQRCodeComponent implements OnInit {
  public didString = "";
  public qrCodeString = "";

  constructor(
    public modalCtrl: ModalController,
    public native: Native,
    navParams: NavParams,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private globalIntentService: GlobalIntentService
  ) {
    this.didString = navParams.get("didstring");
    this.qrCodeString = navParams.get("qrcodestring");
  }

  ngOnInit() {
  }

  hideModal() {
    return this.modalCtrl.dismiss(null);
  }

  copyDIDToClipboard() {
    void this.native.copyClipboard(this.didString);
    this.native.toast_trans('identity.copied-to-clipboard');
  }

  shareInvitationLink() {
    void this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("common.share-add-me-as-friend"),
      url: this.qrCodeString
    });
  }
}
