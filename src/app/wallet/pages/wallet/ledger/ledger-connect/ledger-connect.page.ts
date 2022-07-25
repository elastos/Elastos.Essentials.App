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
import { DisconnectedDeviceDuringOperation } from '@ledgerhq/errors';
import Transport from '@ledgerhq/hw-transport';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { MenuSheetMenu } from 'src/app/components/menu-sheet/menu-sheet.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import BluetoothTransport from 'src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNetworksService, MAINNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { LedgerAccountType } from 'src/app/wallet/model/ledger.types';
import { BTCAddressType, BTCLedgerApp } from 'src/app/wallet/model/ledger/btc.ledgerapp';
import { ELAAddressType, ELALedgerApp } from 'src/app/wallet/model/ledger/ela.ledgerapp';
import { EVMAddressType, EVMLedgerApp } from 'src/app/wallet/model/ledger/evm.ledgerapp';
import { AnyLedgerAccount, LedgerAddressType, LedgerApp } from 'src/app/wallet/model/ledger/ledgerapp';
import { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import { LedgerAccountOptions } from 'src/app/wallet/model/masterwallets/wallet.types';
import { BTCNetworkBase } from 'src/app/wallet/model/networks/btc/network/btc.base.network';
import { ElastosMainChainNetworkBase } from 'src/app/wallet/model/networks/elastos/mainchain/network/elastos.networks';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

const TAG = 'ledger';

export enum LedgerConnectType {
  CreateWallet = 'create',// Get address to create wallet
  AddAccount = 'add',     // Add address to existing wallet
}

@Component({
    selector: 'app-ledger-connect',
    templateUrl: './ledger-connect.page.html',
    styleUrls: ['./ledger-connect.page.scss'],
})
export class LedgerConnectPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public device = null;
    private ledgerConnectType: LedgerConnectType = null;
    public transport: Transport = null;
    public connecting = false;
    public connectError = false;
    public gettingAddresses = false;
    private failedToGetAddress = false;

    public addresses: AnyLedgerAccount[] = [];
    // for test
    /* public addresses: AnyLedgerAccount[] = [
        { 'type': LedgerAccountType.EVM, addressType: null, 'address': '0xC7Da7De66A8Bc2D84E17D14906128179D015cE3A', 'pathIndex': 0, 'path': "44'/60'/0'/0/0", 'publicKey': '' },
        { 'type': LedgerAccountType.EVM, addressType: null, 'address': '0x60583B3465D2e886C1C2E4304af7eC784660F95a', 'pathIndex': 1, 'path': "44'/60'/0'/0/1", 'publicKey': '' },
        { 'type': LedgerAccountType.BTC, addressType: "segwit", 'address': 'tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6', 'pathIndex': 0, 'path': "84'/1'/0'/0/0", 'publicKey': '' },
        { 'type': LedgerAccountType.ELA, addressType: null, 'address': 'EUhGr6QnPemfWszK2BjtrsFWprHFStpX4x', 'pathIndex': 0, 'path': "44'/0'/0'/0/0", 'publicKey': '' },
        { 'type': LedgerAccountType.ELA, addressType: null, 'address': 'EdxJmBY1aCuH83nshnErQeKykX2FAWixxu', 'pathIndex': 0, 'path': "44'/2305'/0'/0/0", 'publicKey': '046954ec013d77e4c247964e905d78736c76a4e32a7479eba3f55f1d933b70034d548cd19c93f222118c6a4a80bc2bf4f21099919776e225ed7727e76bc880be86' }
    ]; */

    private masterWalletId = '';
    public selectedNetwork: AnyNetwork = null;
    private preNetwork: AnyNetwork = null; // We should create a new transport if we changed the network.
    private walletName = '';
    private walletAddress = '';
    public shouldPickAddressType = false;

    private ledgerApp: LedgerApp<any> = null;

    private addressType: LedgerAddressType = null;
    private addressPath = '';
    private accountIndex = -1;
    private type: LedgerAccountType = null;
    private publicKey = '';

    public errorMessge = '';
    public ledgerNanoAppname = '';

    private connectDeviceTimerout: any = null;

    public ledgerConnectStatus = new BehaviorSubject<boolean>(false);


    constructor(
        public events: GlobalEvents,
        public native: Native,
        public router: Router,
        private authService: AuthService,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private walletNetworkUIService: WalletNetworkUIService,
        private globalNativeService: GlobalNativeService,
        public walletService: WalletService,
    ) { }

    ngOnInit() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.device = navigation.extras.state.device;
            this.ledgerConnectType = navigation.extras.state.type;
            Logger.log(TAG, 'LedgerConnectPage device:', this.device)
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.ledger-connect"));
        this.connectDevice();
    }

    ionViewWillLeave() {
        if (this.transport) {
            void this.transport.close();
        }
        this.closeTimeout();
    }

    private async doConnect() {
        try {
            if (this.transport) {
                await this.transport.close();
                this.transport = null;
                this.ledgerConnectStatus.next(false);
            }
            this.connecting = true;
            this.connectError = false;
            this.transport = await BluetoothTransport.open(this.device.id);
            this.closeTimeout();
            this.ledgerConnectStatus.next(true);
        }
        catch (e) {
            Logger.error('ledger', ' initLedger error:', e);
            this.connectError = true;
        }
        this.connecting = false;
    }

    // TODO: Why BluetoothTransport.open can work for the first time, but no return for the second time?
    // if the BluetoothTransport.open can not return, we should connect device again.
    private connectDevice() {
        if (this.transport) return;

        void this.doConnect();

        this.connectDeviceTimerout = setTimeout(() => {
            Logger.warn('ledger', ' Timeout, Connect device again');
            void this.connectDevice();
        }, 3000);
    }

    //
    private async reConnectDecice() {
      if (this.transport) {
        await this.transport.close();
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

    private async refreshAddresses() {
        // Every time we change the app on ledger, we need to reconnect ledger.
        if (this.failedToGetAddress) {
          await this.reConnectDecice();
          this.createLedgerApp();
        }

        this.gettingAddresses = true;
        try {
            this.addresses = await this.ledgerApp.getAddresses(this.addressType, 0, 5, false);
            this.gettingAddresses = false;
            this.failedToGetAddress = false;
        }
        catch (e) {
            this.gettingAddresses = false;
            this.failedToGetAddress = true;

            // CustomError -- statusCode 25873(0x6511) name: DisconnectedDeviceDuringOperation -- the app is not started.
            // CustomError -- message: DisconnectedDeviceDuringOperation name:DisconnectedDeviceDuringOperation
            // CustomError -- message: An action was already pending on the Ledger device. Please deny or reconnect. name: TransportRaceCondition
            // TransportStausError -- statusCode: 28160(0x6e00)  -- open the wrong app
            // TransportStausError -- statusCode: 27013(0x6985)  -- user canceled the transaction
            // TransportErro -- id: TransportLocked name: TransportError message: Ledger Device is busy (lock getAddress)
            // if (e.statusCode == 27013) return;

            // if the ledger is disconnected, we need connect ledger again.
            if (e instanceof DisconnectedDeviceDuringOperation || e.id === 'TransportLocked' || e.name === 'TransportRaceCondition') {
              void this.refreshAddresses();
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

    hasGotAddress() {
        return this.addresses.length > 0;
    }

    showAddresses() {
        return this.addresses;
    }

    public shouldShowGetAddressButton() {
        return (this.failedToGetAddress || this.shouldPickAddressType) && !this.hasGotAddress();
    }

    public async pickNetwork() {
        if (!this.transport) {
            Logger.warn(TAG, 'Ledger is disconnected!')
            return;
        }
        this.selectedNetwork = await this.walletNetworkUIService.pickNetwork();
        if (!this.selectedNetwork) return;

        // Reset addresses
        this.addresses = [];

        if (this.preNetwork && (this.preNetwork != this.selectedNetwork)) {
          await this.reConnectDecice();
        }
        this.preNetwork = this.selectedNetwork;

        this.createLedgerApp();

        if (!this.shouldPickAddressType)
          void this.refreshAddresses();
    }

    private createLedgerApp() {
      // Prepare the address type selection, or auto-select it.
      switch (this.selectedNetwork.key) {
        case BTCNetworkBase.networkKey:
            this.shouldPickAddressType = true;
            this.addressType = BTCAddressType.SEGWIT;
            this.ledgerApp = new BTCLedgerApp(this.transport);
            let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
            if (network === MAINNET_TEMPLATE) {
                this.ledgerNanoAppname = "Bitcoin"
            } else {
                this.ledgerNanoAppname = "Bitcoin Test"
            }
            break;
        case ElastosMainChainNetworkBase.networkKey:
            this.shouldPickAddressType = false;
            this.addressType = ELAAddressType.M2305;
            this.ledgerApp = new ELALedgerApp(this.transport);
            this.ledgerNanoAppname = "Elastos"
            break;
        default: // Consider all other networks as EVMs - auto select the only type
            this.shouldPickAddressType = false;
            this.addressType = EVMAddressType.EVM_STANDARD;
            this.ledgerApp = new EVMLedgerApp(this.transport);
            this.ledgerNanoAppname = "Ethereum"
      }
    }

    private buildBTCAddressTypeMenuItems(): MenuSheetMenu[] {
        return [
            {
                title: "Native Segwit",
                routeOrAction: () => {
                    this.addressType = BTCAddressType.SEGWIT;
                    // Reset addresses
                    this.addresses = [];
                    void this.refreshAddresses();
                }
            },
            {
                title: "Legacy",
                routeOrAction: () => {
                    this.addressType = BTCAddressType.LEGACY;
                    // Reset addresses
                    this.addresses = [];
                    void this.refreshAddresses();
                }
            }
        ]
    }

    /**
     * Choose an address type, according to the selected network
     */
    public pickAddressType() {
        let menuItems: MenuSheetMenu[] = null;
        switch (this.selectedNetwork.key) {
            case BTCNetworkBase.networkKey:
                menuItems = this.buildBTCAddressTypeMenuItems();
                break;
            default:  // We should not try to pick anything, addres type should be already set when picking the network
                return;
        }

        let menu: MenuSheetMenu = {
            title: GlobalTranslationService.instance.translateInstant("wallet.ledger-choose-address-type"),
            items: menuItems
        };

        void this.globalNativeService.showGenericBottomSheetMenuChooser(menu);
    }

    public getDisplayableAddressType(): string {
        switch (this.addressType) {
            case BTCAddressType.SEGWIT: return "Native Segwit";
            case BTCAddressType.LEGACY: return "Legacy";
        }
    }

    public async selectAddress(account: AnyLedgerAccount) {
        Logger.log(TAG, 'Selected account/address:', account)
        if (this.ledgerConnectType == LedgerConnectType.CreateWallet) {
          await this.createLedgerWallet(account);
        } else {
          let masterWallet = this.walletService.getActiveMasterWallet();
          let accountOpt: LedgerAccountOptions = { type: account.type, accountID: account.address, accountPath: account.path, publicKey: account.publicKey };
          (masterWallet as LedgerMasterWallet).addAccountOptions(accountOpt);
          void masterWallet.save();

          await this.walletService.activateMasterWallet(masterWallet);
          this.native.setRootRouter("/wallet/wallet-home");
        }
    }

    private async createLedgerWallet(account: AnyLedgerAccount) {
        this.masterWalletId = this.walletService.createMasterWalletID();

        this.getDefaultLedgerWalletName();
        this.walletAddress = account.address;
        this.accountIndex = account.pathIndex;
        this.addressPath = account.path;
        this.type = account.type;
        this.publicKey = account.publicKey;

        try {
            const payPassword = await this.authService.createAndSaveWalletPassword(this.masterWalletId);
            if (payPassword) {
                await this.native.showLoading(this.translate.instant('common.please-wait'));
                await this.importWalletWithLedger(payPassword);

                // switch network if the picked network isn't the active network.
                if (this.selectedNetwork != WalletNetworkService.instance.activeNetwork.value) {
                    void WalletNetworkService.instance.setActiveNetwork(this.selectedNetwork);
                }
            }
        }
        catch (err) {
            Logger.error('wallet', 'Wallet import error:', err);
        }
        finally {
            await this.native.hideLoading();
        }
    }

    private async importWalletWithLedger(payPassword: string) {
        Logger.log('wallet', 'create ledger wallet');
        await this.walletService.newLedgerWallet(
            this.masterWalletId,
            this.walletName,
            this.device.id,
            this.walletAddress,
            this.accountIndex,
            this.addressPath,
            this.type,
            this.publicKey
        );
        this.native.setRootRouter("/wallet/wallet-home");

        this.events.publish("masterwalletcount:changed", {
            action: 'add',
            walletId: this.masterWalletId
        });

        this.native.toast_trans('wallet.ledger-connect-ledger-sucess');
    }

    private getDefaultLedgerWalletName() {
        let index = 1;
        let nameValid = false;
        let walletName = ''
        do {
            walletName = 'Ledger' + index++;
            nameValid = this.walletService.walletNameExists(walletName);
        } while (nameValid);

        this.walletName = walletName;
    }

    public reset() {
      if (this.transport) {
        void this.transport.close();
        this.transport = null;
      }
      this.closeTimeout();
    }

    public connect() {
      this.connectDevice();
    }
}
