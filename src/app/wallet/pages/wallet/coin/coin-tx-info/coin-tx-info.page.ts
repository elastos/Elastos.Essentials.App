import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import type { VotesContentInfo } from '@elastosfoundation/wallet-js-sdk';
import { RenewalVotesContentInfo } from '@elastosfoundation/wallet-js-sdk/typings/transactions/payload/Voting';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteType } from 'src/app/voting/staking/services/stake.service';
import { Config } from 'src/app/wallet/config/Config';
import { ExtendedTransactionInfo } from 'src/app/wallet/model/extendedtxinfo';
import { NetworkAPIURLType } from 'src/app/wallet/model/networks/base/networkapiurltype';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { ElastosMainChainStandardNetworkWallet } from 'src/app/wallet/model/networks/elastos/mainchain/networkwallets/standard/mainchain.networkwallet';
import { MainChainSubWallet } from 'src/app/wallet/model/networks/elastos/mainchain/subwallets/mainchain.subwallet';
import { EthTransaction } from 'src/app/wallet/model/networks/evms/evm.types';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { CurrencyService } from 'src/app/wallet/services/currency.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { OfflineTransactionsService } from 'src/app/wallet/services/offlinetransactions.service';
import { StandardCoinName } from '../../../../model/coin';
import { AnySubWallet } from '../../../../model/networks/base/subwallets/subwallet';
import { ElastosEVMSubWallet } from '../../../../model/networks/elastos/evms/subwallets/standard/elastos.evm.subwallet';
import { AnyOfflineTransaction, TransactionDirection, TransactionInfo, TransactionStatus, TransactionType } from '../../../../model/tx-providers/transaction.types';
import { Native } from '../../../../services/native.service';
import { WalletService } from '../../../../services/wallet.service';

export type CoinTxInfoParams = {
    masterWalletId: string;
    subWalletId: string;
    offlineTransaction?: AnyOfflineTransaction; // If unpublished
    transactionInfo?: TransactionInfo;  // If published
}

class TransactionDetail {
    type: string;
    title: string;
    value: any = null;
    show: boolean;
}

enum ValueType {
    Normal = 1,
    StringArray = 2,
    Votes = 3,
}

