import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, IonInput } from '@ionic/angular';

import { Native } from '../../services/native';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';


@Component({
  selector: 'showqrcode',
  templateUrl: './showqrcode.component.html',
  styleUrls: ['./showqrcode.component.scss'],
})
export class ShowQRCodeComponent implements OnInit {
  public didString: string = "";
  public qrCodeString: string = "";

  constructor(
    public modalCtrl: ModalController,
    public native: Native,
    private navParams: NavParams,
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
    this.modalCtrl.dismiss(null);
  }

  copyDIDToClipboard() {
    this.native.copyClipboard(this.didString);
    this.native.toast_trans('common.copied-to-clipboard');
  }

  shareInvitationLink() {
    this.globalIntentService.sendIntent("share", {
      title: this.translate.instant("identity.share-add-me-as-friend"),
      url: this.qrCodeString
    });
  }
}
