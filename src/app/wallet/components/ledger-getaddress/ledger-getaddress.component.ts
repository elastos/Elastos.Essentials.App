import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { GlobalNetworksService, MAINNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { LeddgerAccountType } from '../../model/ledger.types';
import { BTCLedgerApp } from '../../model/ledger/btc.ledgerapp';
import { ELALedgerApp } from '../../model/ledger/ela.ledgerapp';
import { EVMLedgerApp } from '../../model/ledger/evm.ledgerapp';
import { LedgerAccount } from '../../model/ledger/ledgerapp';
import { LedgerAccountOptions } from '../../model/masterwallets/wallet.types';

export type LedgerGetAddressComponentOptions = {
    deviceId: string,
    accounType: LeddgerAccountType;
  }
@Component({
  selector: 'app-ledger-getaddress',
  templateUrl: './ledger-getaddress.component.html',
  styleUrls: ['./ledger-getaddress.component.scss'],
})
export class LedgerGetAddressComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public ledgerDeviceId = null;
  public accounType = null;
  public transport : BluetoothTransport = null;
  public connecting = true;
  public taskInProgress = false;

  public accountsLength = 5;
  public accountsOffset = 0;

  public addresses: LedgerAccount[] = [];

  public ledgerNanoAppname = '';

  constructor(
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
  ) {
  }

  ngOnInit() {
    this.ledgerDeviceId = this.navParams.data.deviceId;
    this.accounType = this.navParams.data.accounType;
    this.initLedgerAppName();
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

  initLedgerAppName() {
    switch (this.accounType) {
      case LeddgerAccountType.BTC:
        let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
        if (network === MAINNET_TEMPLATE) {
          this.ledgerNanoAppname = "Bitcoin"
        } else {
          this.ledgerNanoAppname = "Bitcoin Test"
        }
        break;
      case LeddgerAccountType.ELA:
        this.ledgerNanoAppname = "Elastos"
        break;
      case LeddgerAccountType.EVM:
        this.ledgerNanoAppname = "Ethereum"
        break;
      default:
        break;
    }
  }

  async getEVMAddresses(accountsLength = 5, accountsOffset = 0) {
    Logger.log('wallet', 'getEVMAddresses')
    try {
      let ethApp = new EVMLedgerApp(this.transport);
      this.addresses = await ethApp.getAddresses(accountsOffset, accountsLength, false);
      Logger.log('wallet', "EVM Addresses :", this.addresses);
    } catch (e) {
      Logger.warn('wallet', 'getAddresses exception:', e)
    }
  }

  async getBTCAddresses(accountsLength = 2, accountsOffset = 0) {
    Logger.log('wallet', 'getBTCAddresses')
    try {
      let btcApp = new BTCLedgerApp(this.transport);
      this.addresses = await btcApp.getAddresses(accountsOffset, accountsLength, false);

      Logger.log('wallet', "BTC Addresses :", this.addresses);
    } catch (e) {
      Logger.warn('wallet', 'getAddresses exception:', e)
    }
  }

  async getELAAddresses(accountsLength = 2, accountsOffset = 0) {
    Logger.log('wallet', 'getELAAddresses')
    try {
      const elaApp = new ELALedgerApp(this.transport);
      this.addresses = await elaApp.getAddresses(accountsOffset, accountsLength, false);
      Logger.log('wallet', "ELA addresses :", this.addresses);
    } catch (err) {
      Logger.warn('ledger', "getAddress exception :", err);
    }
  }

  hasGotAddress() {
    return Object.keys(this.addresses).length > 0;
  }

  async getAddresses() {
    if (this.taskInProgress) return;

    try {
      this.taskInProgress = true;
      switch (this.accounType) {
        case LeddgerAccountType.BTC:
          await this.getBTCAddresses(this.accountsLength, this.accountsOffset);
          break;
        case LeddgerAccountType.ELA:
          await this.getELAAddresses(this.accountsLength, this.accountsOffset);
          break;
        case LeddgerAccountType.EVM:
          await this.getEVMAddresses(this.accountsLength, this.accountsOffset);
          break;
      }
    } catch (err) {
        Logger.log("wallet", "LedgerGetAddressComponent getAddresses error: ", err);
    }

    this.taskInProgress = false;
  }

  selectAddress(account:LedgerAccount) {
    Logger.log('wallet', 'select address:', account)
    let accountOpt: LedgerAccountOptions = {type:account.type, accountID: account.address, accountPath: account.path, publicKey: account.publicKey}
    void this.disconnect();
    void this.modalCtrl.dismiss({
        account: accountOpt
    });
  }

  cancelOperation() {
    Logger.log("wallet", "Ledger connection cancelled");
    void this.disconnect();
    void this.modalCtrl.dismiss();
  }
}
