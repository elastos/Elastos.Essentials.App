import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, IonInput } from '@ionic/angular';

import { Native } from '../../services/native';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

declare let appManager: AppManagerPlugin.AppManager;

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
    private translate: TranslateService
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
    this.native.toast_trans('copied-to-clipboard');
  }

  shareInvitationLink() {
    appManager.sendIntent("share", {
      title: this.translate.instant("share-add-me-as-friend"),
      url: this.qrCodeString
    });
  }
}
