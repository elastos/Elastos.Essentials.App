import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

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
    void this.popoverCtrl.dismiss(OptionsType.Paste);
  }

  goContacts() {
    void this.popoverCtrl.dismiss(OptionsType.CONTACTS);
  }

  goScan() {
    void this.popoverCtrl.dismiss(OptionsType.SCAN);
  }

  goCryponames() {
    void this.popoverCtrl.dismiss(OptionsType.CRYPTONAMES);
  }
}
