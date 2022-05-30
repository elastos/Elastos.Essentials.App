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
import BigNumber from "bignumber.js";
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { ETHTransactionInfo, ETHTransactionInfoParser, ETHTransactionTokenApproveInfo } from 'src/app/wallet/model/networks/evms/ethtransactioninfoparser';
import { ETHTransactionStatus } from 'src/app/wallet/model/networks/evms/evm.types';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { jsToSpvWalletId } from 'src/app/wallet/services/spv.service';
import { CoinTransferService, IntentTransfer, Transfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-esctransaction',
  templateUrl: './esctransaction.page.html',
  styleUrls: ['./esctransaction.page.scss'],
})
export class EscTransactionPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private networkWallet: AnyNetworkWallet = null;
  private evmSubWallet: AnyMainCoinEVMSubWallet = null;
  private intentTransfer: IntentTransfer;
  public balance: BigNumber; // ELA
  public gasPrice: string;
  public gasPriceGwei: number;
  public gasLimit: string;
  public showEditGasPrice = false;
  public hasOpenETHSCChain = false;
  public transactionInfo: ETHTransactionInfo;

  private publicationStatusSub: Subscription;
  private ethTransactionSpeedupSub: Subscription;

  private alreadySentIntentResponce = false;

  // Titlebar
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public walletManager: WalletService,
    public popupProvider: PopupProvider,
    private coinTransferService: CoinTransferService,
    private globalIntentService: GlobalIntentService,
    public native: Native,
    public zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private erc20service: ERC20CoinService, // Keep it to initialize the service for the ETHTransactionInfoParser
    public uiService: UiService,
    private ethTransactionService: EVMService
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.esctransaction-title'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "close",
      iconPath: BuiltInIcon.CLOSE
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if (icon.key === 'close') {
        void this.cancelOperation();
      }
    });

    void this.init();
  }

  ionViewDidEnter() {
    if (this.networkWallet.masterWallet.type !== WalletType.STANDARD) {
      // TODO: reject esctransaction if multi sign (show error popup)
      void this.cancelOperation();
    }
  }

  ionViewWillLeave() {
    if (this.publicationStatusSub) this.publicationStatusSub.unsubscribe();
    if (this.ethTransactionSpeedupSub) this.ethTransactionSpeedupSub.unsubscribe();
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponce) {
      void this.cancelOperation(false);
    }
  }

  async init() {
    this.intentTransfer = this.coinTransferService.intentTransfer;
    this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);

    Logger.log("wallet", "ESC Transaction params", this.coinTransferService.payloadParam);

    this.evmSubWallet = this.networkWallet.getMainEvmSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.
    await this.evmSubWallet.updateBalance()
    this.balance = await this.evmSubWallet.getDisplayBalance();
    this.gasPrice = this.coinTransferService.payloadParam.gasPrice;
    if (!this.gasPrice) {
      this.gasPrice = await this.evmSubWallet.getGasPrice();
    }

    this.gasPriceGwei = parseInt(this.gasPrice) / 1000000000;

    if (this.coinTransferService.payloadParam.gas) {
      this.gasLimit = Util.getDecimalString(this.coinTransferService.payloadParam.gas);
    } else {
      let tx = {
        data: this.coinTransferService.payloadParam.data,
        value: this.coinTransferService.payloadParam.value || "0",
        from: this.coinTransferService.payloadParam.from, // Must set from for mdex.
        to: this.coinTransferService.payloadParam.to
      }
      try {
        const gasLimit = await this.evmSubWallet.estimateGas(tx);
        // '* 1.5': Make sure the gasLimit is big enough.
        this.gasLimit = Util.ceil(gasLimit * 1.5).toString();
      }
      catch (err) {
        Logger.log("wallet", "Can not estimate the gaslimit, set default value 3000000");
        this.gasLimit = '3000000';
      }
    }

    Logger.log("wallet", "ESCTransaction got gas price:", this.gasPrice);

    // Extract information about the specific transaction type we are handling
    let transactionInfoParser = new ETHTransactionInfoParser(
      this.evmSubWallet.networkWallet.network,
      this.coinTransferService.payloadParam.data,
      this.coinTransferService.payloadParam.value || "0",
      this.coinTransferService.payloadParam.to
    )
    this.transactionInfo = await transactionInfoParser.computeInfo();
    Logger.log("wallet", "ESCTransaction got transaction info:", this.transactionInfo);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.publicationStatusSub = EVMService.instance.ethTransactionStatus.subscribe(async (status) => {
      Logger.warn('wallet', 'EscTransactionPage ethTransactionStatus:', status)
      switch (status.status) {
        case ETHTransactionStatus.PACKED:
          let resultOk = {
            published: true,
            txid: status.txId,
            status: 'published'
          }
          // TODO: Wait for the ETHTransactionComponent exit.
          setTimeout(() => {
            void this.sendIntentResponse(resultOk, this.intentTransfer.intentId);
          }, 3000);
          break;
        case ETHTransactionStatus.CANCEL:
          let result = {
            published: false,
            txid: null,
            status: 'cancelled'
          }
          await this.sendIntentResponse(result, this.intentTransfer.intentId);
          break;
      }
    });

    this.ethTransactionSpeedupSub = EVMService.instance.ethTransactionSpeedup.subscribe((status) => {
      Logger.warn('wallet', 'EscTransactionPage ethTransactionStatus:', status)
      if (status) {
        this.gasPrice = status.gasPrice;
        this.gasLimit = status.gasLimit;
        // Do Transaction
        void this.goTransaction();
        // Reset gas price.
        this.gasPrice = null;
        this.gasLimit = null;
      }
    });
  }

  /**
   * Cancel the vote operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse(
      { txid: null, status: 'cancelled' },
      this.intentTransfer.intentId, navigateBack
    );
  }

  private async sendIntentResponse(result, intentId, navigateBack = true) {
    this.alreadySentIntentResponce = true;
    await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
  }

  goTransaction() {
    void this.checkValue();
  }

  async checkValue(): Promise<void> {
    // Nothing to check

    await this.createEscTransaction();
  }

  public balanceIsEnough(): boolean {
    return this.getTotalTransactionCostInCurrency().totalAsBigNumber.lte(this.balance);
  }

  /**
   * Returns the total transaction cost, Currency (ELA, HT) value + fees, in currency.
   *
   * Input values in "payloadParam" are in WEI
   */
  public getTotalTransactionCostInCurrency(): { totalAsBigNumber: BigNumber, total: string, valueAsBigNumber: BigNumber, value: string, feesAsBigNumber: BigNumber, fees: string } {
    let weiToDisplayCurrencyRatio = new BigNumber("1000000000000000000");

    let gas = new BigNumber(this.gasLimit);
    let gasPrice = new BigNumber(this.gasPrice);
    let currencyValue = new BigNumber(this.coinTransferService.payloadParam.value || 0).dividedBy(weiToDisplayCurrencyRatio);
    let fees = gas.multipliedBy(gasPrice).dividedBy(weiToDisplayCurrencyRatio);
    let total = currencyValue.plus(fees);

    // Logger.log('wallet', "gasPrice", gasPrice.toFixed())
    // Logger.log('wallet', "gas", gas.toFixed())
    // Logger.log('wallet', "currencyValue", currencyValue.toFixed())
    // Logger.log('wallet', "fees/gas", fees.toFixed());
    // Logger.log('wallet', "total", total.toFixed());

    return {
      totalAsBigNumber: total,
      total: total.toFixed(),
      valueAsBigNumber: currencyValue,
      value: currencyValue.toFixed(),
      feesAsBigNumber: fees,
      fees: fees.toFixed()
    }
  }

  // ELA, HT, etc
  public getCurrencyInUse(): string {
    return this.evmSubWallet.getDisplayTokenName();
  }

  async createEscTransaction() {
    Logger.log('wallet', "Calling createEscTransaction(): ", this.coinTransferService.payloadParam);

    let nonce = await this.evmSubWallet.getNonce();
    const rawTx =
      await this.walletManager.spvBridge.createTransferGeneric(
        jsToSpvWalletId(this.networkWallet.id),
        this.evmSubWallet.id,
        this.coinTransferService.payloadParam.to || '',
        this.coinTransferService.payloadParam.value || "0",
        0, // WEI
        this.gasPrice,
        0, // WEI
        this.gasLimit,
        this.coinTransferService.payloadParam.data,
        nonce
      );

    Logger.log('wallet', 'Created raw ESC transaction:', rawTx);

    if (rawTx) {
      const transfer = new Transfer();
      Object.assign(transfer, {
        masterWalletId: this.networkWallet.id,
        subWalletId: this.evmSubWallet.id,
        //rawTransaction: rawTx,
        payPassword: '',
        action: this.intentTransfer.action,
        intentId: this.intentTransfer.intentId,
      });

      try {
        const result = await this.evmSubWallet.signAndSendRawTransaction(rawTx, transfer, false);
        //await this.ethTransactionService.publishTransaction(this.evmSubWallet, rawTx, transfer)
      }
      catch (err) {
        Logger.error('wallet', 'EscTransactionPage publishTransaction error:', err)
        if (this.intentTransfer.intentId) {
          await this.sendIntentResponse(
            { txid: null, status: 'error' },
            this.intentTransfer.intentId
          );
        }
      }
    } else {
      if (this.intentTransfer.intentId) {
        await this.sendIntentResponse(
          { txid: null, status: 'error' },
          this.intentTransfer.intentId
        );
      }
    }
  }

  public editGasPrice() {
    this.showEditGasPrice = !this.showEditGasPrice;
  }

  public updateGasprice(event) {
    this.gasPrice = Math.floor(this.gasPriceGwei * 1000000000).toString();
  }

  public getApproveTokenNameWithSymbol(transactionInfo: ETHTransactionTokenApproveInfo): string {
    if (!transactionInfo) // Just in case
      return "";

    return `${transactionInfo.symbol} (${transactionInfo.tokenName})`;
  }
}
