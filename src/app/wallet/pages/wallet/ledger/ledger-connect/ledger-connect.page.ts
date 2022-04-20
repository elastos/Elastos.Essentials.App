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
import { ELALedgerApp } from 'src/app/wallet/model/ledger/ela.ledgerapp';
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
        {'type':LeddgerAccountType.EVM, 'address': '0xC7Da7De66A8Bc2D84E17D14906128179D015cE3A', 'pathIndex': 0, 'path': "44'/60'/0'/0/0", 'publicKey': ''},
        {'type':LeddgerAccountType.EVM, 'address': '0x60583B3465D2e886C1C2E4304af7eC784660F95a', 'pathIndex': 1, 'path': "44'/60'/0'/0/1", 'publicKey': ''},
        {'type':LeddgerAccountType.BTC, 'address': 'tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6', 'pathIndex': 0, 'path': "84'/1'/0'/0/0", 'publicKey': ''},
        {'type':LeddgerAccountType.ELA, 'address': 'EUhGr6QnPemfWszK2BjtrsFWprHFStpX4x', 'pathIndex': 0, 'path': "44'/0'/0'/0/0", 'publicKey': ''},
        {'type':LeddgerAccountType.ELA, 'address': 'EdxJmBY1aCuH83nshnErQeKykX2FAWixxu', 'pathIndex': 0, 'path': "44'/2305'/0'/0/0", 'publicKey': '046954ec013d77e4c247964e905d78736c76a4e32a7479eba3f55f1d933b70034d548cd19c93f222118c6a4a80bc2bf4f21099919776e225ed7727e76bc880be86'}
    ]

    private masterWalletId = '';
    private walletName = '';
    private walletAddress = '';
    private addressPath = '';
    private addressPathIndex = 0;
    private type : LeddgerAccountType = null;
    private publicKey = '';

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

        // for test
        // let elaApp = new Ela(this.transport);
        // let path = "44'/2305'/0'/0/1"
        // // let path = "44'/2305'/0'/0/0"
        // elaApp.showGetAddressApduMessage(path);

        // // let publicKey = '046954ec013d77e4c247964e905d78736c76a4e32a7479eba3f55f1d933b70034d548cd19c93f222118c6a4a80bc2bf4f21099919776e225ed7727e76bc880be86';
        // let publicKey = '0458ccacbd847e326a131f29425b6dd03153baa7b5847bfb4b82c0903f2ca377bd665f044e17b52b37c5caeaadd8491cf6bed7b8baf0a5c74ed60f301cec10fa9b';
        // let address = ELAAddressHelper.getAddressFromPublicKey(publicKey);
        // Logger.warn('wallet', 'address:', address)
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
            Logger.log(TAG, "EVM Addresses :", this.addresses);
        } catch (e) {
            Logger.warn(TAG, 'getAddresses exception:', e)
        }
    }

    async getBTCAddress(accountsLength = 2, accountsOffset = 0) {
        try {
            let btcApp = new BTCLedgerApp(this.transport);
            this.addresses = await btcApp.getAddresses(accountsOffset, accountsLength, false);

            Logger.log(TAG, "BTC Addresses :", this.addresses);
        } catch (e) {
            Logger.warn(TAG, 'getAddresses exception:', e)
        }
    }

    async getELAAddress(accountsLength = 2, accountsOffset = 0) {
        try {
            const elaApp = new ELALedgerApp(this.transport);
            this.addresses = await elaApp.getAddresses(accountsOffset, accountsLength, false);
            Logger.warn(TAG, "ELA addresses :", this.addresses);
        } catch (err) {
            Logger.warn('ledger', "getAddress exception :", err);
        }
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
        this.addressPath = account.path;
        this.type = account.type;
        this.publicKey = account.publicKey;

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
            this.addressPath,
            this.type,
            this.publicKey
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
