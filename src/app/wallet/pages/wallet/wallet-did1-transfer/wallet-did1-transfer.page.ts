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

import { Component, OnInit, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Config } from '../../../config/Config';
import { Native } from '../../../services/native.service';
import { WalletManager } from '../../../services/wallet.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { TransferType, Transfer } from '../../../services/cointransfer.service';
import { StandardCoinName, CoinType } from '../../../model/Coin';
import { SubWallet } from '../../../model/wallets/SubWallet';
import { TxConfirmComponent } from '../../../components/tx-confirm/tx-confirm.component';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../services/currency.service';
import { UiService } from '../../../services/ui.service';
import { StandardSubWallet } from '../../../model/wallets/StandardSubWallet';
import BigNumber from 'bignumber.js';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { TxSuccessComponent } from '../../../components/tx-success/tx-success.component';
import { MainAndIDChainSubWallet } from '../../../model/wallets/MainAndIDChainSubWallet';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IntentService, ScanType } from 'src/app/wallet/services/intent.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';

/**
 * This screen is a legacy support to let users who have funds on DID 1 migrate them back to mainchain.
 */
@Component({
    selector: 'app-wallet-did1-transfer',
    templateUrl: './wallet-did1-transfer.page.html',
    styleUrls: ['./wallet-did1-transfer.page.scss']
})
export class WalletDID1TransferPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: MasterWallet;
    public transferType: TransferType;
    public elastosChainCode: StandardCoinName;

    // User inputs
    public toAddress: string;
    public amount: number; // Here we can use JS "number" type, for now we consider we will never transfer a number that is larger than JS's MAX INT.

    // Display recharge wallets
    public fromSubWallet: SubWallet;
    public toSubWallet: SubWallet = null;

    // Submit transaction
    public transaction: any;

    // Helpers
    public Config = Config;
    public CoinType = CoinType;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    // Modal
    private modal: any = null;

    private syncSubscription: Subscription = null;
    private addressUpdateSubscription: Subscription = null;

    // Input
    public inputActive = false;

    constructor(
        public route: ActivatedRoute,
        public walletManager: WalletManager,
        public native: Native,
        private router: Router,
        public events: Events,
        public zone: NgZone,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        private intentService: IntentService,
        public uiService: UiService,
        public keyboard: Keyboard
    ) {
    }

    async ngOnInit() {
        await this.init();
    }

    async ionViewWillEnter() {
    }

    async ionViewDidEnter() {
    }

    ionViewWillLeave() {
        if (this.native.popup) {
            this.native.popup.dismiss();
        }
    }

    ngOnDestroy() {
    }

    async init() {
        const navigation = this.router.getCurrentNavigation();
        console.log("navigation", navigation, this.router, await this.route.snapshot)
        // General Values
        let masterWalletId = navigation.extras.state.masterWalletId;

        this.masterWallet = this.walletManager.getMasterWallet(masterWalletId);
        this.transferType = TransferType.WITHDRAW; // From IDChain (DID1) to Mainchain
        this.elastosChainCode = StandardCoinName.IDChain;

        this.fromSubWallet = this.masterWallet.getSubWallet(this.elastosChainCode);

        console.log("masterWalletId", masterWalletId, this.toSubWallet, this.fromSubWallet)

        Logger.log('wallet', 'Balance', this.masterWallet.subWallets[this.elastosChainCode].getDisplayBalance());

        // Setup page display
        this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-withdraw-title", {coinName: this.elastosChainCode}));
        this.toSubWallet = this.masterWallet.getSubWallet(StandardCoinName.ELA);

        // Setup params for withdraw transaction
        this.transaction = this.createWithdrawTransaction;
        this.toAddress = await this.toSubWallet.createAddress();
        // Cross chain need 20000 SELA.
        // this.amount = this.fromSubWallet.getDisplayAmount(this.fromSubWallet.balance.minus(20000)).toNumber();
        this.amount = this.fromSubWallet.getDisplayAmount(this.fromSubWallet.balance).toNumber();

        Logger.log('wallet', 'Transferring from..', this.fromSubWallet);
        Logger.log('wallet', 'Transferring To..', this.toSubWallet);
        Logger.log('wallet', 'Subwallet address', this.toAddress);
    }

    /**
     * From sidechain (ID, ETH) to mainchain
     */
    async createWithdrawTransaction() {
        const rawTx = await this.fromSubWallet.createWithdrawTransaction(
            this.toAddress,
            -1,//this.amount,
            "Funds migration from DID 1.0 chain",
            null,
            null
        );

        if (rawTx) {
          const transfer = new Transfer();
          Object.assign(transfer, {
              masterWalletId: this.masterWallet.id,
              elastosChainCode: this.elastosChainCode,
              rawTransaction: rawTx,
              payPassword: '',
              action: null,
              intentId: null,
          });

          const result = await this.fromSubWallet.signAndSendRawTransaction(rawTx, transfer);
          if (result.published)
              this.showSuccess();
        }
    }

    goScan() {
        this.intentService.scan(ScanType.Address);
    }

    async goTransaction() {
        await this.startTransaction();
    }

    async startTransaction() {
        const mainAndIDChainSubWallet = this.masterWallet.subWallets[this.elastosChainCode] as MainAndIDChainSubWallet;
        try {
            const index = this.toAddress.indexOf(':');
            if (index !== -1) {
                this.toAddress = this.toAddress.substring(index + 1);
            }

            const toelastosChainCode = this.toSubWallet ? this.toSubWallet.id : this.elastosChainCode;
            const isAddressValid = await this.isSubWalletAddressValid(this.masterWallet.id, toelastosChainCode, this.toAddress);
            if (!isAddressValid) {
                this.native.toast_trans('wallet.not-a-valid-address');
                return;
            }

            if (this.transferType === TransferType.PAY) {
                this.transaction();
            } else {
                this.showConfirm();
            }
        } catch (error) {
            this.native.toast_trans('wallet.not-a-valid-address');
        }
    }

    private async isSubWalletAddressValid(masterWalletId: string, elastosChainCode: string, address: string) {
        let elastosChainCodeTemp = elastosChainCode;
        switch (elastosChainCodeTemp) {
            case StandardCoinName.ELA:
            case StandardCoinName.IDChain:
            case StandardCoinName.ETHSC:
                break;
            default:
              elastosChainCodeTemp = StandardCoinName.ETHSC;
                break;
        }

        const isAddressValid = await this.walletManager.spvBridge.isSubWalletAddressValid(
            masterWalletId,
            elastosChainCodeTemp,
            address
        );
        return isAddressValid;
    }

    async showConfirm() {
        const txInfo = {
            type: this.transferType,
            transferFrom: this.elastosChainCode,
            transferTo: this.toAddress,
            amount: this.amount,
            memo: null,
        };

        this.native.popup = await this.native.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-tx-component',
            component: TxConfirmComponent,
            componentProps: {
                txInfo: txInfo
            }
        });
        this.native.popup.onWillDismiss().then((params) => {
            this.native.popup = null;
            Logger.log('wallet', 'Confirm tx params', params);
            if (params.data && params.data.confirm) {
                this.transaction();
            }
        });
        return await this.native.popup.present();
    }

    async showSuccess() {
        this.native.popup = await this.native.popoverCtrl.create({
            mode: 'ios',
            cssClass: 'wallet-tx-component',
            component: TxSuccessComponent,
        });
        this.native.popup.onWillDismiss().then(() => {
            this.native.popup = null;
        });
        return await this.native.popup.present();
    }

    // Pay intent
    async cancelPayment() {
    }

    accMul(arg1, arg2) {
        let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try { m += s1.split(".")[1].length } catch (e) { }
        try { m += s2.split(".")[1].length } catch (e) { }
        return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m)
    }

    isStandardSubwallet(subWallet: SubWallet) {
        return subWallet instanceof StandardSubWallet;
    }

    convertAmountToBigNumber(amount: number) {
        return new BigNumber(amount);
    }

    showKeyboard() {
        this.keyboard.show();
    }

    hideKeyboard() {
        this.keyboard.hide();
    }

    keyboardIsVisible() {
        this.zone.run(() => {
            if(this.keyboard.isVisible) {
                return true;
            } else {
                return false;
            }
        })
    }
}
