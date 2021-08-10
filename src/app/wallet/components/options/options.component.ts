import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PopoverController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

export enum OptionsType {
  CONTACTS = 'Contacts',
  CRYPTONAMES = 'Cryptonames',
  Paste = 'Paste',
  SCAN = 'Scan'
}

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {
  public showContacts = false;
  public showCryptonames = false;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    public translate: TranslateService,
    private popoverCtrl: PopoverController,
  ) { }

  ngOnInit() {
    this.showContacts = this.navParams.get('showContacts');
    this.showCryptonames = this.navParams.get('showCryptonames');
  }

  pasteFromClipboard() {
    this.popoverCtrl.dismiss(OptionsType.Paste);
  }

  goContacts() {
    this.popoverCtrl.dismiss(OptionsType.CONTACTS);
  }

  goScan() {
    this.popoverCtrl.dismiss(OptionsType.SCAN);
  }

  goCryponames() {
    this.popoverCtrl.dismiss(OptionsType.CRYPTONAMES);
  }
}
