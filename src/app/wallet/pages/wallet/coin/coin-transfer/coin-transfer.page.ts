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
import { ActivatedRoute } from '@angular/router';
import { ModalController, PopoverController } from '@ionic/angular';
import { Config } from '../../../../config/Config';
import { Native } from '../../../../services/native.service';
import { Util } from '../../../../model/Util';
import { WalletManager } from '../../../../services/wallet.service';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { CoinTransferService, TransferType, Transfer } from '../../../../services/cointransfer.service';
import { StandardCoinName, CoinType } from '../../../../model/Coin';
import { SubWallet } from '../../../../model/wallets/SubWallet';
import * as CryptoAddressResolvers from '../../../../model/address-resolvers';
import { HttpClient } from '@angular/common/http';
import { TxConfirmComponent } from '../../../../components/tx-confirm/tx-confirm.component';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyService } from '../../../../services/currency.service';
import { UiService } from '../../../../services/ui.service';
import { StandardSubWallet } from '../../../../model/wallets/StandardSubWallet';
import BigNumber from 'bignumber.js';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { TxSuccessComponent } from '../../../../components/tx-success/tx-success.component';
import { ContactsService } from '../../../../services/contacts.service';
import { ContactsComponent } from '../../../../components/contacts/contacts.component';
import { MainAndIDChainSubWallet } from '../../../../model/wallets/MainAndIDChainSubWallet';
import { Subscription } from 'rxjs';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { IntentService, ScanType } from 'src/app/wallet/services/intent.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { TransferWalletChooserComponent, WalletChooserComponentOptions } from 'src/app/wallet/components/transfer-wallet-chooser/transfer-wallet-chooser.component';
import { CoinService } from 'src/app/wallet/services/coin.service';
import { OptionsComponent, OptionsType } from 'src/app/wallet/components/options/options.component';
import { ETHTransactionService } from 'src/app/wallet/services/ethtransaction.service';
import { ETHChainSubWallet } from 'src/app/wallet/model/wallets/ETHChainSubWallet';
import { ETHTransactionStatus } from 'src/app/wallet/model/Transaction';


