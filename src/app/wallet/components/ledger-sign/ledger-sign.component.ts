import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { DisconnectedDeviceDuringOperation } from '@ledgerhq/errors';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BLECentralPluginBridge } from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BLECentralPluginBridge';
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

  private bleManager: BLECentralPluginBridge = null;

  public scanning = false;
  public isBluetoothEnable = true;
  public supportOpeningBluetoothSetting = true;

  public ledgerDeviceId = null;
  public safe: Safe = null;
  public transport: BluetoothTransport = null;
  public connecting = false;
  public signing = false;
  private signSucceeded = false;

  public ledgerNanoAppname = '';
  private connectDeviceTimerout: any = null;

  public ledgerConnectStatus = new BehaviorSubject<boolean>(false);

  constructor(
    private navParams: NavParams,
    public native: Native,
    private platform: Platform,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
  ) {
    if (this.platform.platforms().indexOf('ios') >= 0) {
        this.supportOpeningBluetoothSetting = false;
    }
  }

  ngOnInit() {
    this.ledgerDeviceId = this.navParams.data.deviceId;
    this.safe = this.navParams.data.safe;
    this.initLedgerAppName();
    void this.initBLE();
  }

  ngOnDestroy() {
    if (this.bleManager) {
      void this.bleManager.stopStateNotifications();
    }

    this.closeTimeout()
  }

  async initBLE() {
    this.bleManager = new BLECentralPluginBridge();
    if (this.bleManager) {
      await this.bleManager.stopStateNotifications();
      this.bleManager.startStateNotifications(async (state) => {
        switch(state) {
          case "on":
            // BluetoothTransport.listen will call startStateNotifications, so we need to call stopStateNotifications.
            await this.bleManager.stopStateNotifications();
            this.isBluetoothEnable = true;
            void this.connectDevice();
            break;
          case 'off':
            this.isBluetoothEnable = false;
            break;
        }
      }, (error)=> {
        Logger.warn('wallet', "startStateNotifications error " + error)
      });
    }
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

  showBluetoothSetting() {
    void this.bleManager.showBluetoothSettings();
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
      Logger.warn("wallet", "LedgerSignComponent signTransactionByLedger error: ", e);

      // CustomError -- statusCode 25873(0x6511) name: DisconnectedDeviceDuringOperation -- the app is not started.
      // CustomError -- message: DisconnectedDeviceDuringOperation name:DisconnectedDeviceDuringOperation
      // CustomError -- message: An action was already pending on the Ledger device. Please deny or reconnect. name: TransportRaceCondition
      // CustomError -- name: EthAppPleaseEnableContractData message: Please enable Blind signing or Contract data in the Ethereum app Settings
      // TransportStatusError -- statusCode: 28160(0x6e00)  -- open the wrong app
      // TransportStatusError -- statusCode: 27013(0x6985)  -- user canceled the transaction
      // TransportStatusError -- statusCode: 27010(0x6982)  -- Ledger device: Security not satisfied (dongle locked or have invalid access rights) (0x6982)
      // TransportError -- id: TransportLocked name: TransportError message: Ledger Device is busy (lock getAddress)

      // if the ledger is disconnected, we need connect ledger again.
      if (e instanceof DisconnectedDeviceDuringOperation || e.id === 'TransportLocked' || e.name === 'TransportRaceCondition') {
        void this.reConnectDecice();
        return;
      }

      let message = '';
      switch (e.statusCode) {
        case 0x6511:
        case 0x6e00:
          message = this.translate.instant('wallet.ledger-error-app-not-start', { appname: this.ledgerNanoAppname })
          break;
        case 0x6982:
          message = this.translate.instant('wallet.ledger-prompt', { appname: this.ledgerNanoAppname })
          break;
        case 0x6985:
          message = 'wallet.ledger-error-operation-cancelled';
          break;
        case 0xe002:
          message = 'wallet.ledger-error-unknown';
          break;
        default:
          if (e.message) {
            if (e.name === 'EthAppPleaseEnableContractData') {
                message = this.translate.instant('wallet.ledger-error-contractdata');
            } else {
                message = e.message;
            }
          } else {
            message = this.translate.instant('wallet.ledger-prompt', { appname: this.ledgerNanoAppname })
          }
      }

      this.native.toast_trans(message);
    }
  }

  async confirm() {
    if (!this.transport || this.signing) return;

    try {
      Logger.log('wallet', 'LedgerSignComponent signing')
      this.signing = true;
      await this.signTransaction();
      if (this.signSucceeded) {
        void this.disconnect();
        void this.modalCtrl.dismiss({
          signed: this.signSucceeded
        });
      }
    } catch (err) {
      Logger.warn("wallet", "LedgerSignComponent sign failed:", err)
    } finally {
      this.signing = false;
    }
  }

  cancelOperation() {
    Logger.log("wallet", "Ledger connection cancelled");
    void this.disconnect();
    void this.modalCtrl.dismiss();
  }
}
