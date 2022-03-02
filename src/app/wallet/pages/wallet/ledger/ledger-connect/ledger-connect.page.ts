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
import AppEth from "@ledgerhq/hw-app-eth";
import Transport from '@ledgerhq/hw-transport';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from 'src/app/wallet/services/native.service';

const TAG = 'ledger';

@Component({
    selector: 'app-ledger-connect',
    templateUrl: './ledger-connect.page.html',
    styleUrls: ['./ledger-connect.page.scss'],
})
export class LedgerConnectPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public device = null;
    public transport: Transport = null;

    private paths = ["44'/60'/x'/0/0", "44'/60'/0'/x"];
    private addressToPathMap = {};
    public addresses = {};

    public errorMessge = '';

    constructor(
        public native: Native,
        public router: Router,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private zone: NgZone,
    ) {}

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.device = navigation.extras.state.device;
            Logger.log(TAG, ' device:', this.device)
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.ledger-connect"));
    }

    ionViewWillLeave() {
        if (this.transport) {
            void this.transport.close();
        }
    }

    async doConnect() {
        // try {
            if (this.transport) {
                await this.transport.close();
            }
            this.transport = await BluetoothTransport.open(this.device);
            Logger.warn('ledger', ' initLedger this.transport:', this.transport)
        // }
        // catch (e) {
        //     Logger.error('ledger', ' initLedger error:', e)
        // }
    }

    async getAddresses(accountsLength = 5, accountsOffset = 0) {
        try {
          const eth = new AppEth(this.transport);
          for (let i = accountsOffset; i < accountsOffset + accountsLength; i++) {
            // const x = Math.floor(i / this.paths.length);
            // const pathIndex = i - this.paths.length * x;
            // const path = this.paths[pathIndex].replace("x", String(x));
            const path = this.paths[0].replace("x", String(i));
            const address = await eth.getAddress(path, false, false);

            this.zone.run( ()=> {
                this.addresses[path] = address.address;
                this.addressToPathMap[address.address.toLowerCase()] = path;
            })
          }
        } catch (e) {
            Logger.warn(TAG, 'getAddresses exception:', e)
        }
    }

    hasGotAddress() {
        return Object.keys(this.addresses).length > 0;
    }

    showAddresses() {
        return Object.values(this.addresses);
    }

    selectAddress(address) {
        Logger.log(TAG, 'select address:', address)
    }
}
