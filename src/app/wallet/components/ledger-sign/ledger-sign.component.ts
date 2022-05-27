import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { LedgerSafe } from '../../model/safes/ledger.safe';
import { Safe } from '../../model/safes/safe';

export type LedgerSignComponentOptions = {
  deviceId: string,
  safe: Safe;
}

@Component({
  selector: 'app-ledger-sign',
  templateUrl: './ledger-sign.component.html',
  styleUrls: ['./ledger-sign.component.scss'],
})
export class LedgerSignComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public ledgerDeviceId = null;
  public safe: Safe = null;
  public transport: BluetoothTransport = null;
  public connecting = true;
  public signing = false;
  private signSucceeded = false;

  constructor(
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
  ) {
  }

  ngOnInit() {
    this.ledgerDeviceId = this.navParams.data.deviceId;
    this.safe = this.navParams.data.safe;
    void this.connect();
  }

  async connect() {
    Logger.log("wallet", "Ledger connecting... ", this.ledgerDeviceId);
    this.connecting = true;
    this.transport = await BluetoothTransport.open(this.ledgerDeviceId);
    this.connecting = false;
    Logger.log("wallet", "Ledger connected ", this.transport);
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async signTransaction() {
    try {
      await (this.safe as LedgerSafe).signTransactionByLedger(this.transport);
      this.signSucceeded = true;
    } catch (err) {
      Logger.log("wallet", "LedgerSignComponent signTransactionByLedger error: ", err);
      // TODO : if the ledger is disconnected, we need connect ledger again.
    }
  }

  async confirm() {
    try {
      Logger.log('wallet', 'LedgerSignComponent signing')
      this.signing = true;
      await this.signTransaction();
      this.signing = false;
      void this.disconnect();
      void this.modalCtrl.dismiss({
        signed: this.signSucceeded
      });
    } catch (err) {
      Logger.warn("wallet", "LedgerSignComponent sign failed:", err)
    }
  }

  cancelOperation() {
    Logger.log("wallet", "Ledger connection cancelled");
    void this.disconnect();
    void this.modalCtrl.dismiss();
  }
}
