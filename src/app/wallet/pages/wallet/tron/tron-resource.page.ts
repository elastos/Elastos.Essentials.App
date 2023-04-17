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

import { Component, OnDestroy, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { MenuSheetMenu } from 'src/app/components/menu-sheet/menu-sheet.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { sleep } from 'src/app/helpers/sleep.helper';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { Web3Exception } from 'src/app/model/exceptions/web3.exception';
import { Util } from 'src/app/model/util';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalTronGridService } from 'src/app/services/global.tron.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { TxConfirmComponent } from 'src/app/wallet/components/tx-confirm/tx-confirm.component';
import { TronSubWallet } from 'src/app/wallet/model/networks/tron/subwallets/tron.subwallet';
import { AccountResources, AccountResult, ResourceType, UnfrozenV2 } from 'src/app/wallet/model/tron.types';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { TransferType } from 'src/app/wallet/services/cointransfer.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CurrencyService } from '../../../services/currency.service';
import { Native } from '../../../services/native.service';
import { PopupProvider } from '../../../services/popup.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

type FreezedBalanceInfo = {
    frozen_balance: number, // sun
    frozen_balance_trx: number, // TRX
    expire_time: number, // ms
    display_date_expire_time: string,
}

@Component({
    selector: 'app-tron-resource',
    templateUrl: './tron-resource.page.html',
    styleUrls: ['./tron-resource.page.scss'],
})
export class TronResourcePage implements OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    private subWallet: TronSubWallet = null;
    public accountResource: AccountResources = null;
    private accountInfo: AccountResult = null;
    // Stake v1
    public freezeBalanceInfoV1: FreezedBalanceInfo[] = [
        {
            frozen_balance:0,
            frozen_balance_trx: 0,
            expire_time: 0,
            display_date_expire_time:''
        },
        {
            frozen_balance:0,
            frozen_balance_trx: 0,
            expire_time: 0,
            display_date_expire_time:''
        }];
    // Stake v2
    public freezeBalanceInfoV2: FreezedBalanceInfo[] = [
        {
            frozen_balance:0,
            frozen_balance_trx: 0,
            expire_time: 0,
            display_date_expire_time:''
        },
        {
            frozen_balance:0,
            frozen_balance_trx: 0,
            expire_time: 0,
            display_date_expire_time:''
        }];
    public totalFreezeBalance = ['0', '0'];

    public transactionType = 0;
    public resourceType = ResourceType.BANDWIDTH;
    public amount = 0;

    // Unfreeze
    public freezePeriodExpired = false;
    public unfreezeInfo = '';
    public unfreezeTime = '';
    public unfreezeAmount = 0;

    // withdraw
    public unfrozenV2: UnfrozenV2[] = [];
    public withdrawAmountSun = 0;
    public withdrawAmount = '';
    public withdrawInfo = '';
    public withdrawTime = '';


    public displayBalanceString = '';
    private feeOfTRX = null;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public native: Native,
        public popupProvider: PopupProvider,
        public walletManager: WalletService,
        public networkService: WalletNetworkService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        public theme: GlobalThemeService,
        public uiService: UiService,
        private globalNativeService: GlobalNativeService,
    ) {
    }

    ngOnDestroy() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.resource-title"));
        void this.initResource();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async initResource() {
        let networkWallet = this.walletManager.getActiveNetworkWallet();
        this.subWallet = <TronSubWallet>networkWallet.getMainTokenSubWallet();

        let address = this.subWallet.getCurrentReceiverAddress();

        this.accountResource = await GlobalTronGridService.instance.getAccountResource(address);
        this.accountInfo = await GlobalTronGridService.instance.account(this.subWallet.rpcApiUrl, address);
        if (this.accountInfo) {
            // Stake V1
            if (this.accountInfo.frozen && this.accountInfo.frozen[0]) {
                this.freezeBalanceInfoV1[0].frozen_balance = this.accountInfo.frozen[0].frozen_balance;
                this.freezeBalanceInfoV1[0].frozen_balance_trx = GlobalTronGridService.instance.fromSun(this.freezeBalanceInfoV1[0].frozen_balance);
                this.freezeBalanceInfoV1[0].expire_time = this.accountInfo.frozen[0].expire_time;
                this.freezeBalanceInfoV1[0].display_date_expire_time = WalletUtil.getDisplayDate(this.freezeBalanceInfoV1[0].expire_time);
            }
            if (this.accountInfo.account_resource && this.accountInfo.account_resource.frozen_balance_for_energy) {
                this.freezeBalanceInfoV1[1].frozen_balance = this.accountInfo.account_resource.frozen_balance_for_energy.frozen_balance;
                this.freezeBalanceInfoV1[1].frozen_balance_trx = GlobalTronGridService.instance.fromSun(this.freezeBalanceInfoV1[1].frozen_balance);
                this.freezeBalanceInfoV1[1].expire_time = this.accountInfo.account_resource.frozen_balance_for_energy.expire_time;
                this.freezeBalanceInfoV1[1].display_date_expire_time = WalletUtil.getDisplayDate(this.freezeBalanceInfoV1[1].expire_time);
            }

            // Stake V2
            if (this.accountInfo.frozenV2) {
                this.accountInfo.frozenV2.forEach( f => {
                    let index = -1;
                    if (!f.type && f.amount) {
                        index = 0;// bandwidth
                    } else if (f.type == 'ENERGY' && f.amount) {
                        index = 1;
                    }
                    if (index != -1) {
                        this.freezeBalanceInfoV2[index].frozen_balance = f.amount;
                        this.freezeBalanceInfoV2[index].frozen_balance_trx = GlobalTronGridService.instance.fromSun(f.amount);
                    }
                })
            }

            this.totalFreezeBalance[0] = GlobalTronGridService.instance.fromSun(this.freezeBalanceInfoV1[0].frozen_balance + this.freezeBalanceInfoV2[0].frozen_balance);
            this.totalFreezeBalance[1] = GlobalTronGridService.instance.fromSun(this.freezeBalanceInfoV1[1].frozen_balance + this.freezeBalanceInfoV2[1].frozen_balance);
        }

        this.displayBalanceString = this.uiService.getFixedBalance(this.subWallet.getDisplayBalance());
    }

    getBandwithInfo() {
        if (this.accountResource.freeNetLimit || this.accountResource.NetLimit) {
            let totalNet = this.accountResource.freeNetLimit + (this.accountResource.NetLimit ? this.accountResource.NetLimit : 0);
            let usableNet = totalNet
                            - (this.accountResource.NetUsed ? this.accountResource.NetUsed : 0) - (this.accountResource.freeNetUsed ? this.accountResource.freeNetUsed : 0);
            return '' + usableNet + ' / ' + totalNet;
        } else return '0';
    }

    getEnergyInfo() {
        if (this.accountResource.EnergyLimit) {
            let usableEnergy = this.accountResource.EnergyLimit - (this.accountResource.EnergyUsed ? this.accountResource.EnergyUsed : 0);
            return '' + usableEnergy + ' / ' + this.accountResource.EnergyLimit;
        } else return '0';
    }

    setTransactionType(type) {
        this.transactionType = type;
        if (this.transactionType == 1) {
          this.showUnfreezeInfo();
          this.amount = 0;
          this.withdrawAmountSun = 0;
        } else if (this.transactionType == 0) {
          this.unfreezeAmount = 0;
          this.withdrawAmountSun = 0;
        } else { // withdraw
          this.showwithdrawInfo();
          this.amount = 0;
          this.unfreezeAmount = 0;
        }
    }

    getButtonLabel(): string {
        if (this.transactionType == 0) {
            return 'wallet.resource-freeze';
        } else if (this.transactionType == 1) {
            return 'wallet.resource-unfreeze';
        } else {
            return 'wallet.resource-withdraw';
        }
    }

    estimateResource() {
        if (!this.amount) return;

        if (this.resourceType == ResourceType.BANDWIDTH) {
            return GlobalTranslationService.instance.translateInstant("wallet.resource-bandwidth-to-obtained") + Math.round(this.amount * this.accountResource.TotalNetLimit / this.accountResource.TotalNetWeight)
        } else {
            return GlobalTranslationService.instance.translateInstant("wallet.resource-energy-to-obtained") + Math.round(this.amount * this.accountResource.TotalEnergyLimit / this.accountResource.TotalEnergyWeight)
        }
    }

    // Unfreeze only after the freeze expires (stake v1)
    showUnfreezeInfo() {
        let currentTimesamp = moment().valueOf();
        let index = this.resourceType == ResourceType.BANDWIDTH ? 0 : 1;

        if (currentTimesamp > this.freezeBalanceInfoV1[index].expire_time) {
            this.freezePeriodExpired = true;
            this.unfreezeTime = '';
        } else {
            this.freezePeriodExpired = false;
            this.unfreezeTime = GlobalTranslationService.instance.translateInstant("wallet.resource-unfreeze-time") + this.freezeBalanceInfoV1[index].display_date_expire_time;
        }

        this.unfreezeInfo = GlobalTranslationService.instance.translateInstant("wallet.resource-to-unfreeze-stakev1") + this.freezeBalanceInfoV1[index].frozen_balance_trx + ' TRX';
    }

    // withdraw only after the expires
    showwithdrawInfo() {
      if (!this.accountInfo.unfrozenV2) return;

      let currentTimesamp = moment().valueOf();

      this.withdrawAmountSun = 0;
      this.withdrawTime = null;
      let latestWithdrawalTime = 0;
      this.accountInfo.unfrozenV2.forEach( f => {
        if (currentTimesamp > f.unfreeze_expire_time) {
          this.withdrawAmountSun += f.unfreeze_amount;
        } else if (latestWithdrawalTime < f.unfreeze_expire_time) {
          latestWithdrawalTime = f.unfreeze_expire_time;
          this.withdrawTime = GlobalTranslationService.instance.translateInstant("wallet.resource-withdraw-time") + WalletUtil.getDisplayDate(f.unfreeze_expire_time)
              + '  ( ' + GlobalTronGridService.instance.fromSun(f.unfreeze_amount).toString() + ' TRX)';
        }
      })

      this.withdrawAmount = GlobalTronGridService.instance.fromSun(this.withdrawAmountSun);

      this.withdrawInfo = GlobalTranslationService.instance.translateInstant("wallet.resource-to-withdraw") + this.withdrawAmount + ' TRX';
  }

    private conditionalShowToast(message: string, showToast: boolean, duration = 4000) {
        if (showToast)
            this.native.toast_trans(message, duration);
    }

    /**
     * Make sure all parameters are right before sending a transaction or enabling the send button.
     */
    async checkValuesReady(showToast = true): Promise<boolean> {
        let feeSun = await this.subWallet.estimateTransferTransactionGas(null);
        this.feeOfTRX = GlobalTronGridService.instance.fromSun(feeSun.toString()).toString();
        let fee = new BigNumber(this.feeOfTRX);

        if (this.transactionType == 0) { // freeze
            if (Util.isNull(this.amount) || this.amount <= 0) {
                this.conditionalShowToast('wallet.amount-invalid', showToast);
                return false;
            }
        } else if (this.transactionType == 1) { // unfreeze
            if (this.hasStakeV1Resource()) { // Stake V1
              if (!this.freezePeriodExpired) {
                  this.conditionalShowToast(this.unfreezeTime, showToast);
                  return false;
              }
              let index = this.resourceType == ResourceType.BANDWIDTH ? 0 : 1;
              if (!this.freezeBalanceInfoV1[index].frozen_balance_trx) {
                  this.conditionalShowToast(GlobalTranslationService.instance.translateInstant("wallet.resource-no-trx-to-unfreeze"), showToast);
                  return false;
              }
            } else {  // stake v2
                if (Util.isNull(this.unfreezeAmount) || this.unfreezeAmount <= 0) {
                    this.conditionalShowToast('wallet.amount-invalid', showToast);
                    return false;
                }

                let unfreezeAmount = this.getUnfreezeResourceBalance();
                if (this.unfreezeAmount > Number(unfreezeAmount)) {
                    this.conditionalShowToast('wallet.amount-invalid', showToast);
                    return false;
                }
            }
        } else { // withdraw
          if (!this.withdrawAmountSun) {
            this.conditionalShowToast(this.withdrawInfo, showToast);
            return false;
          }
        }

        let amountBigNumber = new BigNumber(this.amount || 0);
        if (fee) {
            amountBigNumber = amountBigNumber.plus(fee)
        }

        if (!this.subWallet.isBalanceEnough(amountBigNumber)) {
            this.conditionalShowToast('wallet.insufficient-balance', showToast);
            return false;
        }

        if (!this.subWallet.isAmountValid(amountBigNumber)) {
            this.conditionalShowToast('wallet.amount-invalid', showToast);
            return false;
        }

        return true;
    }

    async goTransaction() {
        if (await this.checkValuesReady())
            this.showConfirm()
    }

    async doTransaction() {
        Logger.log('wallet', 'doTransaction resource type:', ' Action:', this.resourceType, this.transactionType ? 'Unfreeze' : 'freeze');
        let rawTx = null;
        try {
            if (this.transactionType == 0) { // freeze
                rawTx = await this.subWallet.createStakeTransaction(this.amount, this.resourceType);
            } else if (this.transactionType == 1) { // unfreeze
                if (this.unfreezeAmount > 0) {
                    rawTx = await this.subWallet.createUnStakeTransaction(this.unfreezeAmount, this.resourceType);
                } else {
                    rawTx = await this.subWallet.createUnStakeV1Transaction(this.resourceType);
                }
            } else { // withdraw
                rawTx = await this.subWallet.createWithdrawExpireUnfreezeTransaction();
            }
        } catch (err) {
            await this.parseException(err);
        }

        if (rawTx) {
            GlobalFirebaseService.instance.logEvent("wallet_coin_tron-resource");
            await this.subWallet.signAndSendRawTransaction(rawTx, null);
        }
    }

    private async parseException(err) {
        Logger.error('wallet', "tron resource transaction error:", err);
        let reworkedEx = WalletExceptionHelper.reworkedWeb3Exception(err);
        if (reworkedEx instanceof Web3Exception) {
            await PopupProvider.instance.ionicAlert("wallet.transaction-fail", "common.network-or-server-error");
        } else {
            let message = typeof (err) === "string" ? err : err.message;
            await PopupProvider.instance.ionicAlert("wallet.transaction-fail", message);
        }
    }

    /**
     * Choose an resource type, bandwidth or energy
     */
    public pickAddressType() {
        let menuItems: MenuSheetMenu[] =  [
            {
                title: GlobalTranslationService.instance.translateInstant("wallet.resource-bandwith"),
                routeOrAction: () => {
                    this.resourceType = ResourceType.BANDWIDTH;
                    this.unfreezeAmount = 0;
                    this.showUnfreezeInfo();
                }
            },
            {
                title: GlobalTranslationService.instance.translateInstant("wallet.resource-energy"),
                routeOrAction: () => {
                    this.resourceType = ResourceType.ENERGY;
                    this.unfreezeAmount = 0;
                    this.showUnfreezeInfo();
                }
            }
        ]

        let menu: MenuSheetMenu = {
            title: GlobalTranslationService.instance.translateInstant("wallet.resource-choose-type"),
            items: menuItems
        };

        void this.globalNativeService.showGenericBottomSheetMenuChooser(menu);
    }

    getDisplayableResourceType() {
        if (this.resourceType == ResourceType.BANDWIDTH) {
            return GlobalTranslationService.instance.translateInstant("wallet.resource-bandwith");
        } else {
            return GlobalTranslationService.instance.translateInstant("wallet.resource-energy");
        }
    }

    getUnfreezeResourceBalance() {
        if (this.resourceType == ResourceType.BANDWIDTH) {
            return this.totalFreezeBalance[0];
        } else {
            return this.totalFreezeBalance[1];
        }
    }

    hasStakeV1Resource() {
        if (this.resourceType == ResourceType.BANDWIDTH) {
            return this.freezeBalanceInfoV1[0].frozen_balance > 0;
        } else {
            return this.freezeBalanceInfoV1[1].frozen_balance > 0;
        }
    }

    async showConfirm() {
        let feeString = null;

        if (this.feeOfTRX) {
            let nativeFee = this.feeOfTRX + ' ' + WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
            let currencyFee = this.subWallet.getAmountInExternalCurrency(new BigNumber(this.feeOfTRX)).toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
            feeString = `${nativeFee} (~ ${currencyFee})`;
        }

        let index = this.resourceType == ResourceType.BANDWIDTH ? 0 : 1;
        let type, amount;
        switch (this.transactionType) {
          case 0:
            type = TransferType.FREEZE;
            amount = this.amount;
          break;
          case 1:
            type = TransferType.UNFREEZE;
            amount = undefined; //this.unfreezeAmount ? this.unfreezeAmount : undefined;
          break;
          case 2:
            type = TransferType.TRONWITHDRAW;
            amount = undefined; // this.withdrawAmount;
          break;
        }

        const txInfo = {
            type: type,
            transferFrom: this.subWallet.getCurrentReceiverAddress(),
            transferTo: this.subWallet.getCurrentReceiverAddress(),
            amount: amount,
            unfreezeBalance: this.hasStakeV1Resource() ? this.freezeBalanceInfoV1[index].frozen_balance_trx : this.unfreezeAmount,
            sendAll: false,
            precision: this.subWallet.tokenDecimals,
            tokensymbol: this.subWallet.getDisplayTokenName(),
            fee: feeString,
            coinType: this.subWallet.type,
        }

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
                void this.doTransaction();
            }
        });

        // Wait for the keyboard to close if needed, otherwise the popup is not centered.
        await sleep(500);

        return await this.native.popup.present();
    }

    public columnSize(): number {
      if (this.accountInfo.unfrozenV2) {
        return 4;
      } else return 6;
    }

    public hasUnfrozen() {
      return this.accountInfo.unfrozenV2;
    }
}
