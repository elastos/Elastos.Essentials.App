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

import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { IonContent, ModalController, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { Web3Exception } from 'src/app/model/exceptions/web3.exception';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { AppTheme, GlobalThemeService } from 'src/app/services/global.theme.service';
import { OptionsComponent, OptionsType } from 'src/app/wallet/components/options/options.component';
import { TransferWalletChooserComponent, WalletChooserComponentOptions } from 'src/app/wallet/components/transfer-wallet-chooser/transfer-wallet-chooser.component';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { ElastosSmartChainNetworkBase } from 'src/app/wallet/model/networks/elastos/evms/esc/network/esc.networks';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { ETHTransactionStatus } from 'src/app/wallet/model/networks/evms/evm.types';
import { NFT, NFTType } from 'src/app/wallet/model/networks/evms/nfts/nft';
import { NFTAsset } from 'src/app/wallet/model/networks/evms/nfts/nftasset';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { MainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { ERC1155Service } from 'src/app/wallet/services/evm/erc1155.service';
import { ERC721Service } from 'src/app/wallet/services/evm/erc721.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { IntentService, ScanType } from 'src/app/wallet/services/intent.service';
import { NameResolvingService } from 'src/app/wallet/services/nameresolving.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { ContactsComponent } from '../../../../components/contacts/contacts.component';
import { TxConfirmComponent } from '../../../../components/tx-confirm/tx-confirm.component';
import { TxSuccessComponent } from '../../../../components/tx-success/tx-success.component';
import { Config } from '../../../../config/Config';
import * as CryptoAddressResolvers from '../../../../model/address-resolvers';
import { CoinType, StandardCoinName } from '../../../../model/coin';
import { MainCoinSubWallet } from '../../../../model/networks/base/subwallets/maincoin.subwallet';
import { AnySubWallet } from '../../../../model/networks/base/subwallets/subwallet';
import { CoinTransferService, Transfer, TransferType } from '../../../../services/cointransfer.service';
import { ContactsService } from '../../../../services/contacts.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Native } from '../../../../services/native.service';
import { UiService } from '../../../../services/ui.service';
import { WalletService } from '../../../../services/wallet.service';

@Component({
    selector: 'app-coin-transfer',
    templateUrl: './coin-transfer.page.html',
    styleUrls: ['./coin-transfer.page.scss'],
    providers: [Keyboard],
})
export class CoinTransferPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
    @ViewChild(IonContent) contentArea: IonContent;

    public networkWallet: AnyNetworkWallet;
    public tokensymbol = '';

    // Define transfer type
    public transferType: TransferType;
    public subWalletId: string;

    // User inputs
    public toAddress: string;
    public amount: number; // Here we can use JS "number" type, for now we consider we will never transfer a number that is larger than JS's MAX INT.
    public memo = '';
    public sendMax = false;

    public displayBalanceString = '';
    private displayBalanceLocked = '';

    // Display recharge wallets
    public fromSubWallet: AnySubWallet;
    public toSubWallet: AnySubWallet = null;

    // User can set gas price and limit.
    private gasPrice: string = null;
    private gasLimit: string = null;
    private nonce = -1;

    // Intent
    private action = null;
    private intentId = null;

    // NFT
    public nft: NFT = null;
    public nftAsset: NFTAsset = null;

    // Display memo
    public hideMemo = true;

    // Pay intent
    public amountCanBeEditedInPayIntent = true;

    // Submit transaction
    public transaction: () => Promise<void> | void;

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

    constructor(
        public route: ActivatedRoute,
        public walletManager: WalletService,
        public coinTransferService: CoinTransferService,
        public native: Native,
        public events: GlobalEvents,
        public zone: NgZone,
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
        private nameResolvingService: NameResolvingService,
        private erc721Service: ERC721Service,
        private erc1155Service: ERC1155Service,
        private ethTransactionService: EVMService
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
        this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(this.coinTransferService.masterWalletId);
        this.transferType = this.coinTransferService.transferType;
        this.subWalletId = this.coinTransferService.subWalletId;

        this.fromSubWallet = this.networkWallet.getSubWallet(this.subWalletId);
        this.tokensymbol = this.fromSubWallet.getDisplayTokenName();

        Logger.log('wallet', 'Balance', this.networkWallet.subWallets[this.subWalletId].getDisplayBalance().toFixed());

        if (this.fromSubWallet instanceof MainCoinEVMSubWallet) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.publicationStatusSub = EVMService.instance.ethTransactionStatus.subscribe(async (status) => {
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
                        this.events.publish('wallet:transactionsent', { subwalletid: this.subWalletId, txid: status.txId });
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

            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.ethTransactionSpeedupSub = EVMService.instance.ethTransactionSpeedup.subscribe(async (status) => {
                Logger.log('wallet', 'CoinTransferPage ethTransactionStatus:', status)
                if (status) {
                    this.gasPrice = status.gasPrice;
                    this.gasLimit = status.gasLimit;
                    this.nonce = status.nonce;
                    // Do Transaction
                    await this.transaction();
                    // Reset gas price.
                    this.gasPrice = null;
                    this.gasLimit = null;
                    this.nonce = -1;
                }
            });
        }

        switch (this.transferType) {
            // For Recharge Transfer
            case TransferType.RECHARGE:
                // Setup page display
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-recharge-title", { coinName: this.coinTransferService.toSubWalletId }));
                this.toSubWallet = await this.getELASubwalletByID(this.coinTransferService.toSubWalletId as StandardCoinName);

                // Setup params for recharge transaction
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.transaction = this.createRechargeTransaction;
                this.toAddress = await this.toSubWallet.getCurrentReceiverAddress();

                Logger.log('wallet', 'Transferring from..', this.fromSubWallet);
                Logger.log('wallet', 'Transferring To..', this.toSubWallet);
                Logger.log('wallet', 'Subwallet address', this.toAddress);
                break;
            case TransferType.WITHDRAW:
                // Setup page display
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-withdraw-title"));

                this.toSubWallet = await this.getELASubwalletByID(StandardCoinName.ELA);

                // Setup params for withdraw transaction
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.transaction = this.createWithdrawTransaction;
                this.toAddress = await this.toSubWallet.getCurrentReceiverAddress();

                Logger.log('wallet', 'Transferring from..', this.fromSubWallet);
                Logger.log('wallet', 'Transferring To..', this.toSubWallet);
                Logger.log('wallet', 'Subwallet address', this.toAddress);
                break;
            // For Send Transfer
            case TransferType.SEND:
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-send-title"));
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.transaction = this.createSendTransaction;

                if (this.subWalletId === StandardCoinName.ELA) {
                    // Always show contacts app key
                    // NOTE: picking a contact works only for elastos mainchain for now, until we get a better
                    // standardization for credential types that could store wallet addresses.
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
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
            // Send NFT
            case TransferType.SEND_NFT:
                this.titleBar.setTitle(this.translate.instant('wallet.ext-tx-info-type-send-nft'));

                this.transaction = this.createSendNFTTransaction;

                // Retrieve the NFT
                let nftContractAddress = this.coinTransferService.nftTransfer.nft.contractAddress;
                this.nft = this.networkWallet.getNFTByAddress(nftContractAddress);

                // Retrieve the NFT asset
                let assetID = this.coinTransferService.nftTransfer.assetID;
                this.nftAsset = this.nft.getAssetById(assetID);

                Logger.log("wallet", "Initialization complete for NFT details", this.networkWallet, this.nft, this.nftAsset);
                break;
        }

        this.displayBalanceString = this.uiService.getFixedBalance(this.networkWallet.subWallets[this.subWalletId].getDisplayBalance());
        void this.getBalanceSpendable();
    }

    private async getBalanceSpendable() {
        await this.fromSubWallet.updateBalanceSpendable();
        this.zone.run(() => {
            let balanceSpendable = this.fromSubWallet.getRawBalanceSpendable();
            let balance = this.fromSubWallet.getRawBalance();
            let margin = balance.minus(balanceSpendable);
            if (margin.gt(1000)) { // 1000 : SELA
                this.displayBalanceLocked = this.uiService.getFixedBalance(this.networkWallet.subWallets[this.subWalletId].getDisplayAmount(margin));
                this.displayBalanceString = this.uiService.getFixedBalance(this.networkWallet.subWallets[this.subWalletId].getDisplayAmount(balanceSpendable));
            }
        })
    }

    /**
     * Same chain, different "users"
     */
    async createSendTransaction() {
        await this.native.showLoading(this.translate.instant('common.please-wait'));

        // Call dedicated api to the source subwallet to generate the appropriate transaction type.
        // For example, ERC20 token transactions are different from standard coin transactions (for now - as
        // the spv sdk doesn't support ERC20 yet).
        let rawTx = null;
        try {
            if (this.fromSubWallet instanceof ERC20SubWallet) {
                rawTx = await this.fromSubWallet.createPaymentTransaction(
                    this.toAddress, // User input address
                    new BigNumber(this.amount), // User input amount
                    this.memo, // User input memo
                    this.gasPrice,
                    this.gasLimit,
                    this.nonce
                );
            }
            else if (this.fromSubWallet instanceof MainCoinSubWallet) {
                rawTx = await this.fromSubWallet.createPaymentTransaction(
                    this.toAddress, // User input address
                    new BigNumber(this.amount), // User input amount
                    this.memo // User input memo
                );
            }
            else {
                throw new Error("Unknown subwallet type used for payment!");
            }
        } catch (err) {
            await this.parseException(err);
        }
        await this.native.hideLoading();

        // SIGN AND PUBLISH
        await this.signAndSendRawTransaction(rawTx);
    }

    /**
     * From mainchain to sidechains (ID, ETH)
     */
    async createRechargeTransaction() {
        await this.native.showLoading(this.translate.instant('common.please-wait'));

        let rawTx = null;
        try {
            rawTx = await (this.fromSubWallet as MainChainSubWallet).createDepositTransaction(
                this.coinTransferService.toSubWalletId as StandardCoinName, // To subwallet id
                this.toAddress, // to address
                this.amount, // User input amount
                this.memo // Memo, not necessary
            );
        } catch (err) {
            await this.parseException(err);
        }

        await this.native.hideLoading();

        await this.signAndSendRawTransaction(rawTx);
    }

    /**
     * From sidechain (ID, ETH) to mainchain
     */
    async createWithdrawTransaction() {
        let rawTx = null;
        try {
            rawTx = await this.fromSubWallet.createWithdrawTransaction(
                this.toAddress,
                this.amount,
                this.memo,
                this.gasPrice,
                this.gasLimit,
                this.nonce
            );
        } catch (err) {
            await this.parseException(err);
        }

        await this.signAndSendRawTransaction(rawTx);
    }

    async createSendNFTTransaction() {
        await this.native.showLoading(this.translate.instant('common.please-wait'));

        let rawTx = null;
        try {
            let fromAddress = await this.fromSubWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);

            if (this.nft.type === NFTType.ERC721) {
                rawTx = await this.erc721Service.createRawTransferERC721Transaction(
                    this.networkWallet,
                    fromAddress,
                    this.nft.contractAddress,
                    this.nftAsset.id,
                    this.toAddress
                );
            }
            else if (this.nft.type === NFTType.ERC1155) {
                rawTx = await this.erc1155Service.createRawTransferERC1155Transaction(
                    this.networkWallet,
                    fromAddress,
                    this.nft.contractAddress,
                    this.nftAsset.id,
                    this.toAddress
                );
            }
        } catch (err) {
            await this.parseException(err);
        }
        await this.native.hideLoading();

        // SIGN AND PUBLISH
        await this.signAndSendRawTransaction(rawTx);
    }

    private async signAndSendRawTransaction(rawTx) {
        if (rawTx) {
            const transfer = new Transfer();
            Object.assign(transfer, {
                masterWalletId: this.networkWallet.id,
                subWalletId: this.subWalletId,
                //rawTransaction: rawTx,
                action: this.action,
                intentId: this.intentId
            });

            const result = await this.fromSubWallet.signAndSendRawTransaction(rawTx, transfer);

            if (transfer.intentId) {
                await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
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
            void this.doActionAccordingToOptions(ret.data);
        });
        return await this.popover.present();
    }

    async doActionAccordingToOptions(ret: OptionsType) {
        switch (ret) {
            case OptionsType.CONTACTS:
                void this.openContacts();
                break;
            case OptionsType.CRYPTONAMES:
                void this.showCryptonames();
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

        const isAddressValid = await this.isAddressValid(this.toAddress);
        if (!isAddressValid) {
            this.native.toast_trans('wallet.not-a-valid-address');
            return;
        }
    }

    goScan() {
        void this.intentService.scan(ScanType.Address);
    }

    supportsMaxTransfer() {
        return !this.isTransferTypeSendNFT();
    }

    setMaxTransfer() {
        this.zone.run(() => {
            this.sendMax = true;
            // -1 means send all.
            this.amount = -1;
        });
    }

    resetAmountInput() {
        this.sendMax = false;
        this.amount = null;
    }

    async goTransaction() {
        if (this.checkValuesReady()) {
            await this.startTransaction();
        }
    }

    private conditionalShowToast(message: string, showToast: boolean, duration = 4000) {
        if (showToast)
            this.native.toast_trans(message, duration);
    }

    /**
     * Make sure all parameters are right before sending a transaction or enabling the send button.
     */
    checkValuesReady(showToast = true): boolean {
        // Check amount only when used (eg: no for NFT transfers)
        if (!this.isTransferTypeSendNFT()) {
            if (!this.sendMax) {
                if (Util.isNull(this.amount) || this.amount <= 0) {
                    this.conditionalShowToast('wallet.amount-invalid', showToast);
                    return false;
                }

                const amountBigNumber = new BigNumber(this.amount || 0);
                if (!this.networkWallet.subWallets[this.subWalletId].isBalanceEnough(amountBigNumber)) {
                    this.conditionalShowToast('wallet.insufficient-balance', showToast);
                    return false;
                }

                if (!this.networkWallet.subWallets[this.subWalletId].isAmountValid(amountBigNumber)) {
                    this.conditionalShowToast('wallet.amount-invalid', showToast);
                    return false;
                }
            }
        }

        // Make sure we have a destination address
        if (!this.toAddress) {
            this.conditionalShowToast('Destination address is missing', showToast);
            return false;
        }

        if (this.fromSubWallet.type === CoinType.ERC20) {
            // Balance can cover fees?
            // TODO: 0.0001 works only for Elastos ESC! Rework this.
            if (!this.networkWallet.getMainEvmSubWallet().isBalanceEnough(new BigNumber(0.0001))) {
                const message = this.translate.instant("wallet.eth-insuff-balance", { coinName: this.networkWallet.getDisplayTokenName() })
                this.conditionalShowToast(message, showToast, 4000);
                return false;
            }
        }

        if (this.transferType === TransferType.WITHDRAW) {
            if (!this.sendMax && (this.amount < 0.0002))
                return false; // TODO: toast

            // TODO: What the hell is this code supposed to do ? :)
            const amountString = this.amount.toString();
            const dotIndex = amountString.indexOf('.');
            if ((dotIndex + 9) < amountString.length) {
                return false; // TODO: toast
            }
        }

        return true;
    }

    private isAddressValid(toAddress: string) {
        let targetSubwallet = this.toSubWallet ? this.toSubWallet : this.fromSubWallet;
        return targetSubwallet.isAddressValid(this.toAddress);
    }

    async startTransaction() {
        // Specific case for ELA mainchain. TODO: should move to ela mainchain subwallet?
        if (this.subWalletId === StandardCoinName.ELA) {
            const mainAndIDChainSubWallet = this.networkWallet.subWallets[this.subWalletId] as MainChainSubWallet;
            const isAvailableBalanceEnough =
                await mainAndIDChainSubWallet.isAvailableBalanceEnough(new BigNumber(this.amount).multipliedBy(mainAndIDChainSubWallet.tokenAmountMulipleTimes));

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

            const isAddressValid = await this.isAddressValid(this.toAddress);
            if (!isAddressValid) {
                this.native.toast_trans('wallet.not-a-valid-address');
                return;
            }

            if (this.transferType === TransferType.PAY) {
                await this.transaction();
            } else {
                void this.showConfirm();
            }
        } catch (error) {
            Logger.error("wallet", "Can't start transaction in coin transfer page:", error);
            this.native.toast_trans('wallet.not-a-valid-address');
        }
    }

    private async parseException(err) {
        Logger.error('wallet', "transaction error:", err);
        let reworkedEx = WalletExceptionHelper.reworkedWeb3Exception(err);
        if (reworkedEx instanceof Web3Exception) {
            await PopupProvider.instance.ionicAlert("wallet.transaction-fail", "common.network-or-server-error");
        } else {
            await PopupProvider.instance.ionicAlert("wallet.transaction-fail", err.message);
        }
    }

    async showConfirm() {
        const txInfo = {
            type: this.transferType,
            transferFrom: this.subWalletId,
            transferTo: this.transferType === TransferType.RECHARGE ? this.coinTransferService.toSubWalletId : this.toAddress,
            amount: this.amount,
            precision: this.fromSubWallet.tokenDecimals,
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
                void this.transaction();
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

    /**
     * Callback called whenever the "send to" address changes.
     * At that time, we cantry to call some APIs to retrieve an address by
     */
    onSendToAddressInput(enteredText: string) {
        this.suggestedAddresses = [];
        this.addressName = null;

        if (!enteredText) {
            return;
        }

        // // Quick and dirty way to not try to resolve a name when it's actually an address already, not name.
        // // Could be improved later.
        // if (enteredText.length > 20) {
        //     return;
        // }

        // Cryptoname
        if (enteredText.length >= 3) {
            // eslint-disable-next-line no-async-foreach/no-async-foreach, @typescript-eslint/no-misused-promises
            this.nameResolvingService.getResolvers().forEach(async resolver => {
                // resolvers can answer at any time, asynchronously
                const results = await resolver.resolve(enteredText, this.fromSubWallet); // Use fromSubWallet just to know the network (toSubWallet is not always set)
                Logger.log('wallet', "Name resolver got results from", resolver.getName(), results);
                this.suggestedAddresses = this.suggestedAddresses.concat(results);

                if (this.suggestedAddresses.length > 0) {
                    // Scroll screen to bottom to let the suggested resolved name appear on screen
                    void this.contentArea.scrollToBottom(500);
                }
            });
        }
    }

    /**
     * A suggested resolved address is picked by the user. Replace user's input (ex: the user friendly name)
     * with its real address.
     */
    async selectSuggestedAddress(suggestedAddress: CryptoAddressResolvers.CryptoNameAddress): Promise<void> {
        this.toAddress = suggestedAddress.address;
        // this.addressName = suggestedAddress.getDisplayName();
        this.addressName = suggestedAddress.name;

        // Hide/reset suggestions
        this.suggestedAddresses = [];

        const targetContact = this.contactsService.contacts.find((contact) => contact.address === suggestedAddress.address);
        if (!targetContact) {
            this.contactsService.contacts.push({
                cryptoname: this.addressName,
                address: this.toAddress
            });

            await this.contactsService.setContacts();
        }

        this.setCryptonamesKeyVisibility(true);
    }

    isStandardSubwallet(subWallet: AnySubWallet) {
        return subWallet instanceof MainCoinSubWallet;
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
        let res = await this.globalIntentService.sendIntent(
            "https://contact.elastos.net/pickfriend",
            {
                singleSelection: true,
                filter: {
                    credentialType: "elaAddress"
                }
            });
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
            if (this.keyboard.isVisible) {
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
        return (this.walletManager.getMasterWalletsCount() > 1);
    }

    /**
     * Opens a wallet chooser, optionally with excluding the current wallet.
     */
    async choosePersonalWallet(excludeCurrentWallet = false) {
        let options: WalletChooserComponentOptions = {
            sourceWallet: this.networkWallet,
            subWalletId: this.subWalletId
        };

        if (excludeCurrentWallet) {
            options.excludeWalletId = this.networkWallet.id;
        }

        this.modal = await this.modalCtrl.create({
            component: TransferWalletChooserComponent,
            componentProps: options,
        });
        this.modal.onWillDismiss().then(async (params) => {
            Logger.log('wallet', 'Personal wallet selected:', params);
            if (params.data && params.data.selectedWalletId) {
                let selectedWallet = this.walletManager.getNetworkWalletFromMasterWalletId(params.data.selectedWalletId);
                let selectedSubwallet = selectedWallet.getSubWallet(this.subWalletId);
                if (!selectedSubwallet) {
                    // Subwallet doesn't exist on target master wallet. So we activate it.
                    let coin = (<EVMNetwork>this.networkWallet.network).getCoinByID(this.subWalletId);
                    await selectedWallet.createNonStandardSubWallet(coin);
                    selectedSubwallet = selectedWallet.getSubWallet(this.subWalletId);
                }

                this.toAddress = await selectedSubwallet.getCurrentReceiverAddress(AddressUsage.SEND_FUNDS);
            }

            this.modal = null;
        });
        this.modal.present();
    }

    // for elastos cross chain transaction.
    async getELASubwalletByID(id: StandardCoinName) {
        let networkKey = 'elastos';
        switch (id) {
            case StandardCoinName.ETHDID:
                networkKey = 'elastosidchain';
                break;
            case StandardCoinName.ETHSC:
                networkKey = 'elastossmartchain';
                break;
            default:
                break;
        }

        let network = WalletNetworkService.instance.getNetworkByKey(networkKey);
        let networkWallet = await network.createNetworkWallet(this.networkWallet.masterWallet, false);
        return networkWallet.getSubWallet(id);
    }

    public isTransferTypeSendNFT(): boolean {
        return this.transferType === TransferType.SEND_NFT;
    }

    public getDisplayableAssetName(): string {
        return this.nftAsset.name || this.translate.instant("wallet.nft-unnamed-asset");
    }

    public getDisplayableAssetID(): string {
        return this.nftAsset.displayableId;
    }

    public hasRealAssetIcon(): boolean {
        return !!(this.nftAsset.imageURL);
    }

    public getAssetIcon(): string {
        if (this.hasRealAssetIcon())
            return this.nftAsset.imageURL;
        else
            return "assets/wallet/coins/eth-purple.svg";
    }

    /**
     * We show a warning to usersto make sure they don't send ESC ELA to coinbase.
     * Both use EVM addresses, but coinbase uses the wrapped ethereum ELA, so sending ESC ELA
     * to coinbase would make the funds lost.
     *
     * This warning is shown if:
     * - network is ESC
     * - sending coin is ELA
     * - transfer type is SEND
     */
    public shouldShowCoinbaseELAWarning(): boolean {
        // Network should be ESC
        if (!this.networkWallet || this.networkWallet.network.key !== ElastosSmartChainNetworkBase.NETWORK_KEY)
            return false;

        if (!this.fromSubWallet || this.fromSubWallet.id !== StandardCoinName.ETHSC)
            return false;

        if (this.transferType !== TransferType.SEND)
            return false;

        return true;
    }
}
