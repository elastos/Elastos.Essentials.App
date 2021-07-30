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

import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
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
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { ETHChainSubWallet } from 'src/app/wallet/model/wallets/ETHChainSubWallet';
import { ETHTransactionInfo, ETHTransactionInfoParser } from 'src/app/wallet/model/ethtransactioninfoparser';
import { ERC20CoinService } from 'src/app/wallet/services/erc20coin.service';

@Component({
    selector: 'app-esctransaction',
    templateUrl: './esctransaction.page.html',
    styleUrls: ['./esctransaction.page.scss'],
})
export class EscTransactionPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    private masterWallet: MasterWallet = null;
    private ethSidechainSubWallet: ETHChainSubWallet = null;
    private intentTransfer: IntentTransfer;
    private walletInfo = {};
    public balance: BigNumber; // ELA
    public gasPrice: BigNumber;
    public chainId: string; // ETHSC
    public hasOpenETHSCChain = false;
    public transactionInfo: ETHTransactionInfo;

    constructor(
        public walletManager: WalletManager,
        public popupProvider: PopupProvider,
        private coinTransferService: CoinTransferService,
        private globalIntentService: GlobalIntentService,
        public native: Native,
        public zone: NgZone,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private erc20service: ERC20CoinService, // Keep it to initialize the service for the ETHTransactionInfoParser
        public uiService: UiService
    ) {
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('wallet.esctransaction-title'));

        void this.init();
    }

    ionViewDidEnter() {
      if (this.walletInfo["Type"] === "Multi-Sign") {
          // TODO: reject esctransaction if multi sign (show error popup)
          void this.cancelOperation();
      }
    }

    async init() {
        this.chainId = this.coinTransferService.chainId;
        this.intentTransfer = this.coinTransferService.intentTransfer;
        this.walletInfo = this.coinTransferService.walletInfo;
        this.masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);

        this.ethSidechainSubWallet = this.masterWallet.getSubWallet(StandardCoinName.ETHSC) as ETHChainSubWallet;
        this.balance = await this.ethSidechainSubWallet.getDisplayBalance();
        this.gasPrice = await this.ethSidechainSubWallet.getGasPrice();

        Logger.log("wallet", "ESCTransaction got gas price:", this.gasPrice);

        // Extract information about the specific transaction type we are handling
        let transactionInfoParser = new ETHTransactionInfoParser(
            this.coinTransferService.payloadParam.data,
            this.coinTransferService.payloadParam.value || "0",
            this.coinTransferService.payloadParam.to
        )
        this.transactionInfo = await transactionInfoParser.computeInfo();
        Logger.log("wallet", "ESCTransaction got transaction info:", this.transactionInfo);
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
        void this.checkValue();
    }

    async checkValue(): Promise<void> {
        // Nothing to check

        await this.createEscTransaction();
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

        let gas = new BigNumber(this.coinTransferService.payloadParam.gas);
        let gasPrice = new BigNumber(this.coinTransferService.payloadParam.gasPrice || this.gasPrice);
        let elaEthValue = new BigNumber(this.coinTransferService.payloadParam.value || 0).dividedBy(weiElaRatio);
        let fees = gas.multipliedBy(gasPrice).dividedBy(weiElaRatio);
        let total = elaEthValue.plus(fees);

        /* Logger.log('wallet', "gasPrice", gasPrice.toString())
        Logger.log('wallet', "gas", gas.toString())
        Logger.log('wallet', "elaEthValue", elaEthValue.toString())
        Logger.log('wallet', "fees/gas", fees.toString());
        Logger.log('wallet', "total", total.toString()); */

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
        Logger.log('wallet', "Calling createEscTransaction(): ", this.coinTransferService.payloadParam);

        let nonce = await this.ethSidechainSubWallet.getNonce();
        const rawTx =
        await this.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            StandardCoinName.ETHSC,
            this.coinTransferService.payloadParam.to,
            this.coinTransferService.payloadParam.value || "0",
            0, // WEI
            this.coinTransferService.payloadParam.gasPrice || this.gasPrice.toString(16),
            0, // WEI
            this.coinTransferService.payloadParam.gas, // TODO: gasLimit
            this.coinTransferService.payloadParam.data,
            nonce
        );

        Logger.log('wallet', 'Created raw ESC transaction:', rawTx);

        if (rawTx) {
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
              Logger.log('wallet', 'Sending esctransaction intent response');
              await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
          }
        } else {
          if (this.intentTransfer.intentId) {
            await this.globalIntentService.sendIntentResponse(
              { txid: null, status: 'error' },
              this.intentTransfer.intentId
            );
          }
        }
    }
}
