import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Config } from '../../../../config/Config';
import { JsonRPCService } from '../../../../services/jsonrpc.service';
import { Native } from '../../../../services/native.service';
import { Util } from '../../../../model/Util';
import { WalletManager } from '../../../../services/wallet.service';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { StandardCoinName } from '../../../../model/Coin';
import { TransactionDirection, TransactionType, TransactionInfo, Transaction, EthTransaction } from '../../../../model/Transaction';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { SubWallet } from '../../../../model/wallets/SubWallet';
import { ETHChainSubWallet } from '../../../../model/wallets/ETHChainSubWallet';
import { CoinService } from '../../../../services/coin.service';
import { ERC20CoinService } from '../../../../services/erc20coin.service';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';

class TransactionDetail {
    type: string;
    title: string;
    value: any = null;
    show: boolean;
}

@Component({
    selector: 'app-coin-tx-info',
    templateUrl: './coin-tx-info.page.html',
    styleUrls: ['./coin-tx-info.page.scss'],
})
export class CoinTxInfoPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    // General Values
    private masterWallet: MasterWallet = null;
    public chainId: string = '';
    public subWallet: SubWallet = null;
    public transactionInfo: TransactionInfo;
    private blockchain_url = Config.BLOCKCHAIN_URL;
    private idchain_url = Config.IDCHAIN_URL;

    // Header Display Values
    public type: TransactionType;
    public payStatusIcon: string = '';
    public direction: string = '';
    public symbol: string = '';
    public amount: BigNumber;
    public status: string = '';
    public statusName: string = '';

    // Other Values
    public payFee: number = null;
    public totalCost: BigNumber = null;
    public payType: string = '';
    public targetAddress = '';

    // Show the ERC20 Token detail in ETHSC transaction.
    public isERC20TokenTransactionInETHSC = false;
    public tokenName = '';
    public contractAddress = '';
    public tokenAmount = '';

    // List of displayable transaction details
    public txDetails: TransactionDetail[] = [];

    private syncSubscription: Subscription = null;

    constructor(
        public events: Events,
        public router: Router,
        public walletManager: WalletManager,
        public native: Native,
        private coinService: CoinService,
        private erc20CoinService: ERC20CoinService,
        public jsonRPCService: JsonRPCService,
        private translate: TranslateService,
        public theme: GlobalThemeService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("tx-info-title"));
    }

    ionViewDidLeave() {
        this.unsubscribeprogressEvent();
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {

            // General Values
            this.transactionInfo = navigation.extras.state.transactionInfo;
            this.masterWallet = this.walletManager.getMasterWallet(navigation.extras.state.masterWalletId);
            this.chainId = navigation.extras.state.chainId;
            this.subWallet = this.masterWallet.getSubWallet(this.chainId);

            Logger.log('wallet', 'Tx info', this.transactionInfo);

            // Header display values
            this.type = this.transactionInfo.type;
            this.amount = this.transactionInfo.amount;
            this.symbol = this.transactionInfo.symbol;
            this.status = this.transactionInfo.status;
            this.statusName = this.transactionInfo.statusName;
            this.payStatusIcon = this.transactionInfo.payStatusIcon;
            this.direction = this.transactionInfo.direction;

            this.getTransactionDetails();
        }
    }

    async getTransactionDetails() {
        const allTransactions = await this.subWallet.getTransactionDetails(this.transactionInfo.txid);

        const transaction = allTransactions.Transactions[0];
        Logger.log('wallet', 'More tx info', transaction);

        const transactionInfo = await this.subWallet.getTransactionInfo(transaction, this.translate);

        // Tx is NOT ETH - Define total cost and address
        if ((this.chainId === StandardCoinName.ELA) || (this.chainId === StandardCoinName.IDChain)) {
            // Pay Fee
            this.payFee = this.subWallet.getDisplayAmount(new BigNumber(transactionInfo.fee)).toNumber();
            // Total Cost
            this.totalCost = this.payFee ? this.transactionInfo.amount.plus(this.payFee) : null;
            // Address
            this.targetAddress = this.getTargetAddressFromTransaction(transaction);

            // If the fee is too small, then amount doesn't subtract fee
            if (transaction.Fee > 10000000000) {
              this.amount = this.amount.minus(this.payFee);
            }

        // Tx is ETH - Define amount, fee, total cost and address
        } else {
            // Amount
            this.amount = transactionInfo.amount.isInteger() ? transactionInfo.amount.integerValue() : transactionInfo.amount.decimalPlaces(6);
            // Pay Fee
            const newPayFee = new BigNumber(transactionInfo.fee);
            this.payFee = newPayFee.toNumber();
            // Total Cost
            this.totalCost = newPayFee ? transactionInfo.amount.plus(newPayFee) : null;
            // Address
            if (this.chainId === StandardCoinName.ETHSC) {
                this.targetAddress = await this.getETHSCTransactionTargetAddres(transaction as EthTransaction);
                await this.getERC20TokenTransactionInfo(transaction as EthTransaction);
            } else {
                this.targetAddress = (transaction as EthTransaction).TargetAddress;
            }
        }

        this.payType = "transaction-type-13";
        if ((this.type >= 0) && this.type <= 12) {
            if (this.type === 10) {
                if (this.chainId === StandardCoinName.IDChain) {
                    this.payType = "transaction-type-did";
                } else {
                    this.payType = "transaction-type-10";
                }
            } else {
                this.payType = "transaction-type-" + this.type;
            }
        }

        // For vote transaction
        if (!Util.isNull(transaction.OutputPayload) && (transaction.OutputPayload.length > 0)) {
            this.payType = "transaction-type-vote";
        }

        // Create array of displayable details for txs
        this.txDetails = [];
        this.txDetails.push(
            {
                type: 'time',
                title: 'tx-info-transaction-time',
                value:
                    this.transactionInfo.timestamp === 0 ?
                        this.translate.instant('coin-transaction-status-pending') :
                        Util.dateFormat(new Date(this.transactionInfo.timestamp), 'YYYY-MM-DD HH:mm:ss'),
                show: true,
            },
            {
                type: 'memo',
                title: 'tx-info-memo',
                value: transaction.Memo,
                show: true,
            },
            {
                type: 'confirmations',
                title: 'tx-info-confirmations',
                value: this.transactionInfo.confirmStatus,
                show: false,
            },
            {
                type: 'blockId',
                title: 'tx-info-block-id',
                value:
                    this.transactionInfo.confirmStatus === 0 ?
                        0 : transaction.Height, // the Height is 2147483647(-1) when the transaction is not confirmed.
                show: false,
            },
            {
                type: 'txid',
                title: 'tx-info-transaction-id',
                value: this.transactionInfo.txid,
                show: false,
            },
        );

        // Only show receiving address, total cost and fees if tx was not received
        if (this.direction !== TransactionDirection.RECEIVED) {
            // For ERC20 Token Transfer
            if ((this.chainId === StandardCoinName.ETHSC) && ('ERC20Transfer' === (transaction as EthTransaction).TokenFunction)) {
                this.txDetails.unshift(
                    {
                        type: 'contractAddress',
                        title: 'tx-info-token-address',
                        value: this.tokenName ? 0 : this.contractAddress,
                        show: true,
                    },
                    {
                        type: 'tokenSymbol',
                        title: 'erc-20-token',
                        value: this.tokenName,
                        show: true,
                    },
                    {
                        type: 'tokenAmount',
                        title: 'tx-info-erc20-amount',
                        value: this.tokenAmount,
                        show: true,
                    },
                );
            }

            this.txDetails.unshift(
                {
                    type: 'address',
                    title: 'tx-info-receiver-address',
                    value: this.targetAddress,
                    show: true,
                },
                {
                    type: 'fees',
                    title: 'tx-info-transaction-fees',
                    value: this.payFee,
                    show: true,
                },
                {
                    type: 'cost',
                    title: 'tx-info-cost',
                    value: this.totalCost,
                    show: true,
                },
            );
        }

        Logger.log('wallet', 'Tx details', this.txDetails);
    }

    subscribeprogressEvent() {
        if (!this.syncSubscription) {
            this.syncSubscription = this.events.subscribe(this.masterWallet.id + ':' + this.chainId + ':syncprogress', (coin) => {
                this.getTransactionDetails();
            });
        }
    }
    unsubscribeprogressEvent() {
        if (this.syncSubscription) {
            this.syncSubscription.unsubscribe();
        }
    }

    goWebSite(chainId, txid) {
        if (chainId === StandardCoinName.ELA) {
            this.native.openUrl(this.blockchain_url + 'tx/' + txid);
        } else {
            this.native.openUrl(this.idchain_url + 'tx/' + txid);
        }
    }

    doRefresh(event) {
        this.init();
        setTimeout(() => {
            event.target.complete();
        }, 1000);
    }

    /**
     * Get target address
     */
    getTargetAddressFromTransaction(transaction: Transaction): string {
        let targetAddress = '';
        if (transaction.Outputs) {
            for (const key in transaction.Outputs) {
                if (transaction.Amount === transaction.Outputs[key]) {
                    targetAddress = key;
                    break;
                }
            }
        }
        return targetAddress;
    }

    /**
     * Get the real targeAddress by rpc
     */
    async getETHSCTransactionTargetAddres(transaction: EthTransaction) {
        let targetAddress = transaction.TargetAddress;
        const withdrawContractAddress = await (this.subWallet as ETHChainSubWallet).getWithdrawContractAddress();
        if (transaction.TargetAddress === withdrawContractAddress) {
            targetAddress = await this.jsonRPCService.getETHSCWithdrawTargetAddress(transaction.BlockNumber + 6, transaction.Hash);
            // If the targetAddress is empty, then this transaction is error.
            // TODO: But now, the spvsdk does not set any flag to this transaction. 2020.9.29
        } else if ('ERC20Transfer' === transaction.TokenFunction) {
            // ERC20 Token transfer
            targetAddress = transaction.TokenAddress;
        }
        return targetAddress;
    }

    private async getERC20TokenTransactionInfo(transaction: EthTransaction) {
        if ('ERC20Transfer' === transaction.TokenFunction) {
            this.isERC20TokenTransactionInETHSC = true;
            this.contractAddress = transaction.Token;
            const ethAccountAddress = await (this.subWallet as ETHChainSubWallet).getTokenAddress();
            const erc20Coin = this.coinService.getERC20CoinByContracAddress(this.contractAddress);
            if (erc20Coin) {// erc20Coin is true normally.
                this.tokenName = erc20Coin.getName();
                const coinDecimals = await this.erc20CoinService.getCoinDecimals(this.contractAddress, ethAccountAddress);
                this.tokenAmount = (new BigNumber(transaction.TokenAmount).dividedBy(new BigNumber(10).pow(coinDecimals))).toString();
            }
        }
    }

    getDisplayableName(): string {
        if (this.chainId === 'IDChain') {
            return 'ELA';
        } else {
            return this.chainId;
        }
    }

    getTransferClass() {
        switch (this.type) {
            case 1:
                return 'received';
            case 2:
                return 'sent';
            case 3:
                return 'transferred';
        }
    }

    worthCopying(item: TransactionDetail) {
        if (item.type === 'blockId' || item.type === 'txid' || item.type === 'address' || item.type === 'contractAddress') {
            return true;
        } else {
            return false;
        }
    }

    copy(value) {
        this.native.copyClipboard(value);
        this.native.toast_trans('copied');
    }
}

