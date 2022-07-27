import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { DisconnectedDeviceDuringOperation } from '@ledgerhq/errors';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { GlobalNetworksService, MAINNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { LedgerSafe } from '../../model/safes/ledger.safe';
import { Safe } from '../../model/safes/safe';
import { Native } from '../../services/native.service';
import { WalletNetworkService } from '../../services/network.service';

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

  public ledgerNanoAppname = '';
  private connectDeviceTimerout: any = null;

  public ledgerConnectStatus = new BehaviorSubject<boolean>(false);

  constructor(
    private navParams: NavParams,
    public native: Native,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
  ) {
  }

  ngOnInit() {
    this.ledgerDeviceId = this.navParams.data.deviceId;
    this.safe = this.navParams.data.safe;
    this.initLedgerAppName();
    void this.connectDevice();
  }

  private async doConnect() {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
        this.ledgerConnectStatus.next(false);
      }
      this.connecting = true;
      this.transport = await BluetoothTransport.open(this.ledgerDeviceId);
      this.closeTimeout();
      this.ledgerConnectStatus.next(true);
    }
    catch (e) {
      Logger.error('wallet', 'BluetoothTransport.open error:', e);
    }
    this.connecting = false;
  }

  // TODO: Why BluetoothTransport.open can work for the first time, but no return for the second time?
  // if the BluetoothTransport.open can not return, we should connect device again.
  private connectDevice() {
    if (this.transport) return;

    void this.doConnect();

    this.connectDeviceTimerout = setTimeout(() => {
      Logger.warn('wallet', ' Timeout, Connect device again');
      void this.connectDevice();
    }, 3000);
  }

  private reConnectDecice() {
    if (this.transport) {
      void this.transport.close();
      this.transport = null;
      this.ledgerConnectStatus.next(false);
    }

    this.connectDevice();
    return new Promise<void>((resolve) => {
      let ledgerStatusSubscription: Subscription = this.ledgerConnectStatus.subscribe( (connected)=> {
        if (connected) {
          ledgerStatusSubscription.unsubscribe();
          resolve();
        }
      })
    });
  }

  private closeTimeout() {
    if (this.connectDeviceTimerout) {
      clearTimeout(this.connectDeviceTimerout);
      this.connectDeviceTimerout = null;
    }
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  initLedgerAppName() {
    switch (WalletNetworkService.instance.activeNetwork.value.key) {
      case 'elastos':
        this.ledgerNanoAppname = "Elastos"
        break;
      case 'btc':
        let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
        if (network === MAINNET_TEMPLATE) {
          this.ledgerNanoAppname = "Bitcoin"
        } else {
          this.ledgerNanoAppname = "Bitcoin Test"
        }
        break;
      default:
        this.ledgerNanoAppname = "Ethereum"
        break;
    }
  }

  async signTransaction() {
    try {
      await (this.safe as LedgerSafe).signTransactionByLedger(this.transport);
      this.signSucceeded = true;
    } catch (e) {
      Logger.log("wallet", "LedgerSignComponent signTransactionByLedger error: ", e);

      // CustomError -- statusCode 25873(0x6511) name: DisconnectedDeviceDuringOperation -- the app is not started.
      // CustomError -- message: DisconnectedDeviceDuringOperation name:DisconnectedDeviceDuringOperation
      // CustomError -- message: An action was already pending on the Ledger device. Please deny or reconnect. name: TransportRaceCondition
      // TransportStausError -- statusCode: 28160(0x6e00)  -- open the wrong app
      // TransportStausError -- statusCode: 27013(0x6985)  -- user canceled the transaction
      // TransportErro -- id: TransportLocked name: TransportError message: Ledger Device is busy (lock getAddress)

      if (e.statusCode == 27013) return;

      // if the ledger is disconnected, we need connect ledger again.
      if (e instanceof DisconnectedDeviceDuringOperation || e.id === 'TransportLocked' || e.name === 'TransportRaceCondition') {
        void this.reConnectDecice();
        return;
      }

      if (e.message) {
        // TODO: Display user-friendly messages.
        this.native.toast_trans(e.message);
      } else {
        this.native.toast_trans('wallet.ledger-prompt');
      }
    }
  }

  async confirm() {
    try {
      Logger.log('wallet', 'LedgerSignComponent signing')
      this.signing = true;
      await this.signTransaction();
      this.signing = false;
      if (this.signSucceeded) {
        void this.disconnect();
        void this.modalCtrl.dismiss({
          signed: this.signSucceeded
        });
      }
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
