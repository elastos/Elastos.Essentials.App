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
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { NetworkWallet } from 'src/app/wallet/model/wallets/networkwallet';
import { StandardCoinName } from '../../../model/coin';
import { WalletAccount, WalletAccountType } from '../../../model/WalletAccount';
import { AuthService } from '../../../services/auth.service';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletService } from '../../../services/wallet.service';


@Component({
    selector: 'app-crmemberregister',
    templateUrl: './crmemberregister.page.html',
    styleUrls: ['./crmemberregister.page.scss'],
})
export class CRMemberRegisterPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    networkWallet: NetworkWallet = null;
    intentTransfer: IntentTransfer;
    transfer: Transfer = null;

    balance: BigNumber; // ELA

    elastosChainCode: StandardCoinName; // IDChain
    hasOpenIDChain = false;
    walletInfo: WalletAccount = new WalletAccount();

    transFunction: any;
    title = '';
    info = '';

    private depositAmount = new BigNumber(500000000000); // 5000 ELA

    constructor(
        public walletManager: WalletService,
        private globalIntentService: GlobalIntentService,
        public popupProvider: PopupProvider,
        private coinTransferService: CoinTransferService,
        private authService: AuthService,
        public translate: TranslateService,
        public native: Native,
        public zone: NgZone
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setNavigationMode(null);
    }

    ionViewDidEnter() {
        // TODO
        // this.titleBar.setTitle(this.translate.instant(''));
        if (this.walletInfo.Type === WalletAccountType.MULTI_SIGN) {
            // TODO: reject didtransaction if multi sign (show error popup)
            void this.cancelOperation();
        }
    }

    init() {
        this.transfer = this.coinTransferService.transfer;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.elastosChainCode = this.coinTransferService.elastosChainCode;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);

        switch (this.transfer.action) {
            case 'crmemberregister':
                this.transFunction = this.createRegisterCRTransaction;
                this.title = 'wallet.text-crmember-register';
                this.info = 'wallet.text-you-are-going-to-register-crmember';
                break;
            case 'crmemberupdate':
                this.transFunction = this.createUpdateCRTransaction;
                this.title = 'wallet.text-crmember-update';
                this.info = 'wallet.text-you-are-going-to-update-crmember';
                break;
            case 'crmemberunregister':
                this.transFunction = this.createUnregisterCRTransaction;
                this.title = 'wallet.text-crmember-unregister';
                this.info = 'wallet.text-you-are-going-to-unregister-crmember';
                break;
            case 'crmemberretrieve':
                this.transFunction = this.createRegisterCRTransaction;
                this.title = 'wallet.text-crmember-retrieve';
                this.info = 'wallet.text-you-are-going-to-uretrive-deposit';
                break;
            default:
                break;
        }

        this.balance = this.networkWallet.getSubWalletBalance(this.elastosChainCode);
    }

    /**
     * Cancel the vote operation. Closes the screen and goes back to the calling application after
     * sending the intent response.
     */
    async cancelOperation() {
        await this.globalIntentService.sendIntentResponse(
            { txid: null, status: 'cancelled' },
            this.intentTransfer.intentId
        );
    }

    goTransaction() {
        this.checkValue();
    }

    checkValue() {
        if (this.balance.lt(0.0002)) {
            void this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.text-did-balance-not-enough');
            return;
        }

        this.transFunction();
    }

    createRegisterCRTransaction() {
        Logger.log('wallet', 'Calling createRegisterCRTransaction()');

        // const crPublickeys = await this.walletManager.spvBridge.getAllPublicKeys(this.masterWallet.id, StandardCoinName.IDChain, 0, 1);
        // const crPublicKey = crPublickeys.PublicKeys[0];

        // const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.masterWallet.id, this.elastosChainCode,
        //         crPublicKey, this.transfer.did, this.transfer.nickname, this.transfer.url, this.transfer.location);
        // const digest = payload.Digest;

        // const payPassword = await this.authService.getWalletPassword(this.masterWallet.id);
        // if (payPassword === null) {// cancelled by user
        //     return;
        // }

        // payload.Signature = await this.walletManager.spvBridge.didSignDigest(this.masterWallet.id,
        //         this.transfer.did, digest, payPassword);

        // this.transfer.rawTransaction  = await this.walletManager.spvBridge.createRegisterCRTransaction(this.masterWallet.id, this.elastosChainCode,
        //         '', payload, this.depositAmount.toString(), this.transfer.memo);
        // this.walletManager.openPayModal(this.transfer); // TODO: USE signAndSendRawTransaction
    }

    createUpdateCRTransaction() {
        Logger.log('wallet', 'Calling createUpdateCRTransaction()');

        // const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.masterWallet.id,
        //         this.elastosChainCode, this.transfer.crPublicKey, this.transfer.did, this.transfer.nickname,
        //         this.transfer.url, this.transfer.location);
        // this.transfer.rawTransaction  = await this.walletManager.spvBridge.createUpdateCRTransaction(this.masterWallet.id, this.elastosChainCode,
        //         '', payload, this.transfer.memo);

        // let sourceSubwallet = this.masterWallet.getSubWallet(this.elastosChainCode);
        // const result = await sourceSubwallet.signAndSendRawTransaction(this.transfer.rawTransaction, this.transfer);
        // await this.globalIntentService.sendIntentResponse(result, this.transfer.intentId);
    }

    createUnregisterCRTransaction() {
        Logger.log('wallet', 'Calling createUnregisterCRTransaction()');

        // const payload = await this.walletManager.spvBridge.generateUnregisterCRPayload(this.masterWallet.id, this.elastosChainCode,
        //         this.transfer.crDID);
        // this.transfer.rawTransaction  = await this.walletManager.spvBridge.createUnregisterCRTransaction(this.masterWallet.id, this.elastosChainCode,
        //         '', payload, this.transfer.memo);
        // this.walletManager.openPayModal(this.transfer); // TODO: USE signAndSendRawTransaction
    }

    createRetrieveCRDepositTransaction() {
        Logger.log('wallet', 'Calling createRetrieveCRDepositTransaction()');

        // this.transfer.rawTransaction  = await this.walletManager.spvBridge.createRetrieveCRDepositTransaction(this.masterWallet.id, this.elastosChainCode,
        //     this.transfer.crPublicKey, this.transfer.account, this.transfer.memo);
        // this.walletManager.openPayModal(this.transfer); // TODO: USE signAndSendRawTransaction
    }
}
