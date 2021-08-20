import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Config } from '../../../../config/Config';
import { WalletJsonRPCService } from '../../../../services/jsonrpc.service';
import { Native } from '../../../../services/native.service';
import { Util } from '../../../../model/Util';
import { WalletManager } from '../../../../services/wallet.service';
import { MasterWallet } from '../../../../model/wallets/MasterWallet';
import { StandardCoinName } from '../../../../model/Coin';
import { TransactionDirection, TransactionType, TransactionInfo, EthTransaction, TransactionStatus } from '../../../../model/Transaction';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { SubWallet } from '../../../../model/wallets/SubWallet';
import { ETHChainSubWallet } from '../../../../model/wallets/ETHChainSubWallet';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { MainAndIDChainSubWallet } from 'src/app/wallet/model/wallets/MainAndIDChainSubWallet';

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
    public elastosChainCode = '';
    public subWallet: SubWallet = null;
    public transactionInfo: TransactionInfo;
    private blockchain_url = Config.BLOCKCHAIN_URL;
    private idchain_url = Config.IDCHAIN_URL;

    // Header Display Values
    public type: TransactionType;
    public payStatusIcon = '';
    public direction = '';
    public symbol = '';
    public amount: BigNumber;
    public status = '';
    public statusName = '';
    public memo = '';
    public height = 0;

    // Other Values
    public payFee: number = null;
    // public payType: string = '';
    public targetAddress = null;
    public fromAddress = null;

    // Show the ERC20 Token detail in ETHSC transaction.
    public isERC20TokenTransactionInETHSC = false;
    public tokenName = '';
    public contractAddress = '';
    public tokenAmount = '';

    // List of displayable transaction details
    public txDetails: TransactionDetail[] = [];

    constructor(
        public events: Events,
        public router: Router,
        public walletManager: WalletManager,
        public native: Native,
        public jsonRPCService: WalletJsonRPCService,
        private translate: TranslateService,
        public theme: GlobalThemeService
    ) {
        this.init();
    }

    ngOnInit() {
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.tx-info-title"));
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            // General Values
            this.transactionInfo = navigation.extras.state.transactionInfo;
            this.masterWallet = this.walletManager.getMasterWallet(navigation.extras.state.masterWalletId);
            this.elastosChainCode = navigation.extras.state.elastosChainCode;
            this.subWallet = this.masterWallet.getSubWallet(this.elastosChainCode);

            Logger.log('wallet', 'Tx info', this.transactionInfo);

            // Header display values
            this.type = this.transactionInfo.type;
            this.amount = this.transactionInfo.amount;
            this.symbol = this.transactionInfo.symbol;
            this.status = this.transactionInfo.status;
            this.statusName = this.transactionInfo.statusName;
            this.payStatusIcon = this.transactionInfo.payStatusIcon;
            this.direction = this.transactionInfo.direction;
            this.memo = this.transactionInfo.memo;
            this.height = this.transactionInfo.height;
            this.targetAddress = this.transactionInfo.to;
            this.fromAddress = this.transactionInfo.from;

            void this.getTransactionDetails();
        }
    }

    async getTransactionDetails() {
        // Tx is NOT ETH - Define total cost and address
        if ((this.elastosChainCode === StandardCoinName.ELA) || (this.elastosChainCode === StandardCoinName.IDChain)) {
            // Pay Fee
            this.payFee = new BigNumber(this.transactionInfo.fee).toNumber();

            const transaction = await (this.subWallet as MainAndIDChainSubWallet).getTransactionDetails(this.transactionInfo.txid);
            if (transaction) {
              this.transactionInfo.confirmStatus = transaction.confirmations;
              // If the fee is too small, then amount doesn't subtract fee
              // if (transaction.Fee > 10000000000) {
              //   this.amount = this.amount.minus(this.payFee);
              // }

              // Tx is ETH - Define amount, fee, total cost and address
              if (this.direction === TransactionDirection.SENT) {
                // Address: sender address or receiver address
                this.targetAddress = await (this.subWallet as MainAndIDChainSubWallet).getRealAddressInCrosschainTx(transaction);

              } else if (this.direction === TransactionDirection.RECEIVED) {
                // TODO: show all the inputs and outputs.
              }
            }
        } else {
            // Amount
            this.amount = this.transactionInfo.amount.isInteger() ? this.transactionInfo.amount.integerValue() : this.transactionInfo.amount.decimalPlaces(6);
            // Pay Fee
            const newPayFee = new BigNumber(this.transactionInfo.fee);
            this.payFee = newPayFee.toNumber();

            // Address
            if ((this.elastosChainCode === StandardCoinName.ETHSC) || (this.elastosChainCode === StandardCoinName.ETHDID)) {
                const transaction = await (this.subWallet as ETHChainSubWallet).getTransactionDetails(this.transactionInfo.txid);
                if (this.direction === TransactionDirection.SENT) {
                    this.targetAddress = await this.getETHSCTransactionTargetAddres(transaction);
                } else if (this.direction === TransactionDirection.RECEIVED) {
                    if (this.transactionInfo.isCrossChain === true) {
                        // TODO: We can't get the real address for cross chain transafer.
                        this.fromAddress = null;
                    }
                }
            } else {
                // TODO: We can remove invalid transaction when get the transactions list?
                // For erc20, we use getTransactionDetails to check whether the transaction is valid.
                if (this.status !== TransactionStatus.CONFIRMED) {
                  const transaction = await (this.subWallet as ETHChainSubWallet).getTransactionDetails(this.transactionInfo.txid);
                }

                // if (this.direction === TransactionDirection.RECEIVED) {
                //     this.fromAddress = this.transactionInfo.from;
                // }
            }
        }

        // this.payType = "transaction-type-13";
        // if ((this.type >= 0) && this.type <= 12) {
        //     if (this.type === 10) {
        //         if (this.elastosChainCode === StandardCoinName.IDChain) {
        //             this.payType = "transaction-type-did";
        //         } else {
        //             this.payType = "transaction-type-10";
        //         }
        //     } else {
        //         this.payType = "transaction-type-" + this.type;
        //     }
        // }

        // // For vote transaction
        // if (!Util.isNull(transaction.OutputPayload) && (transaction.OutputPayload.length > 0)) {
        //     this.payType = "transaction-type-vote";
        // }

        // Create array of displayable details for txs
        this.txDetails = [];
        this.txDetails.push(
            {
                type: 'time',
                title: 'wallet.tx-info-transaction-time',
                value:
                    this.transactionInfo.timestamp === 0 ?
                        this.translate.instant('wallet.coin-transaction-status-pending') :
                        Util.dateFormat(new Date(this.transactionInfo.timestamp), 'YYYY-MM-DD HH:mm:ss'),
                show: true,
            },
            {
                type: 'memo',
                title: 'wallet.tx-info-memo',
                value: this.memo,
                show: true,
            },
            {
                type: 'confirmations',
                title: 'wallet.tx-info-confirmations',
                value: this.transactionInfo.confirmStatus,
                show: false,
            },
            {
                type: 'blockId',
                title: 'wallet.tx-info-block-id',
                value:
                    // the Height is 2147483647(-1) when the transaction is not confirmed.
                    this.transactionInfo.confirmStatus === 0 ? 0 : this.height,
                show: false,
            },
            {
                type: 'txid',
                title: 'wallet.tx-info-transaction-id',
                value: this.transactionInfo.txid,
                show: false,
            },
        );

        // Only show receiving address, total cost and fees if tx was not received
        if (this.direction !== TransactionDirection.RECEIVED) {
            // For ERC20 Token Transfer
            if ((this.elastosChainCode === StandardCoinName.ETHSC) && (this.transactionInfo.erc20TokenSymbol)) {
              if (this.transactionInfo.erc20TokenValue) {
                this.txDetails.unshift(
                  {
                      type: 'tokenAmount',
                      title: 'wallet.tx-info-erc20-amount',
                      value: this.transactionInfo.erc20TokenValue,
                      show: true,
                  },
                );
              }

              if (this.transactionInfo.erc20TokenSymbol) {
                this.txDetails.unshift(
                  {
                      type: 'tokenSymbol',
                      title: 'wallet.erc-20-token',
                      value: this.transactionInfo.erc20TokenSymbol,
                      show: true,
                  },
                );
              }

              if (this.transactionInfo.erc20TokenContractAddress) {
                this.txDetails.unshift(
                    {
                        type: 'contractAddress',
                        title: 'wallet.tx-info-token-address',
                        value: this.transactionInfo.erc20TokenContractAddress,
                        show: true,
                    },
                );
              }
            }

            this.txDetails.unshift(
                {
                    type: 'address',
                    title: 'wallet.tx-info-receiver-address',
                    value: this.targetAddress,
                    show: true,
                },
                {
                    type: 'fees',
                    title: 'wallet.tx-info-transaction-fees',
                    value: this.payFee,
                    show: true,
                },
            );
        }
        else { // Receving or move transaction
            // Sending address
            if (this.fromAddress) {
              // TODO: We should show all the inputs and outputs for ELA main chain.
              this.txDetails.unshift(
                  {
                      type: 'address',
                      title: 'wallet.tx-info-sender-address',
                      value: this.fromAddress,
                      show: true,
                  })
            }

            if (this.targetAddress) {
              // Only show the receiving address for multiable address wallet.
              if (((this.elastosChainCode === StandardCoinName.ELA) || (this.elastosChainCode === StandardCoinName.IDChain)) && !this.masterWallet.account.SingleAddress) {
                this.txDetails.unshift(
                    {
                        type: 'address',
                        title: 'wallet.tx-info-receiver-address',
                        value: this.targetAddress,
                        show: true,
                    })
              }
            }
        }
    }

    goWebSite(elastosChainCode, txid) {
        if (elastosChainCode === StandardCoinName.ELA) {
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

    // /**
    //  * Get target address
    //  */
    // getTargetAddressFromTransaction(transaction: Transaction): string {
    //     let targetAddress = '';
    //     if (transaction.Outputs) {
    //         for (const key in transaction.Outputs) {
    //             if (transaction.Amount === transaction.Outputs[key]) {
    //                 targetAddress = key;
    //                 break;
    //             }
    //         }
    //     }
    //     return targetAddress;
    // }

    /**
     * Get the real targeAddress by rpc
     */
    async getETHSCTransactionTargetAddres(transaction: EthTransaction) {
        let targetAddress = transaction.to;
        const withdrawContractAddress = (this.subWallet as ETHChainSubWallet).getWithdrawContractAddress();
        if (transaction.to.toLowerCase() === withdrawContractAddress.toLowerCase()) {
            targetAddress = await this.jsonRPCService.getETHSCWithdrawTargetAddress(parseInt(transaction.blockNumber) + 6, transaction.hash);
        }
        return targetAddress;
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
        if (item.type === 'blockId' || item.type === 'txid' || item.type === 'address' ||
            item.type === 'contractAddress' || item.type === 'memo') {
            return true;
        } else {
            return false;
        }
    }

    copy(value) {
        void this.native.copyClipboard(value);
        void this.native.toast_trans('wallet.copied');
    }
}