@Component({
    selector: 'app-coin-tx-info',
    templateUrl: './coin-tx-info.page.html',
    styleUrls: ['./coin-tx-info.page.scss'],
})
export class CoinTxInfoPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    // General Values
    private networkWallet: AnyNetworkWallet = null;
    public subWallet: AnySubWallet = null;
    public transactionInfo: TransactionInfo = null;
    private extendedTxInfo: ExtendedTransactionInfo = null;
    public offlineTransaction: AnyOfflineTransaction = null;

    private mainTokenSymbol = '';

    // Header Display Values
    public type: TransactionType;
    public payStatusIcon = '';
    public direction = '';
    public symbol = '';
    public amount: BigNumber;
    public displayAmount = '';
    public status = '';
    public statusName = '';
    public memo = '';
    public height = 0;
    // Show the transfer transacton amount, eg. amount for unstake and DPoS voting.
    public transferAmount: string;
    public dpos2Votes = [];
    public dpos2UpdateVotes = [];
    public crProposalVotes = [];
    public crcImpeachmentVotes = [];
    public crCouncilVotes = [];
    private isUnvoteTx = false;

    // Other Values
    public payFee: string = null;
    public targetAddress = null;
    public fromAddress = null;
    public isRedPacket = false;

    // Show the ERC20 Token detail in ETHSC transaction.
    public isERC20TokenTransactionInETHSC = false;
    public tokenName = '';
    public contractAddress = '';
    public tokenAmount = '';

    // List of displayable transaction details
    public txDetails: TransactionDetail[] = [];

    public crossChainNetworkKey = null; // For cross chain transaction, we need to open address in target network explorer.

    constructor(
        public events: GlobalEvents,
        public router: Router,
        public walletManager: WalletService,
        public native: Native,
        private translate: TranslateService,
        public theme: GlobalThemeService,
        private offlineTransactionsService: OfflineTransactionsService,
        private nav: GlobalNavService,
        public dappbrowserService: DappBrowserService,
    ) {
    }

    ngOnInit() {
        void this.init();
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant("wallet.tx-info-title"));

        if (this.offlineTransaction) {
            // If there is an offline transaction, we can show a delete menu
            this.titleBar.setupMenuItems([
                { key: "delete", title: this.translate.instant('common.delete'), iconPath: "assets/contacts/images/delete.svg" }
            ]);
            this.titleBar.setMenuVisibility(true);

            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
                if (icon.key === "delete") {
                    void this.deleteOfflineTransaction();
                }
            });
        }
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    private async init() {
        this.mainTokenSymbol = WalletNetworkService.instance.activeNetwork.value.getMainTokenSymbol();

        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            // General Values
            let state = navigation.extras.state;

            this.networkWallet = this.walletManager.getNetworkWalletFromMasterWalletId(state.masterWalletId);

            let subWalletId = state.subWalletId;
            this.subWallet = this.networkWallet.getSubWallet(subWalletId);

            console.log("txinfo state", state);

            // We may receive either one or the other
            this.offlineTransaction = state.offlineTransaction;
            if (this.offlineTransaction)
                this.transactionInfo = await this.subWallet.getTransactionInfoForOfflineTransaction(this.offlineTransaction);
            else
                this.transactionInfo = state.transactionInfo;

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
            this.payFee = this.transactionInfo.fee !== null ? WalletUtil.getAmountWithoutScientificNotation(new BigNumber(this.transactionInfo.fee), 8) : null;
            this.displayAmount = WalletUtil.getAmountWithoutScientificNotation(this.amount, this.subWallet.tokenDecimals) || "0";
            this.isRedPacket = this.transactionInfo.isRedPacket;
            this.transferAmount = this.transactionInfo.transferAmount ? WalletUtil.getAmountWithoutScientificNotation(this.transactionInfo.transferAmount, this.subWallet.tokenDecimals) || "0" : null;
            if (this.transactionInfo.votesContents) {
                await this.getVoteInfo(this.transactionInfo.votesContents);
                this.isUnvoteTx = (this.dpos2Votes.length == 0) && (this.crCouncilVotes.length == 0) && (this.crcImpeachmentVotes.length == 0) && (this.crProposalVotes.length == 0);
            }
            if (this.transactionInfo.renewalVotesContentInfo) {
                await this.getRenewalVotesContentInfo(this.transactionInfo.renewalVotesContentInfo)
            }

            void this.getTransactionDetails();
            void this.networkWallet.getExtendedTxInfo(this.transactionInfo.txid).then(extTxInfo => {
                this.extendedTxInfo = extTxInfo;
            });
        }
    }

    async getTransactionDetails() {
        // TODO: To Improve
        if ((this.networkWallet instanceof ElastosMainChainStandardNetworkWallet) && (this.subWallet.id === StandardCoinName.ELA)) {
            const transaction = await (this.subWallet as MainChainSubWallet).getTransactionDetails(this.transactionInfo.txid);
            if (transaction) {
                this.transactionInfo.confirmStatus = transaction.confirmations;
                // If the fee is too small, then amount doesn't subtract fee
                // if (transaction.Fee > 10000000000) {
                //   this.amount = this.amount.minus(this.payFee);
                // }

                // Tx is ETH - Define amount, fee, total cost and address
                if (this.direction === TransactionDirection.SENT) {
                    // Address: sender address or receiver address
                    this.targetAddress = await (this.subWallet as MainChainSubWallet).getRealAddressInCrosschainTx(transaction);

                } else if (this.direction === TransactionDirection.RECEIVED) {
                    // TODO: show all the inputs and outputs.
                }
            }
        } else {
            // TODO: There is no txid in internal transaction, use transactionHash and get more info?
            if (this.transactionInfo.txid) {
                // Address
                if ((this.subWallet.id === StandardCoinName.ETHSC) || (this.subWallet.id === StandardCoinName.ETHDID)) {
                    const transaction = await (this.subWallet as ElastosEVMSubWallet).getTransactionDetails(this.transactionInfo.txid);
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
                        const transaction = await (this.subWallet as ElastosEVMSubWallet).getTransactionDetails(this.transactionInfo.txid);
                    }

                    // if (this.direction === TransactionDirection.RECEIVED) {
                    //     this.fromAddress = this.transactionInfo.from;
                    // }
                }
            }
        }

        // Create array of displayable details for txs
        this.txDetails = [];

        // Tx details valid only for published transactions
        if (!this.offlineTransaction) {
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
                    value: this.transactionInfo.confirmStatus === -1 ? '' : this.transactionInfo.confirmStatus,
                    show: false,
                },
                {
                    type: 'blockId',
                    title: 'wallet.tx-info-block-id',
                    value: this.height <= 0 ? '0' : this.height.toString(),
                    show: false,
                },
                {
                    type: 'txid',
                    title: 'wallet.tx-info-transaction-id',
                    value: this.transactionInfo.txid,
                    show: false,
                },
            );
        }

        // Only show receiving address, total cost and fees if tx was not received
        if (this.direction !== TransactionDirection.RECEIVED) {
            // For ERC20 Token Transfer
            if ((this.subWallet.id === StandardCoinName.ETHSC) && (this.transactionInfo.erc20TokenSymbol)) {
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
                            value: await this.networkWallet.convertAddressForUsage(this.transactionInfo.erc20TokenContractAddress, AddressUsage.DISPLAY_TRANSACTIONS),
                            show: true,
                        },
                    );
                }
            }

            if (this.payFee !== null) {
                let nativeFee = this.payFee + ' ' + this.mainTokenSymbol;
                let currencyFee = this.subWallet.getAmountInExternalCurrency(new BigNumber(this.payFee)).toString() + ' ' + CurrencyService.instance.selectedCurrency.symbol;
                //let valus = [nativeFee, currencyFee]

                this.txDetails.unshift(
                    {
                        type: 'fees',
                        title: 'wallet.tx-info-transaction-fees',
                        value: `${nativeFee} (~ ${currencyFee})`,
                        show: true,
                    }
                );
            }

            if (this.targetAddress !== null) {
                this.txDetails.unshift(
                    {
                        type: 'address',
                        title: 'wallet.tx-info-receiver-address',
                        value: this.transactionInfo.isCrossChain ? this.targetAddress : await this.networkWallet.convertAddressForUsage(this.targetAddress, AddressUsage.DISPLAY_TRANSACTIONS),
                        show: true,
                    }
                );
            }
        }
        else { // Receving or move transaction
            // Sending address
            // TODO: It is the transaction to create a token if the from address is "0x0000000000000000000000000000000000000000".
            if (this.fromAddress && this.fromAddress !== "0x0000000000000000000000000000000000000000") {
                // TODO: We should show all the inputs and outputs for ELA main chain.
                this.txDetails.unshift(
                    {
                        type: 'address',
                        title: 'wallet.tx-info-sender-address',
                        value: await this.networkWallet.convertAddressForUsage(this.fromAddress, AddressUsage.DISPLAY_TRANSACTIONS),
                        show: true,
                    })
            }

            if (this.targetAddress) {
                // Only show the receiving address for multiable address wallet.
                let elastosMainChainStandardNetworkWallet = this.networkWallet as ElastosMainChainStandardNetworkWallet;
                if (this.subWallet.id === StandardCoinName.ELA && !elastosMainChainStandardNetworkWallet.getNetworkOptions().singleAddress) {
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

        if (this.transferAmount) {
            this.txDetails.unshift(
                {
                    type: 'amount',
                    title: this.getTransactionTitle(),
                    value: this.transferAmount,
                    show: true,
                })
        }

        if (this.dpos2Votes.length > 0) {
            this.txDetails.unshift(
                {
                    type: 'votes',
                    title: 'DPoS 2.0',
                    value: this.dpos2Votes,
                    show: false,
                })
        }

        if (this.dpos2UpdateVotes.length > 0) {
            this.txDetails.unshift(
                {
                    type: 'votes',
                    title: 'wallet.coin-op-dpos2-voting-update',
                    value: this.dpos2UpdateVotes,
                    show: false,
                })
        }

        if (this.crProposalVotes.length > 0) {
            this.txDetails.unshift(
                {
                    type: 'votes',
                    title: 'wallet.coin-op-cr-proposal-against',
                    value: this.crProposalVotes,
                    show: false,
                })
        }

        if (this.crcImpeachmentVotes.length > 0) {
            this.txDetails.unshift(
                {
                    type: 'votes',
                    title: 'wallet.coin-op-crc-impeachment',
                    value: this.crcImpeachmentVotes,
                    show: false,
                })
        }

        if (this.crCouncilVotes.length > 0) {
            this.txDetails.unshift(
                {
                    type: 'votes',
                    title: 'wallet.coin-op-crc-vote',
                    value: this.crCouncilVotes,
                    show: false,
                })
        }
    }

    /**
     * Get the real targetAddress by rpc
     */
    async getETHSCTransactionTargetAddres(transaction: EthTransaction) {
        let targetAddress = transaction.to;
        const withdrawContractAddress = (this.subWallet as ElastosEVMSubWallet).getWithdrawContractAddress();
        if (targetAddress && (transaction.to.toLowerCase() === withdrawContractAddress.toLowerCase())) {
            targetAddress = await GlobalElastosAPIService.instance.getETHSCWithdrawTargetAddress(parseInt(transaction.blockNumber) + 6, transaction.hash);
            this.crossChainNetworkKey = 'elastos';
        }
        return targetAddress;
    }

    public getTransactionTitle(): string {
        let voteName = '';
        let voteTypeCount = 0;

        if (this.dpos2Votes.length > 0) {
            voteTypeCount++;
            voteName = GlobalTranslationService.instance.translateInstant('wallet.coin-op-dpos2-voting');
        }

        if (this.dpos2UpdateVotes.length > 0) {
            voteTypeCount++;
            voteName = GlobalTranslationService.instance.translateInstant('wallet.coin-op-dpos2-voting-update');
        }

        if (this.crProposalVotes.length > 0) {
            if (voteTypeCount) voteName += " + ";
            voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-cr-proposal-against')
            voteTypeCount++;
        }

        if (this.crcImpeachmentVotes.length > 0) {
            if (voteTypeCount) voteName += " + ";
            voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-crc-impeachment')
            voteTypeCount++;
        }

        if (this.crCouncilVotes.length > 0) {
            if (voteTypeCount) voteName += " + ";
            voteName += GlobalTranslationService.instance.translateInstant('wallet.coin-op-crc-vote')
            voteTypeCount++;
        }

        if (voteTypeCount > 2) {
            voteName = "wallet.coin-op-vote";
        } else if (voteTypeCount == 0) {
            if (this.isUnvoteTx) {
                voteName = GlobalTranslationService.instance.translateInstant('wallet.coin-op-voting-cancel')
            } else {
                voteName = GlobalTranslationService.instance.translateInstant(this.transactionInfo.name);
            }
        }

        return voteName;
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

    worthOpenForBrowser(item: TransactionDetail) {
        if (item.type === 'blockId' || item.type === 'txid' || item.type === 'address') {
            return true;
        } else {
            return false;
        }
    }

    async openForBrowseMode(item: TransactionDetail) {
        let action = ''
        let value = item.value;
        let network = WalletNetworkService.instance.activeNetwork.value;
        switch (item.type) {
            case 'txid':
                action = '/tx/';
                break;
            case 'blockId':
                // TODO: use '/block/' after the eid explorer is upgraded.
                if (network.key === 'elastosidchain') {
                    action = '/blocks/';
                } else
                    action = '/block/';
                if (this.subWallet.id === StandardCoinName.ELA) {
                    value = await GlobalElastosAPIService.instance.getELABlockHash(item.value)
                }
                break;
            case 'address':
                action = '/address/';

                if (this.transactionInfo.isCrossChain && this.crossChainNetworkKey) {
                    network = WalletNetworkService.instance.getNetworkByKey(this.crossChainNetworkKey);
                }
                break;
            default:
                return;
        }

        let browserUrl = network.getAPIUrlOfType(NetworkAPIURLType.BLOCK_EXPLORER);
        if (browserUrl) {
            let url = browserUrl + action + value;
            void this.dappbrowserService.openForBrowseMode(url, "");
        }
    }

    copy(value) {
        void this.native.copyClipboard(value);
        void this.native.toast_trans('wallet.copied');
    }

    /**
     * Deletes this temporary offlien transction and exits the screen.
     */
    private async deleteOfflineTransaction() {
        await this.offlineTransactionsService.removeTransaction(this.subWallet, this.offlineTransaction);
        void this.nav.navigateBack();
    }

    public getValueType(item: TransactionDetail) {
        if (item.value instanceof Array) {
            if (item.type === 'votes') {
                return ValueType.Votes;
            }
            return ValueType.StringArray;
        }
        return ValueType.Normal;
    }

    private async getVoteInfo(voteContents: VotesContentInfo[]) {
        let votes = null;
        for (let i = 0; i < voteContents.length; i++) {
            switch (voteContents[i].VoteType) {
                case VoteType.DPoSV2:
                    votes = await this.getDPoS2VoteInfo(voteContents[i]);
                    this.dpos2Votes = [...this.dpos2Votes, ...votes];
                    break;
                case VoteType.CRImpeachment:
                    votes = await this.getCRImpeachmentVoteInfo(voteContents[i]);
                    this.crcImpeachmentVotes = [...this.crcImpeachmentVotes, ...votes];
                    break;
                case VoteType.CRProposal:
                    votes = await this.getCRProposalVoteInfo(voteContents[i]);
                    this.crProposalVotes = [...this.crProposalVotes, ...votes];
                    break;
                case VoteType.CRCouncil:
                    votes = await this.getCRCouncilVoteInfo(voteContents[i]);
                    this.crCouncilVotes = [...this.crCouncilVotes, ...votes];
                    break;
                default:
                    Logger.warn('wallet', 'getVoteInfo: not support', voteContents)
                    break;
            }
        }
    }

    private async getRenewalVotesContentInfo(voteContents: RenewalVotesContentInfo[]) {
        let votes = null;
        for (let i = 0; i < voteContents.length; i++) {
            votes = await this.getDPoS2UpdateVoteInfo(voteContents[i]);
            this.dpos2UpdateVotes = [...this.dpos2UpdateVotes, ...votes];
        }
    }

    // Multi-signature wallet owners need to know these voting information before signing.
    private async getDPoS2VoteInfo(voteContentInfo: VotesContentInfo) {
        if (voteContentInfo.VoteType !== VoteType.DPoSV2) return [];
        let voteList = [];

        let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight()
        let currentBlock = await GlobalElastosAPIService.instance.getBlockByHeight(currentHeight)

        const result = await GlobalElastosAPIService.instance.fetchDposNodes('all', 'v2');
        if (result) {
            let dpos2Nodes = result.producers.filter(node => node.identity && node.identity !== 'DPoSV1')
            for (let i = 0; i < voteContentInfo.VotesInfo.length; i++) {
                let dpos2Node = dpos2Nodes.find(node => node.ownerpublickey === voteContentInfo.VotesInfo[i].Candidate);
                let lockDate = this.getStakeDate(voteContentInfo.VotesInfo[i].Locktime, currentHeight, currentBlock.time);
                let votes = WalletUtil.getFriendlyBalance(new BigNumber(voteContentInfo.VotesInfo[i].Votes).dividedBy(Config.SELA));
                voteList.push({ Candidate: voteContentInfo.VotesInfo[i].Candidate, LockDate: lockDate, Votes: votes, Title: dpos2Node?.nickname });
            }
        }
        Logger.log('wallet', 'getDPoS2VoteInfo ', voteList);
        return voteList;
    }

    // Multi-signature wallet owners need to know these voting information before signing.
    private async getDPoS2UpdateVoteInfo(voteContentInfo: RenewalVotesContentInfo) {
        let voteList = [];

        let currentHeight = await GlobalElastosAPIService.instance.getCurrentHeight()
        let currentBlock = await GlobalElastosAPIService.instance.getBlockByHeight(currentHeight)

        const result = await GlobalElastosAPIService.instance.fetchDposNodes('all', 'v2');
        if (result) {
            let dpos2Nodes = result.producers.filter(node => node.identity && node.identity !== 'DPoSV1')
            let dpos2Node = dpos2Nodes.find(node => node.ownerpublickey === voteContentInfo.VoteInfo.Candidate);
            let lockDate = this.getStakeDate(voteContentInfo.VoteInfo.Locktime, currentHeight, currentBlock.time);
            let votes = WalletUtil.getFriendlyBalance(new BigNumber(voteContentInfo.VoteInfo.Votes).dividedBy(Config.SELA));
            voteList.push({ Candidate: voteContentInfo.VoteInfo.Candidate, LockDate: lockDate, Votes: votes, Title: dpos2Node?.nickname });
        }
        Logger.log('wallet', 'getDPoS2UpdateVoteInfo ', voteList);
        return voteList;
    }

    // Convert block to date
    private getStakeDate(locktime: number, currentHeight: number, currentBlockTimestamp: number) {
        var until = locktime - currentHeight;
        var stakeTimestamp = until * 120 + currentBlockTimestamp
        return moment(stakeTimestamp * 1000).format('MMMM Do YYYY');
    }

    // Multi-signature wallet owners need to know these voting information before signing.
    private async getCRProposalVoteInfo(voteContentInfo: VotesContentInfo) {
        if (voteContentInfo.VoteType !== VoteType.CRProposal) return [];
        let voteList = [];

        for (let i = 0; i < voteContentInfo.VotesInfo.length; i++) {
            const proposalDetail = await GlobalElastosAPIService.instance.fetchProposalDetails(voteContentInfo.VotesInfo[i].Candidate);

            let votes = WalletUtil.getFriendlyBalance(new BigNumber(voteContentInfo.VotesInfo[i].Votes).dividedBy(Config.SELA));
            let title = "#" + proposalDetail.id + ' ' + proposalDetail.title;
            voteList.push({ Candidate: voteContentInfo.VotesInfo[i].Candidate, LockDate: null, Votes: votes, Title: title });
        }

        Logger.log('wallet', 'getCRProposalVoteInfo ', voteList);
        return voteList;
    }

    // Multi-signature wallet owners need to know these voting information before signing.
    private async getCRImpeachmentVoteInfo(voteContentInfo: VotesContentInfo) {
        if (voteContentInfo.VoteType !== VoteType.CRImpeachment) return [];
        let voteList = [];

        for (let i = 0; i < voteContentInfo.VotesInfo.length; i++) {
            let crcouncil = await GlobalElastosAPIService.instance.getCRMember(voteContentInfo.VotesInfo[i].Candidate);
            let votes = WalletUtil.getFriendlyBalance(new BigNumber(voteContentInfo.VotesInfo[i].Votes).dividedBy(Config.SELA));
            voteList.push({ Candidate: voteContentInfo.VotesInfo[i].Candidate, LockDate: null, Votes: votes, Title: crcouncil.nickname });
        }

        Logger.log('wallet', 'getCRImpeachmentVoteInfo ', voteList);
        return voteList;
    }

    // Multi-signature wallet owners need to know these voting information before signing.
    private async getCRCouncilVoteInfo(voteContentInfo: VotesContentInfo) {
        if (voteContentInfo.VoteType !== VoteType.CRCouncil) return [];
        let voteList = [];

        const candidateList = await GlobalElastosAPIService.instance.getCRCandidates();
        if (candidateList) {
            for (let i = 0; i < voteContentInfo.VotesInfo.length; i++) {
                let candidate = candidateList.find(c => c.cid == voteContentInfo.VotesInfo[i].Candidate)
                let votes = WalletUtil.getFriendlyBalance(new BigNumber(voteContentInfo.VotesInfo[i].Votes).dividedBy(Config.SELA));
                voteList.push({ Candidate: voteContentInfo.VotesInfo[i].Candidate, LockDate: null, Votes: votes, Title: candidate.nickname });
            }
        }

        Logger.log('wallet', 'getCRCouncilVoteInfo ', voteList);
        return voteList;
    }
}
