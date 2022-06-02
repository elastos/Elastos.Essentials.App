import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-warning',
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.scss'],
})
export class WarningComponent implements OnInit {
  private warning = "";

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService
  ) { }

  ngOnInit() {
    this.warning = this.navParams.get('warning');
  }

  public getDisplayableHeader() {
    if (this.warning === 'delete') {
      return this.translate.instant('wallet.delete-wallet-confirm-title');
    } else {
      return this.translate.instant('launcher.backup-title');
    }
  }

  public getDisplayableMessage() {
    if (this.warning === 'delete') {
      return this.translate.instant('wallet.delete-wallet-confirm-subtitle');
    } else {
      return this.translate.instant('launcher.backup-message');
    }
  }

  cancel() {
    void this.popoverCtrl.dismiss();
  }

  delete() {
    void this.popoverCtrl.dismiss({ confirm: true });
  }
}
