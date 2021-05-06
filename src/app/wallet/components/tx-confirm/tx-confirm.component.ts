import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from '../../services/native.service';

@Component({
  selector: 'app-tx-confirm',
  templateUrl: './tx-confirm.component.html',
  styleUrls: ['./tx-confirm.component.scss'],
})
export class TxConfirmComponent implements OnInit {

  public txInfo;

  public txHeader: string;
  public txIcon: string;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private native: Native
  ) { }

  ngOnInit() {
    this.txInfo = this.navParams.get('txInfo');
    Logger.log('wallet', 'Confirm tx', this.txInfo);

    if (this.txInfo.type === 1) {
      this.txHeader = this.translate.instant('wallet.transfer-transaction-type');
      this.txIcon = './assets/wallet/tx/transfer.svg';
    } else {
      this.txHeader = this.translate.instant('wallet.send-transaction-type');
      this.txIcon = './assets/wallet/tx/send.svg';
    }
  }

  cancel() {
    this.native.popup.dismiss();
  }

  confirm() {
    this.native.popup.dismiss({
      confirm: true
    });
  }
}