@Component({
    selector: 'app-coin-transfer',
    templateUrl: './coin-transfer.page.html',
    styleUrls: ['./coin-transfer.page.scss'],
    providers: [Keyboard],
})
export class CoinTransferPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    public masterWallet: MasterWallet;

    // Define transfer type
    public transferType: TransferType;
    public elastosChainCode: string;

    // User inputs
    public toAddress: string;
    public amount: number; // Here we can use JS "number" type, for now we consider we will never transfer a number that is larger than JS's MAX INT.
    public memo = '';
    public sendMax = false;

    // Display recharge wallets
    public fromSubWallet: SubWallet;
    public toSubWallet: SubWallet = null;

    // User can set gas price and limit.
    private gasPrice: string = null;
    private gasLimit: string = null;

    // Intent
    private action = null;
    private intentId = null;

    // Display memo
    public hideMemo = true;

    // Pay intent
    public amountCanBeEditedInPayIntent = true;

    // Submit transaction
    public transaction: any;

    // CryptoName and Contacts
    public addressName: string = null;

    // Helpers
    public Config = Config;
    public CoinType = CoinType;

    // Titlebar
    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    // Modal
    private modal: any = null;

    // Addresses resolved from typed user friendly names (ex: user types "rong" -> resolved to rong's ela address)
    public suggestedAddresses: CryptoAddressResolvers.Address[] = [];

    private addressUpdateSubscription: Subscription = null;

    // Input
    public inputActive = false;

    private popover: any = null;
    private showContactsOption = false;
    private showCryptonamesOption = false;
    private publicationStatusSub: Subscription;
    private ethTransactionSpeedupSub: Subscription;
    private isEthsubwallet = false;

    constructor(
        public route: ActivatedRoute,
        public walletManager: WalletManager,
        public coinTransferService: CoinTransferService,
        private coinService: CoinService,
        public native: Native,
        public events: Events,
        public zone: NgZone,
        private http: HttpClient,
        public theme: GlobalThemeService,
        private translate: TranslateService,
        public currencyService: CurrencyService,
        private globalIntentService: GlobalIntentService,
        private intentService: IntentService,
        public uiService: UiService,
        public keyboard: Keyboard,
        private contactsService: ContactsService,
        private modalCtrl: ModalController,
        private popoverCtrl: PopoverController,
        private ethTransactionService: ETHTransactionService
    ) {
    }

    async ngOnInit() {
        await this.init();
        this.addressUpdateSubscription = this.events.subscribe('address:update', (address) => {
            this.zone.run(() => {
                this.toAddress = address;
                this.addressName = null;
            });
        });
    }

    ionViewWillEnter() {
      if (this.intentId) {
        this.titleBar.setNavigationMode(null);
      }
    }

    ionViewWillLeave() {
        if (this.native.popup) {
            this.native.popup.dismiss();
        }
    }

    ngOnDestroy() {
        if (this.addressUpdateSubscription) this.addressUpdateSubscription.unsubscribe();
        if (this.publicationStatusSub) this.publicationStatusSub.unsubscribe();
        if (this.ethTransactionSpeedupSub) this.ethTransactionSpeedupSub.unsubscribe();
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    setContactsKeyVisibility(showKey: boolean) {
        this.showContactsOption = showKey;
    }

    setCryptonamesKeyVisibility(showKey: boolean) {
        this.showCryptonamesOption = showKey;
    }

    async init() {
        this.masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
        this.transferType = this.coinTransferService.transferType;
        this.elastosChainCode = this.coinTransferService.elastosChainCode;

        this.fromSubWallet = this.masterWallet.getSubWallet(this.elastosChainCode);

        Logger.log('wallet', 'Balance', this.masterWallet.subWallets[this.elastosChainCode].getDisplayBalance());

        if ((this.elastosChainCode !== StandardCoinName.ELA) && (this.elastosChainCode !== StandardCoinName.IDChain)) {
          this.isEthsubwallet = true;
          this.publicationStatusSub = ETHTransactionService.instance.ethTransactionStatus.subscribe(async (status)=>{
            Logger.log('wallet', 'CoinTransferPage ethTransactionStatus:', status)
            switch (status.status) {
              case ETHTransactionStatus.PACKED:
                this.walletManager.native.setRootRouter('/wallet/wallet-home');
                if (this.intentId) {
                  let result = {
                    published: true,
                    txid: status.txId,
                    status: 'published'
                  }
                  await this.globalIntentService.sendIntentResponse(result, this.intentId);
                }
                break;
              case ETHTransactionStatus.CANCEL:
                if (this.intentId) {
                  let result = {
                    published: false,
                    txid: null,
                    status: 'cancelled'
                  }
                  await this.globalIntentService.sendIntentResponse(result, this.intentId);
                }
                break;
            }
          });

          this.ethTransactionSpeedupSub = ETHTransactionService.instance.ethTransactionSpeedup.subscribe(async (status)=>{
            Logger.log('wallet', 'CoinTransferPage ethTransactionStatus:', status)
            if (status) {
              this.gasPrice = status.gasPrice;
              this.gasLimit = status.gasLimit;
              // Do Transaction
              void await this.transaction();
              // Reset gas price.
              this.gasPrice = null;
              this.gasLimit = null;
            }
          });
        }

        switch (this.transferType) {
            // For Recharge Transfer
            case TransferType.RECHARGE:
                // Setup page display
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-recharge-title", {coinName: this.coinTransferService.toElastosChainCode}));
                this.toSubWallet = this.masterWallet.getSubWallet(this.coinTransferService.toElastosChainCode);

                // Setup params for recharge transaction
                this.transaction = this.createRechargeTransaction;
                this.toAddress = await this.toSubWallet.createAddress();

                // Auto suggest a transfer amount of 0.1 ELA (enough) to the ID chain. Otherwise, let user define his own amount.
                if (this.toSubWallet.id === StandardCoinName.IDChain) {
                    this.amount = 0.1;
                }

                Logger.log('wallet', 'Transferring from..', this.fromSubWallet);
                Logger.log('wallet', 'Transferring To..', this.toSubWallet);
                Logger.log('wallet', 'Subwallet address', this.toAddress);
                break;
            case TransferType.WITHDRAW:
                // Setup page display
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-withdraw-title", {coinName: this.elastosChainCode}));
                this.toSubWallet = this.masterWallet.getSubWallet(StandardCoinName.ELA);

                // Setup params for withdraw transaction
                this.transaction = this.createWithdrawTransaction;
                this.toAddress = await this.toSubWallet.createAddress();

                Logger.log('wallet', 'Transferring from..', this.fromSubWallet);
                Logger.log('wallet', 'Transferring To..', this.toSubWallet);
                Logger.log('wallet', 'Subwallet address', this.toAddress);
                break;
            // For Send Transfer
            case TransferType.SEND:
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-send-title", {coinName: this.elastosChainCode}));
                this.transaction = this.createSendTransaction;

                if (this.elastosChainCode === StandardCoinName.ELA) {
                    // Always show contacts app key
                    this.setContactsKeyVisibility(true);

                    // Only show cryptonames key if user has previously used crypto names
                    if (this.contactsService.contacts.length) {
                        this.setCryptonamesKeyVisibility(true);
                    }
                }

                break;
            // For Pay Intent
            case TransferType.PAY:
                this.titleBar.setTitle(this.translate.instant("wallet.payment-title"));
                this.transaction = this.createSendTransaction;

                Logger.log('wallet', 'Pay intent params', this.coinTransferService.payTransfer);
                this.toAddress = this.coinTransferService.payTransfer.toAddress;
                this.amount = this.coinTransferService.payTransfer.amount;
                this.memo = this.coinTransferService.payTransfer.memo;
                if (this.amount) {
                    this.amountCanBeEditedInPayIntent = false;
                }
                this.action = this.coinTransferService.intentTransfer.action;
                this.intentId = this.coinTransferService.intentTransfer.intentId;
                break;
        }
    }

    /**
     * Same chain, different "users"
     */
    async createSendTransaction() {
        await this.native.showLoading(this.translate.instant('common.please-wait'));
        // Call dedicated api to the source subwallet to generate the appropriate transaction type.
        // For example, ERC20 token transactions are different from standard coin transactions (for now - as
        // the spv sdk doesn't support ERC20 yet).
        const rawTx = await this.fromSubWallet.createPaymentTransaction(
            this.toAddress, // User input address
            this.amount, // User input amount
            this.memo, // User input memo
            this.gasPrice,
            this.gasLimit
        );
        await this.native.hideLoading();
        if (rawTx) {
          const transfer = new Transfer();
          Object.assign(transfer, {
              masterWalletId: this.masterWallet.id,
              elastosChainCode: this.elastosChainCode,
              rawTransaction: rawTx,
              action: this.action,
              intentId: this.intentId
          });

          if (this.isEthsubwallet) {
            try {
              await this.ethTransactionService.publishTransaction(this.fromSubWallet as ETHChainSubWallet, rawTx, transfer, true)
            }
            catch (err) {
              Logger.error('wallet', 'coin-transfer publishTransaction error:', err)
            }
          } else {
            const result = await this.fromSubWallet.signAndSendRawTransaction(rawTx, transfer);
            if (result.published)
                this.showSuccess();
            if (transfer.intentId) {
              await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
            }
          }
        } else {
          if (this.intentId) {
            await this.globalIntentService.sendIntentResponse(
              { txid: null, status: 'error' },
              this.intentId
            );
          }
        }
    }

    /**
     * From mainchain to sidechains (ID, ETH)
     */
    async createRechargeTransaction() {
        await this.native.showLoading(this.translate.instant('common.please-wait'));

        const rawTx =
            await (this.fromSubWallet as MainAndIDChainSubWallet).createDepositTransaction(
                this.coinTransferService.toElastosChainCode as StandardCoinName, // To subwallet id
                this.toAddress, // to address
                this.amount, // User input amount
                this.memo // Memo, not necessary
            );

        await this.native.hideLoading();

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

    /**
     * From sidechain (ID, ETH) to mainchain
     */
    async createWithdrawTransaction() {
        const rawTx = await this.fromSubWallet.createWithdrawTransaction(
            this.toAddress,
            this.amount,
            this.memo,
            this.gasPrice,
            this.gasLimit
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

          if (this.isEthsubwallet) {
            try {
              await this.ethTransactionService.publishTransaction(this.fromSubWallet as ETHChainSubWallet, rawTx, transfer, true)
            }
            catch (err) {
              Logger.error('wallet', 'coin-transfer publishTransaction error:', err)
            }
          } else {
            const result = await this.fromSubWallet.signAndSendRawTransaction(rawTx, transfer);
            if (result.published)
                this.showSuccess();
          }
        }
    }

    async showOptions(ev: any) {
      this.popover = await this.popoverCtrl.create({
        mode: 'ios',
        component: OptionsComponent,
        componentProps: {
          showContacts: this.showContactsOption,
          showCryptonames: this.showCryptonamesOption,
        },
        cssClass: this.theme.activeTheme.value == AppTheme.LIGHT ? 'options-component' : 'options-component-dark',
        event: ev,
        translucent: false
      });
      this.popover.onWillDismiss().then((ret) => {
        this.popover = null;
        this.doActionAccordingToOptions(ret.data);
      });
      return await this.popover.present();
    }

    async doActionAccordingToOptions(ret: OptionsType) {
      switch (ret) {
        case OptionsType.CONTACTS:
          this.openContacts();
          break;
        case OptionsType.CRYPTONAMES:
          this.showCryptonames();
          break;
        case OptionsType.Paste:
          await this.pasteFromClipboard();
          break;
        case OptionsType.SCAN:
          this.goScan();
          break;
      }
    }

    async pasteFromClipboard() {
      this.toAddress = await this.native.pasteFromClipboard();

      const toelastosChainCode = this.toSubWallet ? this.toSubWallet.id : this.elastosChainCode;
      const isAddressValid = await this.isSubWalletAddressValid(this.masterWallet.id, toelastosChainCode, this.toAddress);
      if (!isAddressValid) {
          this.native.toast_trans('wallet.not-a-valid-address');
          return;
      }
    }

    goScan() {
        this.intentService.scan(ScanType.Address);
    }

    supportsMaxTransfer() {
        // Only the payment transaction of ELA and IDChain support send all balance.
        // TODO: what should to do with ETHSC and ERC20 Token?
        if ((this.elastosChainCode === StandardCoinName.ELA) || (this.elastosChainCode === StandardCoinName.IDChain)) {
            if ((this.transferType === TransferType.SEND) || (this.amountCanBeEditedInPayIntent && (this.transferType === TransferType.PAY))) {
                return true;
            }
        }
        return false;
    }

    setMaxTransfer() {
        this.zone.run(() => {
            this.sendMax = true;
            // -1 means send max in spvsdk.
            this.amount = -1;
        });
    }

    resetAmountInput() {
        this.sendMax = false;
        this.amount = null;
    }

    async goTransaction() {
        if (this.sendMax || this.valuesReady()) {
            await this.startTransaction();
        }

        // this.showSuccess();
    }

    // For revealing button
    valuesValid(): boolean {
        if (this.sendMax) return true;

        if (Util.isNull(this.amount)) {
            return false;
        } else if (!Util.number(this.amount)) {
            return false;
        } else if (this.amount <= 0) {
            return false;
        } else if (!this.masterWallet.subWallets[this.elastosChainCode].isBalanceEnough(new BigNumber(this.amount))) {
            return false;
        } else if (this.amount.toString().indexOf('.') > -1 && this.amount.toString().split(".")[1].length > 8) {
            return false;
        } else {
            return true;
        }
    }

    // For starting tx
    valuesReady(showToast = true): boolean {
        let valuesValid = false;
        if (Util.isNull(this.amount)) {
            if (showToast) this.native.toast_trans('wallet.amount-null');
        } else if (!Util.number(this.amount)) {
            if (showToast) this.native.toast_trans('wallet.amount-invalid');
        } else if (this.amount <= 0) {
            if (showToast) this.native.toast_trans('wallet.amount-invalid');
        } else if (!this.masterWallet.subWallets[this.elastosChainCode].isBalanceEnough(new BigNumber(this.amount))) {
            if (showToast) this.native.toast_trans('wallet.insufficient-balance');
        } else if (this.amount.toString().indexOf('.') > -1 && this.amount.toString().split(".")[1].length > 8) {
            if (showToast) this.native.toast_trans('wallet.amount-invalid');
        } else {
            if (this.fromSubWallet.type === CoinType.ERC20) {
                if (this.masterWallet.getSubWallet(StandardCoinName.ETHSC).balance.isLessThan(0.001)) {
                    if (showToast) this.native.toast_trans('wallet.eth-insuff-balance', 4000);
                } else {
                    valuesValid = true;
                }
            } else {
                valuesValid = true;
            }
        }
        return valuesValid;
    }

    async startTransaction() {
        if (this.elastosChainCode === StandardCoinName.ELA || this.elastosChainCode === StandardCoinName.IDChain) {
            const mainAndIDChainSubWallet = this.masterWallet.subWallets[this.elastosChainCode] as MainAndIDChainSubWallet;
            const isAvailableBalanceEnough =
                await mainAndIDChainSubWallet.isAvailableBalanceEnough(new BigNumber(this.amount).multipliedBy(Config.SELAAsBigNumber));

            if (!isAvailableBalanceEnough) {
                await this.native.toast_trans('wallet.transaction-pending');
                return;
            }
        }

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
            // TODO : Open it after spvsdk fix the isSubWalletAddressValid bug.
            // case StandardCoinName.ETHDID:
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
            transferTo: this.transferType === TransferType.RECHARGE ? this.coinTransferService.toElastosChainCode : this.toAddress,
            amount: this.amount,
            memo: this.memo ? this.memo : null,
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
        await this.globalIntentService.sendIntentResponse(
            { txid: null, status: 'cancelled' },
            this.coinTransferService.intentTransfer.intentId
        );
    }

    accMul(arg1, arg2) {
        let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try { m += s1.split(".")[1].length } catch (e) { }
        try { m += s2.split(".")[1].length } catch (e) { }
        return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m)
    }

    /**
     * Callback called whenever the "send to" address changes.
     * At that time, we cantry to call some APIs to retrieve an address by
     */
    async onSendToAddressInput(enteredText: string) {
        this.suggestedAddresses = [];
        this.addressName = null;

        if (!enteredText) {
            return;
        }

        // Quick and dirty way to not try to resolve a name when it's actually an address already, not name.
        // Could be improved later.
        if (enteredText.length > 20) {
            return;
        }

        // Cryptoname
        if (enteredText.length >= 3) {
            // For now, handle only ELA addresses for cryptoname
            if (this.elastosChainCode !== StandardCoinName.ELA) {
                return;
            } else {
                const lowerCaseText = enteredText.toLowerCase();
                const cryptoNameResolver = new CryptoAddressResolvers.CryptoNameResolver(this.http);
                const results = await cryptoNameResolver.resolve(lowerCaseText, StandardCoinName.ELA);
                Logger.log('wallet', "cryptoname results", results);
                this.suggestedAddresses = this.suggestedAddresses.concat(results);
            }
        }
    }

    /**
     * A suggested resolved address is picked by the user. Replace user's input (ex: the user friendly name)
     * with its real address.
     */
    selectSuggestedAddress(suggestedAddress: CryptoAddressResolvers.CryptoNameAddress) {
        this.toAddress = suggestedAddress.address;
        // this.addressName = suggestedAddress.getDisplayName();
        this.addressName = suggestedAddress.name;

        // Hide/reset suggestions
        this.suggestedAddresses = [];

        const targetContact = this.contactsService.contacts.find((contact) => contact.address === suggestedAddress.address);
        if (!targetContact) {
            this.contactsService.contacts.push({
                cryptoname:  this.addressName,
                address: this.toAddress
            });

            this.contactsService.setContacts();
        }

        this.setCryptonamesKeyVisibility(true);
    }

    isStandardSubwallet(subWallet: SubWallet) {
        return subWallet instanceof StandardSubWallet;
    }

    convertAmountToBigNumber(amount: number) {
        return new BigNumber(amount);
    }

    async showCryptonames() {
        this.modal = await this.modalCtrl.create({
            component: ContactsComponent,
            componentProps: {
            },
        });
        this.modal.onWillDismiss().then((params) => {
            Logger.log('wallet', 'Contact selected', params);
            if (params.data && params.data.contact) {
                this.addressName = params.data.contact.cryptoname;
                this.toAddress = params.data.contact.address;
            }

            this.modal = null;
        });
        this.modal.present();
    }

    // Intent response will return a contact's DID document under result.friends.document
    async openContacts() {
        Logger.log('wallet', "Sending intent 'https://contact.elastos.net/pickfriend', requesting credentialType: 'elaAddress'");
        let res = await this.globalIntentService.sendIntent(
            "https://contact.elastos.net/pickfriend",
            {
              singleSelection: true,
              filter: {
                credentialType: "elaAddress"
              }
        });
        Logger.log('wallet', 'pickfriend intent res', res);
        if (res.result.friends && res.result.friends[0]) {
          this.zone.run(() => {
              this.toAddress = res.result.friends[0].credentials.elaAddress;
              this.addressName = res.result.friends[0].credentials.name;
          });
        }
    }

    getResidual(balance: BigNumber) {
        if (this.amount) {
            return balance.minus(this.amount);
        } else {
            return balance;
        }
    }

    isPositiveResidual(balance: BigNumber) {
        if (this.amount) {
            const residual = balance.minus(this.amount);
            if (residual.isGreaterThanOrEqualTo(0)) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    getButtonLabel(): string {
        switch (this.transferType) {
            case TransferType.RECHARGE:
                return 'wallet.recharge';
            case TransferType.SEND:
                return 'wallet.send';
            case TransferType.PAY:
                return 'wallet.pay';
            case TransferType.WITHDRAW:
                return 'wallet.withdraw';
            default:
                return 'wallet.send';
        }
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

    /**
     * Tells whether the transfer can be sent to another of user's existing wallets.
     * Typically, this returns true if there are more than one wallet created in the app.
     */
    canSendToPersonalWallet(): boolean {
        return (this.walletManager.getWalletsCount() > 1);
    }

    /**
     * Opens a wallet chooser, optionally with excluding the current wallet.
     */
    async choosePersonalWallet(excludeCurrentWallet = false) {
        let options: WalletChooserComponentOptions = {
            sourceWallet: this.masterWallet,
            elastosChainCode: this.elastosChainCode as StandardCoinName
        };

        if (excludeCurrentWallet) {
            options.excludeWalletId = this.masterWallet.id;
        }

        this.modal = await this.modalCtrl.create({
            component: TransferWalletChooserComponent,
            componentProps: options,
        });
        this.modal.onWillDismiss().then(async (params) => {
            Logger.log('wallet', 'Personal wallet selected:', params);
            if (params.data && params.data.selectedWalletId) {
                let selectedWallet = this.walletManager.getMasterWallet(params.data.selectedWalletId);
                let selectedSubwallet = selectedWallet.getSubWallet(this.elastosChainCode);
                if (!selectedSubwallet) {
                    // Subwallet doesn't exist on target master wallet. So we activate it.
                    let coin = this.coinService.getCoinByID(this.elastosChainCode);
                    await selectedWallet.createSubWallet(coin);
                    selectedSubwallet = selectedWallet.getSubWallet(this.elastosChainCode);
                }

                this.toAddress = await selectedSubwallet.createAddress();
            }

            this.modal = null;
        });
        this.modal.present();
    }
}
