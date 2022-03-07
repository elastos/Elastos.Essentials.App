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
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

const TAG = 'ledger';

type LedgerAccount = {
    type: string;
    address: string;
    pathIndex: number;
    path: string;
}

@Component({
    selector: 'app-ledger-connect',
    templateUrl: './ledger-connect.page.html',
    styleUrls: ['./ledger-connect.page.scss'],
})
export class LedgerConnectPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    // public device = null;
    public device = {id:'11:22:33:44:55:66'};
    public transport: Transport = null;

    private paths = ["44'/60'/x'/0/0", "44'/60'/0'/x"];
    // public addresses = {};
    // for test
    public addresses: LedgerAccount[] = [
        {'type':'EVM', 'address': '0xC7Da7De66A8Bc2D84E17D14906128179D015cE3A', 'pathIndex': 0, 'path': "44'/60'/x'/0/0"},
        {'type':'EVM', 'address': '0x60583B3465D2e886C1C2E4304af7eC784660F95a', 'pathIndex': 1, 'path': "44'/60'/x'/0/1"}
    ]

    private masterWalletId = '';
    private walletName = '';
    private walletAddress = ''
    private addressPathIndex = 0;

    public errorMessge = '';

    constructor(
        public events: Events,
        public native: Native,
        public router: Router,
        private authService: AuthService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public walletService: WalletService,
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
        try {
            if (this.transport) {
                await this.transport.close();
            }
            this.transport = await BluetoothTransport.open(this.device as any);
            Logger.log('ledger', ' initLedger this.transport:', this.transport)
        }
        catch (e) {
            Logger.error('ledger', ' initLedger error:', e)
        }
    }

    async getAddresses(accountsLength = 5, accountsOffset = 0) {
        try {
          const eth = new AppEth(this.transport);
          this.addresses = [];
          for (let i = accountsOffset; i < accountsOffset + accountsLength; i++) {
            // const x = Math.floor(i / this.paths.length);
            // const pathIndex = i - this.paths.length * x;
            // const path = this.paths[pathIndex].replace("x", String(x));
            const path = this.paths[0].replace("x", String(i));
            const address = await eth.getAddress(path, false, false);

            this.zone.run( ()=> {
                this.addresses.push({
                    type:'EVM',
                    address:address.address.toLowerCase(),
                    pathIndex:i,
                    path
                })
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

    async selectAddress(address:LedgerAccount) {
        Logger.log(TAG, 'select address:', address)
        await this.createLedgerWallet(address.address, address.pathIndex);
    }

    async createLedgerWallet(address: string, accountPathIndex: number) {
        this.masterWalletId = this.walletService.createMasterWalletID();

        this.getDefaultLedgerWalletName();
        this.walletAddress = address;
        this.addressPathIndex = accountPathIndex;

        try {
            const payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
            if (payPassword) {
                await this.native.showLoading(this.translate.instant('common.please-wait'));
                await this.importWalletWithLedger(payPassword);
            }
        }
        catch (err) {
            Logger.error('wallet', 'Wallet import error:', err);
        }
        finally {
            await this.native.hideLoading();
        }
    }
    async importWalletWithLedger(payPassword: string) {
        Logger.log('wallet', 'create ledger wallt');
        await this.walletService.newLedgerWallet(
            this.masterWalletId,
            this.walletName,
            this.device.id,
            this.walletAddress,
            this.addressPathIndex,
        );
        this.native.setRootRouter("/wallet/wallet-home");

        this.events.publish("masterwalletcount:changed", {
            action: 'add',
            walletId: this.masterWalletId
        });

        this.native.toast_trans('wallet.import-connect-ledger-sucess');
    }

    getDefaultLedgerWalletName() {
        let index = 1;
        let nameValid = false;
        let walletName = ''
        do {
            walletName = 'Ledger' + index++;
            nameValid = this.walletService.walletNameExists(walletName);
        } while (nameValid);

        this.walletName = walletName;
    }
}
