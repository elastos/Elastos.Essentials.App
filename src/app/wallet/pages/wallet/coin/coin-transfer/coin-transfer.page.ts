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
import { MenuSheetMenu } from 'src/app/components/menu-sheet/menu-sheet.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { sleep } from 'src/app/helpers/sleep.helper';
import { WalletExceptionHelper } from 'src/app/helpers/wallet.helper';
import { Logger } from 'src/app/logger';
import { WalletPendingTransactionException } from 'src/app/model/exceptions/walletpendingtransaction.exception';
import { Web3Exception } from 'src/app/model/exceptions/web3.exception';
import { Util } from 'src/app/model/util';
import { BTCFeeSpeed, GlobalBTCRPCService } from 'src/app/services/global.btc.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalTronGridService } from 'src/app/services/global.tron.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { OptionsComponent, OptionsType } from 'src/app/wallet/components/options/options.component';
import { TransferWalletChooserComponent, WalletChooserComponentOptions } from 'src/app/wallet/components/transfer-wallet-chooser/transfer-wallet-chooser.component';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { BTCSubWallet } from 'src/app/wallet/model/networks/btc/subwallets/btc.subwallet';
import { ElastosSmartChainNetworkBase } from 'src/app/wallet/model/networks/elastos/evms/esc/network/esc.networks';
import { ElastosEVMSubWallet } from 'src/app/wallet/model/networks/elastos/evms/subwallets/standard/elastos.evm.subwallet';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { ETHTransactionStatus } from 'src/app/wallet/model/networks/evms/evm.types';
import { NFT, NFTType } from 'src/app/wallet/model/networks/evms/nfts/nft';
import { NFTAsset } from 'src/app/wallet/model/networks/evms/nfts/nftasset';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { MainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { TRC20SubWallet } from 'src/app/wallet/model/networks/tron/subwallets/trc20.subwallet';
import { TronSubWallet } from 'src/app/wallet/model/networks/tron/subwallets/tron.subwallet';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { ERC1155Service } from 'src/app/wallet/services/evm/erc1155.service';
import { ERC721Service } from 'src/app/wallet/services/evm/erc721.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { IntentService, ScanType } from 'src/app/wallet/services/intent.service';
import { NameResolvingService } from 'src/app/wallet/services/nameresolving.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
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
import { NetworkInfo } from '../coin-select/coin-select.page';

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
    public destNetworkInfo: NetworkInfo = null;
    // For cross chain transfer
    public useCustumReceiverAddress = false;

    // For ELA mainchain
    private feeOfELA: string = null;

    // For BTC
    private feeOfBTC: string = null
    private btcFeerateUsed = BTCFeeSpeed.AVERAGE; // default
    private btcFeerates: {
        [index: number]: number
    } = {};

    // For Tron
    private feeOfTRX: string = null

    // User can set gas price and limit.
    private gasPrice: string = null;
    private gasLimit: string = null;
    private nonce = -1;

    // Tron
    private feeLimitOfTRX: number = null;

    // Intent
    private action = null;
    private intentId = null;
    private alreadySentIntentResponse = false;

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
    private resolverNameTimeout = null;

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
        public globalPopupService: GlobalPopupService,
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
        if (this.intentId) {
            if (!this.alreadySentIntentResponse) {
                void this.cancelPayment();
            }
        }
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
                            this.alreadySentIntentResponse = true;
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
                            this.alreadySentIntentResponse = true;
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

        let network = null;
        switch (this.transferType) {
            // For Recharge Transfer
            case TransferType.RECHARGE:
                // Setup page display
                network = this.getELANetworkByID(this.coinTransferService.toSubWalletId as StandardCoinName);
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-recharge-title", { coinName: network.shortName }));
                this.toSubWallet = await this.getELASubwalletByID(this.coinTransferService.toSubWalletId as StandardCoinName);
                if (this.toSubWallet) {
                    this.toAddress = this.toSubWallet.getCurrentReceiverAddress();
                } else {
                    this.useCustumReceiverAddress = true;
                    this.destNetworkInfo = this.coinTransferService.networkInfo;
                }
                // Setup params for recharge transaction
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.transaction = this.createRechargeTransaction;

                this.feeOfELA = '0.0002'; // ELA

                Logger.log('wallet', 'Transferring from..', this.fromSubWallet);
                Logger.log('wallet', 'Transferring To..', this.toSubWallet);
                Logger.log('wallet', 'Subwallet address', this.toAddress);
                break;
            case TransferType.WITHDRAW:
                // Setup page display
                network = this.getELANetworkByID(this.coinTransferService.toSubWalletId as StandardCoinName);
                this.titleBar.setTitle(this.translate.instant("wallet.coin-transfer-withdraw-title", { coinName: network.shortName }));

                // Setup params for withdraw transaction
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                this.transaction = this.createWithdrawTransaction;

                this.toSubWallet = await this.getELASubwalletByID(StandardCoinName.ELA);
                if (this.toSubWallet) {
                    this.toAddress = this.toSubWallet.getCurrentReceiverAddress();
                }
                this.gasLimit = (await (this.fromSubWallet as ElastosEVMSubWallet).estimateWithdrawTransactionGas(this.toAddress)).toString();

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

                    this.feeOfELA = '0.0001'; // ELA
                } else {
                    try {
                        if (this.networkWallet.network.isEVMNetwork()) {
                            if (this.fromSubWallet instanceof MainCoinEVMSubWallet) {
                                this.gasLimit = (await this.fromSubWallet.estimateTransferTransactionGas()).toString();
                            } else if (this.fromSubWallet instanceof ERC20SubWallet) {
                                this.gasLimit = (await this.fromSubWallet.estimateTransferTransactionGas()).toString();
                            }
                        } else if (this.fromSubWallet instanceof BTCSubWallet) {
                            // call estimateTransferTransactionGas after input amount
                            // this.feeOfBTC = (await this.fromSubWallet.estimateTransferTransactionGas()).toString();
                        } else if (this.fromSubWallet instanceof TRC20SubWallet) {
                            let feeSun = await this.fromSubWallet.estimateTransferTransactionGas();
                            this.feeLimitOfTRX = Util.ceil(feeSun, 10000000);
                            this.feeOfTRX = GlobalTronGridService.instance.fromSun(feeSun.toString()).toString();
                        }
                    }
                    catch (err) {
                        Logger.warn('wallet', 'estimateTransferTransactionGas exception:', err)
                        await this.parseException(err);
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

                if (this.subWalletId === StandardCoinName.ELA) {
                    this.feeOfELA = '0.0001'; // ELA
                } else {
                    try {
                        if (this.networkWallet.network.isEVMNetwork()) {
                            if (this.fromSubWallet instanceof MainCoinEVMSubWallet) {
                                this.gasLimit = (await this.fromSubWallet.estimateTransferTransactionGas()).toString();
                            } else if (this.fromSubWallet instanceof ERC20SubWallet) {
                                this.gasLimit = (await this.fromSubWallet.estimateTransferTransactionGas()).toString();
                            }
                        }
                        // else if (this.fromSubWallet instanceof BTCSubWallet) {
                        //     this.feeOfBTC = (await this.fromSubWallet.estimateTransferTransactionGas()).toString();
                        // }
                    }
                    catch (err) {
                        Logger.warn('wallet', 'estimateTransferTransactionGas exception:', err)
                        await this.parseException(err);
                    }
                }
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

                let fromAddress = this.fromSubWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);
                if (this.nft.type === NFTType.ERC721) {
                    this.gasLimit = (await this.erc721Service.estimateTransferERC721TransactionGas(
                        this.networkWallet,
                        fromAddress,
                        this.nft.contractAddress,
                        this.nftAsset.id
                    ))?.toString();
                }
                else if (this.nft.type === NFTType.ERC1155) {
                    this.gasLimit = (await this.erc1155Service.estimateTransferERC1155TransactionGas(
                        this.networkWallet,
                        fromAddress,
                        this.nft.contractAddress,
                        this.nftAsset.id
                    ))?.toString();
                }

                Logger.log("wallet", "Initialization complete for NFT details", this.networkWallet, this.nft, this.nftAsset);
                break;
        }

        // Only show cryptonames key if user has previously used crypto names
        if (this.contactsService.contacts.length) {
            this.setCryptonamesKeyVisibility(true);
        }

        if (this.fromSubWallet instanceof BTCSubWallet) {
            void this.getAllBTCFeerate()
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
            if ((this.fromSubWallet instanceof ERC20SubWallet) || (this.fromSubWallet instanceof MainCoinEVMSubWallet)) {
                rawTx = await this.fromSubWallet.createPaymentTransaction(
                    this.toAddress, // User input address
                    new BigNumber(this.amount), // User input amount
                    this.memo, // User input memo
                    this.gasPrice,
                    this.gasLimit,
                    this.nonce
                );
            }
            else if (this.fromSubWallet instanceof BTCSubWallet) {
                rawTx = await this.fromSubWallet.createPaymentTransaction(
                    this.toAddress, // User input address
                    new BigNumber(this.amount), // User input amount
                    this.memo, // User input memo
                    this.btcFeerateUsed
                );
            }
            else if (this.fromSubWallet instanceof MainCoinSubWallet) {
                rawTx = await this.fromSubWallet.createPaymentTransaction(
                    this.toAddress, // User input address
                    new BigNumber(this.amount), // User input amount
                    this.memo // User input memo
                );
            }
            else if (this.fromSubWallet instanceof TRC20SubWallet) {
                rawTx = await this.fromSubWallet.createPaymentTransaction(
                    this.toAddress, // User input address
                    new BigNumber(this.amount), // User input amount
                    this.feeLimitOfTRX
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
            let fromAddress = this.fromSubWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);

            if (this.nft.type === NFTType.ERC721) {
                rawTx = await this.erc721Service.createRawTransferERC721Transaction(
                    this.networkWallet,
                    fromAddress,
                    this.nft.contractAddress,
                    this.nftAsset.id,
                    this.toAddress,
                    this.gasPrice,
                    this.gasLimit
                );
            }
            else if (this.nft.type === NFTType.ERC1155) {
                rawTx = await this.erc1155Service.createRawTransferERC1155Transaction(
                    this.networkWallet,
                    fromAddress,
                    this.nft.contractAddress,
                    this.nftAsset.id,
                    this.toAddress,
                    this.gasPrice,
                    this.gasLimit
                );
            }

            if (!rawTx) {
                // Probably failed to create transaction because of non standard NFT transfer methods in contracts.
                // Let user know
                await this.globalPopupService.ionicAlert("wallet.transaction-fail", "wallet.nft-transaction-creation-error");
            }

        } catch (err) {
            await this.parseException(err);
        }
        await this.native.hideLoading();

        // SIGN AND PUBLISH
        if (rawTx)
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

            GlobalFirebaseService.instance.logEvent("wallet_coin_transfer_send");

            const result = await this.fromSubWallet.signAndSendRawTransaction(rawTx, transfer);

            if (transfer.intentId) {
                this.alreadySentIntentResponse = true;
                await this.globalIntentService.sendIntentResponse(result, transfer.intentId);
            }
        } else {
            if (this.intentId) {
                this.alreadySentIntentResponse = true;
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
            cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'options-component' : 'options-component-dark',
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
        if (await this.checkValuesReady()) {
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
    async checkValuesReady(showToast = true): Promise<boolean> {
        // Make sure we have a destination address
        if (!this.toAddress) {
            this.conditionalShowToast('wallet.not-a-valid-address', showToast);
            return false;
        }

        if (this.fromSubWallet instanceof BTCSubWallet) {
            // Calculate fee after input amount
            try {
              this.feeOfBTC = (await this.fromSubWallet.estimateTransferTransactionGas(this.btcFeerateUsed, null, new BigNumber(this.amount))).toString();
            } catch (e) {
              let stringifiedError = "" + e;
              let message = 'Failed to estimate fee';
              if (stringifiedError.indexOf("Utxo is not enough") >= 0) {
                message = 'wallet.insufficient-balance';
              }
              this.conditionalShowToast(message, showToast);
              return false;
            }
        }

        let fee = null;
        if (this.feeOfELA) {
            fee = new BigNumber(this.feeOfELA);
        } else if (this.feeOfBTC) {
            fee = new BigNumber(this.feeOfBTC).dividedBy(this.fromSubWallet.tokenAmountMulipleTimes);
        } else if (this.feeOfTRX) {
            fee = new BigNumber(this.feeOfTRX);
        } else if (this.fromSubWallet instanceof TronSubWallet) {
            // The fee is related to the receiving address.
            // If the address is not active,  you need to pay 1 TRX fee to activate this address.
            let feeSun = await this.fromSubWallet.estimateTransferTransactionGas(this.toAddress);
            this.feeLimitOfTRX = Util.ceil(feeSun, 10000000);
            this.feeOfTRX = GlobalTronGridService.instance.fromSun(feeSun.toString()).toString();
            fee = new BigNumber(this.feeOfTRX);
        } else {
            // TODO: 0.0001 works only for Elastos ESC! Rework this.
            fee = new BigNumber(0.0001);
        }

        // Check amount only when used (eg: no for NFT transfers)
        if (!this.isTransferTypeSendNFT()) {
            if (!this.sendMax) {
                if (Util.isNull(this.amount) || this.amount <= 0) {
                    this.conditionalShowToast('wallet.amount-invalid', showToast);
                    return false;
                }

                let amountString = this.amount.toString();
                let dotIndex = amountString.indexOf('.');
                if ((dotIndex > -1) && (amountString.split(".")[1].length > this.fromSubWallet.tokenDecimals)) {
                    this.amount = parseFloat(amountString.substring(0, dotIndex + this.fromSubWallet.tokenDecimals + 1));
                }

                let amountBigNumber = new BigNumber(this.amount || 0);
                if ((this.fromSubWallet instanceof MainCoinSubWallet) && fee) {
                    amountBigNumber = amountBigNumber.plus(fee)
                }

                if (!this.networkWallet.subWallets[this.subWalletId].isBalanceEnough(amountBigNumber)) {
                    this.conditionalShowToast('wallet.insufficient-balance', showToast);
                    return false;
                }

                if (!this.networkWallet.subWallets[this.subWalletId].isAmountValid(amountBigNumber)) {
                    this.conditionalShowToast('wallet.amount-invalid', showToast);
                    return false;
                }
            } else {
                // the fee is main token
                if (fee && !this.networkWallet.getMainTokenSubWallet().isBalanceEnough(fee)) {
                    const message = this.translate.instant("wallet.eth-insuff-balance", { coinName: this.networkWallet.getDisplayTokenName() })
                    this.conditionalShowToast(message, showToast, 4000);
                    return false;
                }
            }
        }

        if (!(this.fromSubWallet instanceof MainCoinSubWallet)) {
            // Balance can cover fee?
            if (!this.networkWallet.getMainTokenSubWallet().isBalanceEnough(fee)) {
                const message = this.translate.instant("wallet.eth-insuff-balance", { coinName: this.networkWallet.getDisplayTokenName() })
                this.conditionalShowToast(message, showToast, 4000);
                return false;
            }
        }

        if (this.transferType === TransferType.WITHDRAW) {
            if (!this.sendMax && (this.amount < 0.0002))
                return false; // TODO: toast

            // Condition: amountWEI % 10000000000 == 0 (the unit is WEI)
            const amountString = this.amount.toString();
            const dotIndex = amountString.indexOf('.');
            if ((dotIndex + 9) < amountString.length) {
                return false; // TODO: toast
            }
        }

        return true;
    }

    private isAddressValid(toAddress: string) {
        if (this.transferType === TransferType.RECHARGE) {
            if (!this.toSubWallet) {
                return WalletUtil.isEVMAddress(toAddress);
            }
        }
        let targetSubwallet = this.toSubWallet ? this.toSubWallet : this.fromSubWallet;
        return targetSubwallet.isAddressValid(toAddress);
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
            await this.globalPopupService.ionicAlert("wallet.transaction-fail", "common.network-or-server-error");
        } else {
            reworkedEx = WalletExceptionHelper.reworkedWalletTransactionException(err);
            if (reworkedEx instanceof WalletPendingTransactionException) {
                await this.globalPopupService.ionicAlert('common.warning', 'wallet.transaction-pending', "common.understood");
            } else {
                let message: string = typeof (err) === "string" ? err : err.message;
                if (message.includes('Cannot transfer TRX to the same account')) {
                    message = "wallet.transaction-same-account";
                }
                await this.globalPopupService.ionicAlert("wallet.transaction-fail", message);
            }

        }
    }

    private getFromTitle() {
        if (this.fromSubWallet.getAddressCount() == 1) {
            return this.fromSubWallet.getCurrentReceiverAddress();
        } else {
            // Only the ela main chain wallet may be a multi-address wallet.
            return StandardCoinName.ELA;
        }
    }

    async showConfirm() {
        let feeString = null;
        // ELA main chain
        if (this.feeOfELA) {
            let nativeFee = this.feeOfELA + ' ' + WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
            let currencyFee = this.fromSubWallet.getAmountInExternalCurrency(new BigNumber(this.feeOfELA)).toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
            feeString = `${nativeFee} (~ ${currencyFee})`;
        }

        if (this.feeOfBTC) {
            let fee = new BigNumber(this.feeOfBTC).dividedBy(this.fromSubWallet.tokenAmountMulipleTimes);
            let nativeFee = WalletUtil.getAmountWithoutScientificNotation(fee, 8) + ' ' + WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
            let currencyFee = this.fromSubWallet.getAmountInExternalCurrency(fee).toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
            feeString = `${nativeFee} (~ ${currencyFee})`;
        }

        if (this.feeOfTRX) {
            let nativeFee = this.feeOfTRX + ' ' + WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();
            let mainTokenSubwellet = this.networkWallet.getMainTokenSubWallet();
            let currencyFee = mainTokenSubwellet.getAmountInExternalCurrency(new BigNumber(this.feeOfTRX)).toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
            feeString = `${nativeFee} (~ ${currencyFee})`;
        }

        const txInfo = {
            type: this.transferType,
            transferFrom: this.getFromTitle(),
            transferTo: this.toAddress,
            toChainId: this.transferType === TransferType.RECHARGE ? this.coinTransferService.toSubWalletId : null,
            amount: this.amount == -1 ? this.networkWallet.subWallets[this.subWalletId].getDisplayBalance() : this.amount,
            sendAll: this.amount == -1 ? true : false,
            precision: this.fromSubWallet.tokenDecimals,
            memo: this.memo ? this.memo : null,
            tokensymbol: this.tokensymbol,
            fee: feeString,
            gasLimit: this.gasLimit,
            coinType: this.fromSubWallet.type
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
                if (params.data.gasPrice) this.gasPrice = params.data.gasPrice;
                if (params.data.gasLimit) this.gasLimit = params.data.gasLimit;
                void this.transaction();
            }
        });

        // Wait for the keyboard to close if needed, otherwise the popup is not centered.
        await sleep(500);

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
        this.alreadySentIntentResponse = true;
        await this.globalIntentService.sendIntentResponse(
            { txid: null, status: 'cancelled' },
            this.coinTransferService.intentTransfer.intentId
        );
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

        // Cryptoname
        if (enteredText.length >= 3) {
            // Quick and dirty way to not try to resolve a name when it's actually an address already, not name.
            if (enteredText.length > 30) {
                let addressValid = await this.isAddressValid(enteredText);
                if (addressValid) return;
            }

            if (this.resolverNameTimeout) {
                clearTimeout(this.resolverNameTimeout)
            }
            this.resolverNameTimeout = setTimeout(() => {
                this.resolverName(enteredText);
            }, 800);
        }
    }

    private resolverName(name: string) {
        let targetSubwallet = null;
        if (this.transferType !== TransferType.RECHARGE) {
            targetSubwallet = this.toSubWallet ? this.toSubWallet : this.fromSubWallet;
        }
        // eslint-disable-next-line no-async-foreach/no-async-foreach, @typescript-eslint/no-misused-promises
        this.nameResolvingService.getResolvers().forEach(async resolver => {
            // resolvers can answer at any time, asynchronously
            const results = await resolver.resolve(name, targetSubwallet); // Use fromSubWallet just to know the network (toSubWallet is not always set)
            Logger.log('wallet', "Name resolver got results from", resolver.getName(), results);
            this.suggestedAddresses = this.suggestedAddresses.concat(results);

            if (this.suggestedAddresses.length > 0) {
                // Scroll screen to bottom to let the suggested resolved name appear on screen
                void this.contentArea.scrollToBottom(500);
            }
        });
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
        await this.contactsService.addContact(suggestedAddress);

        this.setCryptonamesKeyVisibility(true);
    }

    isStandardSubwallet(subWallet: AnySubWallet) {
        return subWallet instanceof MainCoinSubWallet;
    }

    convertAmountToBigNumber(amount: number) {
        return new BigNumber(amount);
    }

    async showCryptonames() {
        let targetSubwallet = null;
        if (this.transferType !== TransferType.RECHARGE) {
            targetSubwallet = this.toSubWallet ? this.toSubWallet : this.fromSubWallet;
        }
        this.modal = await this.modalCtrl.create({
            component: ContactsComponent,
            componentProps: {
                subWallet: targetSubwallet
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
            "https://contact.web3essentials.io/pickfriend",
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
    getELANetworkByID(id: StandardCoinName) {
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

        return WalletNetworkService.instance.getNetworkByKey(networkKey);
    }

    async getELASubwalletByID(id: StandardCoinName) {
        let network = this.getELANetworkByID(id);
        let networkWallet = await network.createNetworkWallet(this.networkWallet.masterWallet, false);
        return networkWallet?.getSubWallet(id);
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

    /*
     * User can set the custum receiver address for chross chain transfer.
     */
    public enableCustumReceiverAddress() {
        this.zone.run(() => {
            this.useCustumReceiverAddress = !this.useCustumReceiverAddress;
            // Reset toAddress
            if (!this.useCustumReceiverAddress) {
                this.toAddress = this.toSubWallet.getCurrentReceiverAddress();
            }
        });
    }

    // For Btc: select fee rate
    private async getAllBTCFeerate() {
        try {
            let fast = await GlobalBTCRPCService.instance.estimatesmartfee((<BTCSubWallet>this.fromSubWallet).rpcApiUrl, BTCFeeSpeed.FAST)
            this.btcFeerates[BTCFeeSpeed.FAST] = Util.accMul(fast, Config.SATOSHI) / 1000;
            let avg = await GlobalBTCRPCService.instance.estimatesmartfee((<BTCSubWallet>this.fromSubWallet).rpcApiUrl, BTCFeeSpeed.AVERAGE)
            this.btcFeerates[BTCFeeSpeed.AVERAGE] = Util.accMul(avg, Config.SATOSHI) / 1000;
            let slow = await GlobalBTCRPCService.instance.estimatesmartfee((<BTCSubWallet>this.fromSubWallet).rpcApiUrl, BTCFeeSpeed.SLOW)
            this.btcFeerates[BTCFeeSpeed.SLOW] = Util.accMul(slow, Config.SATOSHI) / 1000;
        } catch (e) {
            Logger.warn('wallet', ' estimatesmartfee error', e)
        }
    }
    public shouldShowPickBTCFeerate(): boolean {
        if (this.fromSubWallet instanceof BTCSubWallet)
            return true;

        return false;
    }

    private setBTCFeerate(feerate: BTCFeeSpeed) {
        this.btcFeerateUsed = feerate;
    }

    private buildBTCFeerateMenuItems(): MenuSheetMenu[] {
        return [
            {
                title: this.getBtcFeerateTitle(BTCFeeSpeed.FAST),
                subtitle: this.btcFeerates[BTCFeeSpeed.FAST] + ' sat/vB',
                routeOrAction: () => {
                    void this.setBTCFeerate(BTCFeeSpeed.FAST);
                }
            },
            {
                title: this.getBtcFeerateTitle(BTCFeeSpeed.AVERAGE),
                subtitle: this.btcFeerates[BTCFeeSpeed.AVERAGE] + ' sat/vB',
                routeOrAction: () => {
                    void this.setBTCFeerate(BTCFeeSpeed.AVERAGE);
                }
            },
            {
                title: this.getBtcFeerateTitle(BTCFeeSpeed.SLOW),
                subtitle: this.btcFeerates[BTCFeeSpeed.SLOW] + ' sat/vB',
                routeOrAction: () => {
                    void this.setBTCFeerate(BTCFeeSpeed.SLOW);
                }
            }
        ]
    }

    /**
     * Choose an fee rate
     */
    public pickBTCFeerate() {
        if (!this.btcFeerates[BTCFeeSpeed.SLOW]) {
            Logger.warn('wallet', 'Can not get the btc fee rate.')
            return
        }
        let menuItems: MenuSheetMenu[] = this.buildBTCFeerateMenuItems();

        let menu: MenuSheetMenu = {
            title: GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-select-title"),
            items: menuItems
        };

        void GlobalNativeService.instance.showGenericBottomSheetMenuChooser(menu);
    }

    public getBtcFeerateTitle(btcFeerate) {
        switch (btcFeerate) {
            case BTCFeeSpeed.AVERAGE:
                return GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-avg");
            case BTCFeeSpeed.SLOW:
                return GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-slow");
            default: // BTCFeeRate.Fast
                return GlobalTranslationService.instance.translateInstant("wallet.btc-feerate-fast");
        }
    }

    public getCurrenttBtcFeerateTitle() {
        return this.getBtcFeerateTitle(this.btcFeerateUsed)
    }
}
