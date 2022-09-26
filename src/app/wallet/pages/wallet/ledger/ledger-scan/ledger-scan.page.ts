/*
* Copyright (c) 2021 Elastos Foundation
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { TransportError } from "@ledgerhq/hw-transport";
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BLECentralPluginBridge } from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BLECentralPluginBridge';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from 'src/app/wallet/services/native.service';
import { LedgerConnectType } from '../ledger-connect/ledger-connect.page';

const TAG = 'ledger';

@Component({
  selector: 'app-ledger-scan',
  templateUrl: './ledger-scan.page.html',
  styleUrls: ['./ledger-scan.page.scss'],
})
export class LedgerScanPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public device: BLECentralPlugin.PeripheralData = null;
  private bleManager: BLECentralPluginBridge = null;

  public scanning = false;
  public isBluetoothEnable = true;
  public supportOpeningBluetoothSetting = true;

  private ledgerConnectType: LedgerConnectType = LedgerConnectType.CreateWallet;

  private ErrorMessage_ListenTimeout = "No Ledger device found (timeout)";
  private ErrorMessage_NoDeviceFound = "No Ledger device found";

  constructor(
    private platform: Platform,
    public native: Native,
    public router: Router,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private zone: NgZone,
  ) {
    if (this.platform.platforms().indexOf('ios') >= 0) {
      this.supportOpeningBluetoothSetting = false;
    }

    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      if (navigation.extras.state.type)
        this.ledgerConnectType = navigation.extras.state.type;
    }
  }

  ngOnInit() {
    void this.initBLE();
  }

  ngOnDestroy() {
    if (this.bleManager) {
      void this.bleManager.stopStateNotifications();
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant("wallet.ledger-scan"));
  }

  async initBLE() {
    this.bleManager = new BLECentralPluginBridge();
    if (this.bleManager) {
      await this.bleManager.stopStateNotifications();
      this.bleManager.startStateNotifications(async (state) => {
        switch (state) {
          case "on":
            // BluetoothTransport.listen will call startStateNotifications, so we need to call stopStateNotifications.
            await this.bleManager.stopStateNotifications();
            void this.doScan();
            break;
          case 'off':
            this.isBluetoothEnable = false;
            this.device = null;
            break;
        }
      }, (error) => {
        Logger.warn(TAG, "startStateNotifications error " + error)
      });
    }
  }

  connectLedger() {
    Logger.log(TAG, "connectLedger:", this.device);
    if (this.device) {
      this.native.go("/wallet/ledger/connect", { device: this.device, type: this.ledgerConnectType });
    }
  }

  showBluetoothSetting() {
    void this.bleManager.showBluetoothSettings();
  }

  doScan() {
    this.device = null;

    void this.zone.run(async () => {
      this.isBluetoothEnable = await this.bleManager.isEnabled();
      if (this.isBluetoothEnable) {
        this.scanning = true;
        let ret = await this.searchLedgerDevice(10000).catch((e) => {
          Logger.warn(TAG, ' searchLedgerDevice exception ', e)
        })
        this.scanning = false;

        if (ret) {
          this.device = ret;
        }
      }
    });
  }

  searchLedgerDevice(listenTimeout?: number): Promise<BLECentralPlugin.PeripheralData> {
    return new Promise((resolve, reject) => {
      let found = false;
      const sub = BluetoothTransport.listen({
        next: (e) => {
          found = true;
          if (sub) sub.unsubscribe();
          if (listenTimeoutId) clearTimeout(listenTimeoutId);
          resolve(e.descriptor);
        },
        error: (e) => {
          Logger.warn(TAG, "listen error ", e);
          if (sub) sub.unsubscribe();
          if (listenTimeoutId) clearTimeout(listenTimeoutId);
          reject(e);
        },
        complete: () => {
          if (listenTimeoutId) clearTimeout(listenTimeoutId);
          if (!found) {
            reject(new TransportError(this.ErrorMessage_NoDeviceFound, "NoDeviceFound"));
          }
        },
      });
      const listenTimeoutId = listenTimeout
        ? setTimeout(() => {
          sub.unsubscribe();
          reject(new TransportError(this.ErrorMessage_ListenTimeout, "ListenTimeout"));
        }, listenTimeout)
        : null;
    });
  }
}
