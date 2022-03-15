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

import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import Transport from '@ledgerhq/hw-transport';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { LeddgerAccountType } from 'src/app/wallet/model/ledger.types';
import { BTCLedgerApp } from 'src/app/wallet/model/ledger/btc.ledgerapp';
import { EVMLedgerApp } from 'src/app/wallet/model/ledger/evm.ledgerapp';
import { LedgerAccount } from 'src/app/wallet/model/ledger/ledgerapp';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

const TAG = 'ledger';

@Component({
    selector: 'app-ledger-connect',
    templateUrl: './ledger-connect.page.html',
    styleUrls: ['./ledger-connect.page.scss'],
})
export class LedgerConnectPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    // public device = null;
    public device = {id:'DE:F1:60:10:C6:9D'};
    public transport: Transport = null;
    public connecting = false;

    // public addresses = {};
    // for test
    public addresses: LedgerAccount[] = [
        {'type':LeddgerAccountType.EVM, 'address': '0xC7Da7De66A8Bc2D84E17D14906128179D015cE3A', 'pathIndex': 0, 'path': "44'/60'/x'/0/0"},
        {'type':LeddgerAccountType.EVM, 'address': '0x60583B3465D2e886C1C2E4304af7eC784660F95a', 'pathIndex': 1, 'path': "44'/60'/x'/0/1"},
        {'type':LeddgerAccountType.BTC, 'address': 'tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6', 'pathIndex': 0, 'path': "84'/1'/x'/0/0"}
    ]

    private masterWalletId = '';
    private walletName = '';
    private walletAddress = ''
    private addressPathIndex = 0;
    private type : LeddgerAccountType = null;

    public errorMessge = '';

    constructor(
        public events: Events,
        public native: Native,
        public router: Router,
        private authService: AuthService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public walletService: WalletService,
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
                this.transport = null;
            }
            this.connecting = true;
            this.transport = await BluetoothTransport.open(this.device.id);
            Logger.log('ledger', ' initLedger this.transport:', this.transport)
        }
        catch (e) {
            Logger.error('ledger', ' initLedger error:', e)
        }
        this.connecting = false;
    }

    async getEVMAddresses(accountsLength = 5, accountsOffset = 0) {
      try {
          let ethApp = new EVMLedgerApp(this.transport);
          this.addresses = await ethApp.getAddresses(accountsOffset, accountsLength, false);

          Logger.warn('ledger', "EVM Addresses :", this.addresses);
        } catch (e) {
          Logger.warn(TAG, 'getAddresses exception:', e)
        }
    }

    async getBTCAddress(accountsLength = 2, accountsOffset = 0) {
      try {
        let btcApp = new BTCLedgerApp(this.transport);
        this.addresses = await btcApp.getAddresses(accountsOffset, accountsLength, false);

        Logger.warn('ledger', "BTC Addresses :", this.addresses);
      } catch (e) {
        Logger.warn(TAG, 'getAddresses exception:', e)
      }
    }

    async getElaAddress() {
        // try {
        //     const ela = new Ela(this.transport);
        //     Logger.warn('ledger', "call ela.getAddress ");
        //     const r = await ela.getAddress();
        //     Logger.warn('ledger', "ELA addresses :", r);
        // } catch (err) {
        //     Logger.warn('ledger', "getAddress error :", err);
        // }
    }

    hasGotAddress() {
        return Object.keys(this.addresses).length > 0;
    }

    showAddresses() {
        return Object.values(this.addresses);
    }

    async selectAddress(account:LedgerAccount) {
        Logger.log(TAG, 'select address:', account)
        await this.createLedgerWallet(account);
    }

    async createLedgerWallet(account:LedgerAccount) {
        this.masterWalletId = this.walletService.createMasterWalletID();

        this.getDefaultLedgerWalletName();
        this.walletAddress = account.address;
        this.addressPathIndex = account.pathIndex;
        this.type = account.type;

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
            this.type,
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
