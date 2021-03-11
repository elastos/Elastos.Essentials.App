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

import { Component, OnInit, NgZone } from '@angular/core';
import { AppService } from '../../../services/app.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { WalletManager } from '../../../services/wallet.service';
import { MasterWallet } from '../../../model/wallets/MasterWallet';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { StandardCoinName } from '../../../model/Coin';
import { TranslateService } from '@ngx-translate/core';
import { SubWallet } from '../../../model/wallets/SubWallet';
import BigNumber from "bignumber.js";
import { UiService } from '../../../services/ui.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';


@Component({
    selector: 'app-esctransaction',
    templateUrl: './esctransaction.page.html',
    styleUrls: ['./esctransaction.page.scss'],
})
export class EscTransactionPage implements OnInit {

    private masterWallet: MasterWallet = null;
    private ethSidechainSubWallet: SubWallet = null;
    private intentTransfer: IntentTransfer;
    private walletInfo = {};
    public balance: BigNumber; // ELA
    public chainId: string; // ETHSC
    public hasOpenETHSCChain = false;

    constructor(
        public walletManager: WalletManager,
        public appService: AppService,
        public popupProvider: PopupProvider,
        private coinTransferService: CoinTransferService,
        private globalIntentService: GlobalIntentService,
        public native: Native,
        public zone: NgZone,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        public uiService: UiService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        // TODO @chad this.appService.setTitleBarTitle(this.translate.instant('esctransaction-title'));
    }

    ionViewDidEnter() {
      if (this.walletInfo["Type"] === "Multi-Sign") {
          // TODO: reject esctransaction if multi sign (show error popup)
          this.cancelOperation();
      }
    }

    async init() {
        this.chainId = this.coinTransferService.chainId;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);

        if (this.chainId === StandardCoinName.ETHSC && !this.masterWallet.hasSubWallet(StandardCoinName.ETHSC)) {
            await this.notifyNoETHSCChain();
            this.cancelOperation();
            return;
        }

        this.ethSidechainSubWallet = this.masterWallet.getSubWallet(StandardCoinName.ETHSC);
        this.balance = await this.ethSidechainSubWallet.getDisplayBalance();
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

    notifyNoETHSCChain() {
        return this.popupProvider.ionicAlert('confirmTitle', 'no-open-side-chain');
    }

    checkValue() {
        // Nothing to check

        this.createEscTransaction();
    }

    public balanceIsEnough(): boolean {
        return this.getTotalTransactionCostInELA().totalAsBigNumber.lte(this.balance);
    }

    /**
     * Returns the total transaction cost, ELA value + fees, in ELA.
     *
     * Input values in "payloadParam" are in WEI
     */
    public getTotalTransactionCostInELA(): {totalAsBigNumber: BigNumber, total: string, valueAsBigNumber: BigNumber, value: string, feesAsBigNumber: BigNumber, fees: string } {
        let weiElaRatio = new BigNumber("1000000000000000000");

        let elaEthValue = new BigNumber(this.coinTransferService.payloadParam.value).dividedBy(weiElaRatio);
        let fees = new BigNumber(this.coinTransferService.payloadParam.gas).multipliedBy(new BigNumber(this.coinTransferService.payloadParam.gasPrice)).dividedBy(weiElaRatio);
        let total = elaEthValue.plus(fees);

        //console.log("elaEthValue", elaEthValue.toString())
        //console.log("fees/gas", fees.toString());
        //console.log("total", total.toString());

        return {
            totalAsBigNumber: total,
            total: total.toString(),
            valueAsBigNumber: elaEthValue,
            value: elaEthValue.toString(),
            feesAsBigNumber: fees,
            fees: fees.toString()
        }
    }

    async createEscTransaction() {
        console.log("Calling createEscTransaction(): ", this.coinTransferService.payloadParam);

        const rawTx =
        await this.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            this.coinTransferService.payloadParam.to,
            this.coinTransferService.payloadParam.value,
            0, // WEI
            this.coinTransferService.payloadParam.gasPrice,
            0, // WEI
            this.coinTransferService.payloadParam.gas, // TODO: gasLimit
            this.coinTransferService.payloadParam.data
        );

        console.log('Created raw ESC transaction:', rawTx);

        const transfer = new Transfer();
        Object.assign(transfer, {
            masterWalletId: this.masterWallet.id,
            chainId: this.chainId,
            rawTransaction: rawTx,
            payPassword: '',
            action: this.intentTransfer.action,
            intentId: this.intentTransfer.intentId,
        });

        let sourceSubwallet = this.walletManager.getMasterWallet(this.masterWallet.id).getSubWallet(this.chainId);
        const result = await sourceSubwallet.signAndSendRawTransaction(rawTx, transfer);
        if (transfer.intentId) {
          await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
        }
    }
}

