import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { BigNumber } from 'bignumber.js';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Config } from 'src/app/wallet/config/Config';
import { EVMSafe } from 'src/app/wallet/model/networks/evms/safes/evm.safe';
import { Transfer } from '../../../../services/cointransfer.service';
import { CurrencyService } from '../../../../services/currency.service';
import { UiService } from '../../../../services/ui.service';
import { EscTransactionPage } from '../esctransaction.page';

@Component({
  selector: 'app-standard-account',
  templateUrl: './standard-account.component.html',
  styleUrls: ['./standard-account.component.scss']
})
export class StandardAccountComponent implements OnInit, OnDestroy {
  @Input() balance: BigNumber;
  @Input() uiService: UiService;
  @Input() parentPage: EscTransactionPage;

  // Gas-related properties
  public gasPrice: string;
  public gasPriceGwei: number;
  public gasLimit: string;
  public gasLimitDisplay: string;
  public showEditGasPrice = false;
  public signingAndTransacting = false;

  // Transaction cost calculation
  public totalTransactionCost: any = null;

  private gasSpeedupSub: Subscription;

  constructor() {}

  ngOnInit() {
    void this.initializeGasParameters();
    this.subscribeToGasSpeedup();
  }

  ngOnDestroy() {
    if (this.gasSpeedupSub) {
      this.gasSpeedupSub.unsubscribe();
    }
  }

  private async initializeGasParameters() {
    const evmSubWallet = this.parentPage.getEvmSubWallet();
    const coinTransferService = this.parentPage.getCoinTransferService();

    this.gasPrice = coinTransferService.payloadParam.gasPrice;
    if (!this.gasPrice) {
      this.gasPrice = await evmSubWallet.getGasPrice();
    }

    this.gasPriceGwei = parseInt(this.gasPrice) / Config.GWEI;

    if (coinTransferService.payloadParam.gas) {
      this.gasLimit = Util.getDecimalString(coinTransferService.payloadParam.gas);
    } else {
      let tx = {
        data: coinTransferService.payloadParam.data,
        value: coinTransferService.payloadParam.value || '0',
        from: coinTransferService.payloadParam.from, // Must set from for mdex.
        to: coinTransferService.payloadParam.to
      };
      try {
        const gasLimit = await evmSubWallet.estimateGas(tx);
        // '* 1.5': Make sure the gasLimit is big enough.
        this.gasLimit = Util.ceil(gasLimit * 1.5).toString();
      } catch (err) {
        Logger.log('wallet', 'Can not estimate the gaslimit, set default value 3000000');
        this.gasLimit = '3000000';
      }
    }

    this.gasLimitDisplay = this.gasLimit;
    Logger.log('wallet', 'StandardAccountComponent got gas price:', this.gasPrice);

    this.calculateTransactionCost();
  }

  private subscribeToGasSpeedup() {
    this.gasSpeedupSub = this.parentPage.events.subscribe('gasSpeedup', (status: any) => {
      Logger.log('wallet', 'StandardAccountComponent gasSpeedup:', status);
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

  private calculateTransactionCost() {
    const coinTransferService = this.parentPage.getCoinTransferService();
    const evmSubWallet = this.parentPage.getEvmSubWallet();

    let weiToDisplayCurrencyRatio = new BigNumber('1000000000000000000');

    let gas = new BigNumber(this.gasLimit);
    let gasPrice = new BigNumber(this.gasPrice);
    let currencyValue = new BigNumber(coinTransferService.payloadParam.value || 0).dividedBy(weiToDisplayCurrencyRatio);
    let fees = gas.multipliedBy(gasPrice).dividedBy(weiToDisplayCurrencyRatio);
    let total = currencyValue.plus(fees);

    let currencyFee = evmSubWallet.getAmountInExternalCurrency(fees);

    this.totalTransactionCost = {
      totalAsBigNumber: total,
      total: total?.toFixed(),
      valueAsBigNumber: currencyValue,
      value: currencyValue?.toFixed(),
      feesAsBigNumber: fees,
      fees: fees?.toFixed(),
      currencyFee: currencyFee?.toFixed()
    };
  }

  public balanceIsEnough(): boolean {
    return this.totalTransactionCost.totalAsBigNumber.lte(this.balance);
  }

  // ELA, HT, etc
  public getCurrencyInUse(): string {
    return this.parentPage.getEvmSubWallet().getDisplayTokenName();
  }

  // CNY, USD, etc
  public getNativeCurrencyInUse(): string {
    return CurrencyService.instance.selectedCurrency.symbol;
  }

  public editGasPrice(): void {
    this.showEditGasPrice = !this.showEditGasPrice;
  }

  public updateGasprice(event: any): void {
    if (!this.gasPriceGwei) return;

    this.gasPrice = Math.floor(this.gasPriceGwei * Config.GWEI).toString();
    this.calculateTransactionCost();
  }

  public updateGasLimit(event: any): void {
    if (this.gasLimitDisplay) this.gasLimit = this.gasLimitDisplay;
    this.calculateTransactionCost();
  }

  public goTransaction(): void {
    void this.checkValue();
  }

  private async checkValue(): Promise<void> {
    // Nothing to check
    await this.createEscTransaction();
  }

  async createEscTransaction() {
    Logger.log('wallet', 'Calling createEscTransaction(): ', this.parentPage.getCoinTransferService().payloadParam);

    this.signingAndTransacting = true;
    const evmSubWallet = this.parentPage.getEvmSubWallet();
    const networkWallet = this.parentPage.getNetworkWallet();
    const coinTransferService = this.parentPage.getCoinTransferService();
    const intentTransfer = this.parentPage.getIntentTransfer();

    let nonce = await evmSubWallet.getNonce();
    const rawTx = await (evmSubWallet.networkWallet.safe as unknown as EVMSafe).createContractTransaction(
      coinTransferService.payloadParam.to || '',
      coinTransferService.payloadParam.value || '0',
      this.gasPrice,
      this.gasLimit,
      nonce,
      coinTransferService.payloadParam.data
    );

    Logger.log('wallet', 'Created raw ESC transaction:', rawTx);

    if (rawTx) {
      const transfer = new Transfer();
      Object.assign(transfer, {
        masterWalletId: networkWallet.id,
        subWalletId: evmSubWallet.id,
        payPassword: '',
        action: intentTransfer.action,
        intentId: intentTransfer.intentId
      });

      try {
        const result = await evmSubWallet.signAndSendRawTransaction(rawTx, transfer, false);
      } catch (err) {
        Logger.error('wallet', 'StandardAccountComponent publishTransaction error:', err);
        if (intentTransfer.intentId) {
          await this.parentPage.sendIntentResponse({ txid: null, status: 'error' }, intentTransfer.intentId);
        }
      }
    } else {
      if (intentTransfer.intentId) {
        await this.parentPage.sendIntentResponse({ txid: null, status: 'error' }, intentTransfer.intentId);
      }
    }

    this.signingAndTransacting = false;
  }

  async cancelOperation() {
    await this.parentPage.cancelOperation();
  }
}
