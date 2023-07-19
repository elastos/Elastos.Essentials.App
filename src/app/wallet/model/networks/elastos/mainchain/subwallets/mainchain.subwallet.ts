import type {
  CancelProducerInfo, ChangeCustomIDFeeOwnerInfo, ChangeProposalOwnerInfo, CRCouncilMemberClaimNodeInfo, CRCProposalInfo,
  CRCProposalReviewInfo, CRCProposalTrackingInfo, CRCProposalWithdrawInfo, CreateNFTInfo, CRInfoJson, DPoSV2ClaimRewardInfo,
  EncodedTx, NormalProposalOwnerInfo, PayloadStakeInfo, ProducerInfoJson, PublickeysInfo, ReceiveCustomIDOwnerInfo, RegisterSidechainProposalInfo,
  ReserveCustomIDOwnerInfo, SecretaryElectionInfo, TerminateProposalOwnerInfo, UnregisterCRPayload, UnstakeInfo, UTXOInput, VoteContentInfo,
  VotesContentInfo,
  VotingInfo
} from '@elastosfoundation/wallet-js-sdk';
import { RenewalVotesContentInfo } from '@elastosfoundation/wallet-js-sdk/typings/transactions/payload/Voting';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { Candidates, VoteTypeString } from 'src/app/wallet/model/elastos.types';
import { ElastosMainChainWalletNetworkOptions, WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { MultiSigSafe } from 'src/app/wallet/model/safes/multisig.safe';
import { TimeBasedPersistentCache } from 'src/app/wallet/model/timebasedpersistentcache';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { Config } from '../../../../../config/Config';
import { StandardCoinName } from '../../../../coin';
import { BridgeProvider } from '../../../../earn/bridgeprovider';
import { EarnProvider } from '../../../../earn/earnprovider';
import { SwapProvider } from '../../../../earn/swapprovider';
import { AnyOfflineTransaction, ElastosTransaction, Outputs, RawTransactionType, RawVoteContent, TransactionDetail, TransactionDirection, TransactionInfo, TransactionStatus, TransactionType, Utxo, UtxoType } from '../../../../tx-providers/transaction.types';
import { AnyNetworkWallet } from '../../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../../base/subwallets/maincoin.subwallet';
import { ElastosTransactionsHelper } from '../../transactions.helper';
import { InvalidVoteCandidatesHelper } from '../invalidvotecandidates.helper';
import { ElastosMainChainSafe } from '../safes/mainchain.safe';


const voteTypeMap = [VoteTypeString.Delegate, VoteTypeString.CRC, VoteTypeString.CRCProposal, VoteTypeString.CRCImpeachment]

export type AvalaibleUtxos = {
    value: number;
    utxo: UTXOInput[];
}

type BalanceList = {
    value: BigNumber;
    addresses: AdressWithBalance[];
}

type AdressWithBalance = {
    address: string;
    value: BigNumber;
}

export class MainChainSubWallet extends MainCoinSubWallet<ElastosTransaction, ElastosMainChainWalletNetworkOptions> {
    private TRANSACTION_LIMIT = 50;

    // voting
    private votingAmountSELA = 0; // ELA
    private votingUtxoArray: Utxo[] = null;

    private lastUnConfirmedTransactionId: string = null;

    private ownerAddress: string = null;

    private externalAddressCount = 110; // Addresses for user.
    private internalAddressCount = 105;

    // TODO: If there are too many utxos, the transaction may fail to be sent.
    // Therefore, the maximum number of utxos to be consolidated is set to 10000.
    private Max_Consolidate_Utxos = 10000;

    private addressWithBalanceArray: AdressWithBalance[] = [];

    private invalidVoteCandidatesHelper: InvalidVoteCandidatesHelper = null;

    private stakedBalanceCache: TimeBasedPersistentCache<any> = null;
    private stakedBalanceKeyInCache = null;
    private stakedBalance = 0;

    constructor(networkWallet: AnyNetworkWallet) {
        super(networkWallet, StandardCoinName.ELA);

        this.tokenDecimals = 8;
        this.tokenAmountMulipleTimes = Config.SELAAsBigNumber;
    }

    public async initialize(): Promise<void> {
        super.initialize();

        await this.loadStakedBalanceFromCache();
    }

    public supportsCrossChainTransfers(): boolean {
        // Not support cross chain transfers for gnosis muti-sig and ledger wallet.
        return (this.networkWallet.masterWallet.type == WalletType.STANDARD)
            || (this.networkWallet.masterWallet.type == WalletType.MULTI_SIG_STANDARD);
    }

    public async startBackgroundUpdates(): Promise<void> {
        await super.startBackgroundUpdates();

        this.invalidVoteCandidatesHelper = new InvalidVoteCandidatesHelper();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        runDelayed(async () => {
            if (this.backGroundUpdateStoped) return;

            if (!this.isSingleAddress()) {
                await this.checkAddresses(true);
                await this.checkAddresses(false);
            }
            await this.updateBalance();
            await this.updatePendingTransaction();
        }, 1000);
    }

    public getMainIcon(): string {
        return "assets/wallet/coins/ela-black.svg";
    }

    public getSecondaryIcon(): string {
        return null;
    }

    public getFriendlyName(): string {
        return "Main Chain";
    }

    public getDisplayTokenName(): string {
        return "ELA";
    }

    public async isAddressValid(address: string): Promise<boolean> {
        return await WalletUtil.isELAAddress(address);
    }

    public getRawBalanceSpendable(): BigNumber {
        return this.balanceSpendable;
    }

    public async updateBalanceSpendable() {
        this.balanceSpendable = await this.getTotalBalanceByType(true);
    }

    // To delete?
    protected async getTransactionName(transaction: ElastosTransaction, translate: TranslateService): Promise<string> {
        return ElastosTransactionsHelper.getTransactionName(transaction, this);
    }

    protected isSingleAddress(): boolean {
        if (!this.networkWallet.getNetworkOptions())
            return false;

        return this.networkWallet.getNetworkOptions().singleAddress;
    }

    /**
     * Returns the first payment address for this ELA wallet. This should be a constant address
     * for a given mnemonic.
     */
    public getRootPaymentAddress(): string {
        let allAddresses = this.networkWallet.safe.getAddresses(0, 1, false, AddressUsage.DEFAULT);
        if (!allAddresses || allAddresses.length == 0)
            return null;

        return allAddresses[0];
    }

    public getAddressCount(internal: boolean): number {
        if (this.isSingleAddress()) {
            if (internal) return 0;
            else return 1;
        } else {
            if (internal) return this.internalAddressCount;
            else return this.externalAddressCount;
        }
    }

    public async getTransactionInfo(transaction: ElastosTransaction): Promise<TransactionInfo> {
        let transactionInfo = ElastosTransactionsHelper.getTransactionInfo(transaction, this);
        transactionInfo.amount = new BigNumber(transaction.value, 10);
        transactionInfo.symbol = '';
        transactionInfo.isCrossChain = false;
        transactionInfo.txid = transaction.txid;

        let senderAddresses = this.getSenderAddress(transaction);
        // TODO: Should show all the sender address.
        transactionInfo.from = senderAddresses ? senderAddresses[0] : null;

        let receiverAddresses = this.getReceiverAddress(transaction);
        transactionInfo.to = receiverAddresses ? receiverAddresses[0] : null;

        if (transaction.type === TransactionDirection.RECEIVED) {
            transactionInfo.type = TransactionType.RECEIVED;
            transactionInfo.symbol = '+';
        } else if (transaction.type === TransactionDirection.SENT) {
            transactionInfo.type = TransactionType.SENT;
            transactionInfo.symbol = '-';
        } else if (transaction.type === TransactionDirection.MOVED) {
            transactionInfo.type = TransactionType.TRANSFER;
            transactionInfo.symbol = '';
        }

        switch (transaction.txtype) {
            case RawTransactionType.RechargeToSideChain:
            case RawTransactionType.WithdrawFromSideChain:
            case RawTransactionType.TransferCrossChainAsset:
                transactionInfo.isCrossChain = true;
                transactionInfo.type = TransactionType.TRANSFER;
                break;
            default:
                break;
        }

        return await transactionInfo;
    }

    public async getTransactionInfoForOfflineTransaction(transaction: AnyOfflineTransaction): Promise<TransactionInfo> {
        let receiverAddress: string = null;
        let amount: BigNumber = null;
        let txType = TransactionType.SENT;
        let direction = TransactionDirection.SENT;
        let payStatusIcon = "./assets/wallet/tx/send.svg";
        let transactionName = "wallet.coin-op-sent-token";
        let transferAmount = null;
        let votesContents: VotesContentInfo[] = null;
        // Update BPoS voting.
        let renewalVotesContentInfo: RenewalVotesContentInfo[] = null;

        try {
            let safe = <MultiSigSafe><any>this.networkWallet.safe;
            let offlineTransactionDecoded = await safe.getOfflineTransaction(transaction);
            Logger.log('wallet', 'Decoded offlineTransaction', offlineTransactionDecoded)
            if (offlineTransactionDecoded) {
                let type: RawTransactionType = offlineTransactionDecoded.getTransactionType();
                transactionName = this.getTransactionNameByType(type);

                switch (type) {
                    case RawTransactionType.Unstake:
                    case RawTransactionType.Voting:
                    case RawTransactionType.DposV2ClaimReward:
                        txType = TransactionType.TRANSFER;
                        direction = TransactionDirection.MOVED;
                        payStatusIcon = "./assets/wallet/tx/transfer.svg";

                        let payload = offlineTransactionDecoded.getPayloadPtr();
                        let payloadversion = offlineTransactionDecoded.getPayloadVersion();
                        if (payload) {
                            let payloadJson: any = payload.toJson(payloadversion);
                            Logger.log('wallet', ' payload:', payloadJson)
                            receiverAddress = payloadJson.ToAddress;
                            amount = new BigNumber(0);
                            transferAmount = payloadJson.Value ? new BigNumber(payloadJson.Value).dividedBy(Config.SELA) : null;
                            renewalVotesContentInfo = payloadJson.RenewalVotesContent;
                            votesContents = payloadJson.Contents;
                        }
                        break;
                    default:
                        let outputs = offlineTransactionDecoded.getOutputs();
                        if (outputs && outputs.length > 0) {
                            receiverAddress = outputs[0].getAddress().string();
                            amount = new BigNumber(outputs[0].amount()).dividedBy(Config.SELA);
                        }
                        break;
                }
            }
        }
        catch (e) {
            Logger.warn("wallet", "Failed to decode elastos mainchain raw transaction from offline transaction", e);
        }

        let txInfo: TransactionInfo = {
            amount: amount,
            confirmStatus: 0,
            datetime: moment.unix(transaction.updated),
            direction: direction,
            fee: null, // unknown, not published yet
            height: 1, // unknown, not published yet
            memo: null, // TODO: extract from raw tx
            name: transactionName,
            payStatusIcon: payStatusIcon,
            status: TransactionStatus.PENDING,
            statusName: ElastosTransactionsHelper.getTransactionStatusName(TransactionStatus.NOT_PUBLISHED),
            symbol: "", //this.networkWallet.displayToken,
            to: receiverAddress,
            from: null,
            timestamp: 0,
            txid: null,
            type: txType,
            isCrossChain: false, // TODO: that's elastos specific
            subOperations: [],
            transferAmount: transferAmount,
            votesContents: votesContents,
            renewalVotesContentInfo: renewalVotesContentInfo
        }
        return txInfo;
    }

    private getTransactionNameByType(type: RawTransactionType): string {
        let transactionName = null;
        switch (type) {
            case RawTransactionType.Unstake:
                transactionName = "wallet.coin-op-unstake";
                break;
            case RawTransactionType.Voting:
                transactionName = "wallet.coin-op-vote";
                break;
            case RawTransactionType.DposV2ClaimReward:
                transactionName = "wallet.coin-op-dpos2-claim-reward";
                break;
            case RawTransactionType.Stake:
                transactionName = "wallet.coin-op-stake";
                break;
            default:
                transactionName = "wallet.coin-op-sent-token";
                break;
        }
        return transactionName;
    }

    private getSenderAddress(transaction: ElastosTransaction): string[] {
        if (transaction.type === TransactionDirection.RECEIVED) {
            if (!transaction.inputs) {
                return null;
            }
            let senderAddress = [];
            for (let i = 0, len = transaction.inputs.length; i < len; i++) {
                senderAddress.push(transaction.inputs[i])
            }
            return senderAddress.length > 0 ? senderAddress : null;
        } else {
            return null;
        }
    }

    private getReceiverAddress(transaction: ElastosTransaction): string[] {
        if (transaction.type === TransactionDirection.SENT) {
            if (!transaction.outputs) {
                return null;
            }
            let receiveAddresses = [];
            for (let i = 0, len = transaction.outputs.length; i < len; i++) {
                receiveAddresses.push(transaction.outputs[i])
            }
            return receiveAddresses.length > 0 ? receiveAddresses : null;
        } else {
            return null;
        }
    }

    public supportMemo() {
        return true;
    }

    public async update() {
        await this.getBalanceByRPC();
        await this.updateStakedBalance();
    }

    public async updateBalance() {
        await this.getBalanceByRPC();
        await this.updateStakedBalance();
    }

    /**
     * Check whether there are any unconfirmed transactions
     * For vote transaction
     * bposTx: only check the stake, unstake, voting and mintNft transactions if bposTx = true.
     */
    public async hasPendingBalance(bposTx = false) {
        let pendingTx = await this.getPendingTransaction(bposTx);
        if (pendingTx.length === 0) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     * Check whether the available balance is enough.
     * @param amount unit is SELA
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
        return await this.balance.gt(amount);
    }

    public async createPaymentTransaction(toAddress: string, amount: BigNumber, memo = ""): Promise<string> {
        let toAmount = 0;
        let au: AvalaibleUtxos = null;

        if (amount.eq(-1)) {
            // toAmount = Math.floor(this.balance.minus(10000).toNumber());
            au = await this.getAvailableUtxo(-1);
            toAmount = au.value - 10000;// 10000: fee
        } else {
            toAmount = Util.accMul(amount.toNumber(), Config.SELA);
            au = await this.getAvailableUtxo(toAmount + 10000);// 10000: fee
        }
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        Logger.log('wallet', 'createPaymentTransaction toAmount:', toAmount);

        let outputs: Outputs[] = [{
            "Address": toAddress,
            "Amount": toAmount.toString()
        }]

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createPaymentTransaction(
            au.utxo,
            outputs,
            '10000',
            memo);
    }

    public async createVoteTransaction(voteContents: VoteContentInfo[], memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(-1);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        let newVoteContents = await this.mergeVoteContents(voteContents);
        Logger.log('wallet', 'createVoteTransaction:', JSON.stringify(newVoteContents));

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createVoteTransaction(
            au.utxo,
            newVoteContents,
            '10000',
            memo);
    }

    public async createDepositTransaction(toSubWalletId: StandardCoinName, toAddress: string, amount: number, memo = ""): Promise<string> {
        let toAmount = 0;
        let au: AvalaibleUtxos = null;

        if (amount == -1) {
            // toAmount = Math.floor(this.balance.minus(20000).toNumber());
            au = await this.getAvailableUtxo(-1);
            toAmount = au.value - 20000;// 20000: fee, cross transafer need more fee.
        } else {
            toAmount = Util.accMul(amount, Config.SELA);
            au = await this.getAvailableUtxo(toAmount + 20000);// 20000: fee, cross transafer need more fee.
        }
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        Logger.log('wallet', 'createDepositTransaction toAmount:', toAmount);

        let lockAddress = '';
        switch (toSubWalletId) {
            case StandardCoinName.ETHSC:
                lockAddress = Config.ETHSC_DEPOSIT_ADDRESS;
                break;
            case StandardCoinName.ETHDID:
                lockAddress = Config.ETHDID_DEPOSIT_ADDRESS;
                break;
            default:
                Logger.error('wallet', 'createDepositTransaction not support ', toSubWalletId);
                return null;
        }

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createDepositTransaction(
            au.utxo,
            toSubWalletId,
            toAmount.toString(),
            toAddress,
            lockAddress,
            '10000',
            memo // User input memo
        );
    }

    public async createWithdrawTransaction(toAddress: string, amount: number, memo, gasPrice: string, gasLimit: string, nonce: number): Promise<string> {
        return await null;
    }

    public async createIDTransaction(payload: string, memo = ""): Promise<string> {
        return await null;
    }

    public createConsolidateTransaction(utxoArray: Utxo[], memo = ''): Promise<string> {
        if (!utxoArray || utxoArray.length == 0) return null;

        let utxoArrayForSDK = [];
        let totalAmount = 0;
        let maxUtxoCount = utxoArray.length > this.Max_Consolidate_Utxos ? this.Max_Consolidate_Utxos : utxoArray.length;
        for (let i = 0; i < maxUtxoCount; i++) {
            let utxoAmountSELA = Util.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
            let utxoInput: UTXOInput = {
                Address: utxoArray[i].address,
                Amount: utxoAmountSELA.toString(),
                Index: utxoArray[i].vout,
                TxHash: utxoArray[i].txid
            }
            utxoArrayForSDK.push(utxoInput);
            totalAmount += utxoAmountSELA;
        }

        let toAmount = totalAmount - 10000;// 10000: fee

        let toAddress = this.getCurrentReceiverAddress();

        Logger.log('wallet', 'createConsolidateTransaction toAmount:', toAmount);

        let outputs = [{
            "Address": toAddress,
            "Amount": toAmount.toString()
        }]

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createPaymentTransaction(
            utxoArrayForSDK,
            outputs,
            '10000',
            memo
        );
    }

    // CR
    public CRCouncilMemberClaimNodeDigest(payload: CRCouncilMemberClaimNodeInfo, version: number): string {
        Logger.log('wallet', 'CRCouncilMemberClaimNodeDigest:', payload, ' version:', version);

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).CRCouncilMemberClaimNodeDigest(payload, version);
    }

    /**
     * @param transaction Raw transaction payload ready to be published
     */
    public async publishTransaction(transaction: string): Promise<string> {
        await TransactionService.instance.displayGenericPublicationLoader();
        let txId = await this.sendRawTransaction(this.id as StandardCoinName, transaction);
        this.lastUnConfirmedTransactionId = txId;
        return txId;
    }

    protected async sendRawTransaction(subWalletId: StandardCoinName, payload: string): Promise<string> {
        const param = {
            method: 'sendrawtransaction',
            params: [
                payload
            ],
        };

        let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForRpc(subWalletId);
        const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return await '';
        }
        // Logger.warn('wallet', 'rpcApiUrl:', rpcApiUrl, ' param:', param)
        // The caller need catch the execption.
        return GlobalJsonRPCService.instance.httpPost(rpcApiUrl, param, 'default', 10000, false, true);
    }

    // ********************************
    // Private
    // ********************************

    /**
     * If the last address is used, the spvsdk will create new addresses.
     */
    protected async checkAddresses(internal: boolean) {
        if (this.backGroundUpdateStoped) return false;

        const checkCount = 10;
        let startIndex = this.externalAddressCount;

        if (!internal) startIndex = this.internalAddressCount - checkCount;

        let findTx = false;
        try {
            do {
                findTx = false;
                let addressArray = this.networkWallet.safe.getAddresses(startIndex, checkCount, internal, AddressUsage.DEFAULT);
                const txRawList = await GlobalElastosAPIService.instance.getTransactionsByAddress(this.id as StandardCoinName, addressArray, this.TRANSACTION_LIMIT, 0);
                if (txRawList && txRawList.length > 0) {
                    findTx = true;
                    startIndex += checkCount;
                }
            } while (findTx);

            if (internal) {
                this.internalAddressCount = startIndex;
            } else {
                this.externalAddressCount = startIndex;
            }
        } catch (e) {
            Logger.error("wallet", 'checkAddresses exception:', e);
            throw e;
        }
    }

    /**
     * Stake, Unstake, Vote, and Mint NFT are four transactions that can only be processed simultaneously for one wallet.
     * bposTx: only check the stake, unstake, voting and mintNft transactions if bposTx = true.
     */
    private async getPendingTransaction(bposTx = false) {
        const twoMinutesago = moment().add(-2, 'minutes').valueOf();
        // It takes several seconds for getTransactionByRPC.
        if ((this.networkWallet.getTransactionDiscoveryProvider().fetchTransactionTimestamp < twoMinutesago)) {
            // Update transactions to get the pending transactions.
            await this.fetchNewestTransactions();
        }

        let findLastUnConfirmedTx = false;

        let transactions = await this.networkWallet.getTransactionDiscoveryProvider().getTransactions(this);
        let pendingTransactions = [];
        for (let i = 0, len = transactions.length; i < len; i++) {
            if (this.lastUnConfirmedTransactionId && this.lastUnConfirmedTransactionId === transactions[i].txid) {
                this.lastUnConfirmedTransactionId = null;
                findLastUnConfirmedTx = true;
            }
            if (transactions[i].Status !== TransactionStatus.CONFIRMED) {
                if (!bposTx || [RawTransactionType.Stake, RawTransactionType.Unstake, RawTransactionType.Voting, RawTransactionType.MintNFT].includes(transactions[i].txtype)) {
                    pendingTransactions.push(transactions[i].txid);
                }
            } else {
                // the transactions list is sorted by block height.
                break;
            }
        }

        if (this.lastUnConfirmedTransactionId && !findLastUnConfirmedTx) {
            let tx = await this.getTransactionDetails(this.lastUnConfirmedTransactionId);
            if (tx.confirmations < 1) {
                pendingTransactions.push(this.lastUnConfirmedTransactionId);
            } else {
                this.lastUnConfirmedTransactionId = null;
            }
        }

        Logger.log('wallet', 'Pending Transactions:', pendingTransactions);
        return pendingTransactions;
    }

    // Some pending transactions may be long ago transactions, which may not be updated when updating transaction records,
    // So we must first process the pending transactions after startup to confirm whether they are confirmed or invalid transactions.
    private async updatePendingTransaction() {
        if (this.backGroundUpdateStoped) return;

        let transaction = await this.networkWallet.getTransactionDiscoveryProvider().getTransactions(this);
        let pendingTransactions = [];
        let invalidPendingTransactions = [];
        let currentTime = moment().unix();

        for (let i = 0, len = transaction.length; i < len; i++) {
            if (transaction[i].Status !== TransactionStatus.CONFIRMED) {
                pendingTransactions.push(transaction[i]);
            } else {
                // the transactions list is sorted by block height.
                break;
            }
        }

        if (pendingTransactions.length === 0) return;

        let pendingTxidList = pendingTransactions.map(tx => tx.txid)
        let txList = await this.getrawtransaction(this.id as StandardCoinName, pendingTxidList);

        let needUpdate = false;
        for (let i = 0; i < txList.length; i++) {
            if (txList[i].result && txList[i].result.confirmations > 0) {
                // Update info: Status, height, time
                let tx = pendingTransactions.find(tx => {
                    return tx.txid === txList[i].result.txid;
                })
                tx.time = txList[i].result.time;
                tx.Status = TransactionStatus.CONFIRMED;
                needUpdate = true;
            }
        }

        let onehour = 3600;
        for (let i = pendingTransactions.length - 1; i >= 0; i--) {
          if (pendingTransactions[i].Status !== TransactionStatus.CONFIRMED) {
              // Not been confirmed for more than an hour
              if (!pendingTransactions[i].createtime || ((pendingTransactions[i].createtime + onehour) < currentTime)) {
                invalidPendingTransactions.push(pendingTransactions[i]);
                pendingTransactions.splice(i)
              }
          }
        }

        if (invalidPendingTransactions.length > 0) {
            Logger.log('wallet', 'remove invalid pending transaction:', invalidPendingTransactions)
            await this.networkWallet.getTransactionDiscoveryProvider().removeTransactionsFromCache(this, invalidPendingTransactions);
        }

        if (needUpdate) {
            Logger.log('wallet', 'update pending transaction:', pendingTransactions)
            await this.networkWallet.getTransactionDiscoveryProvider().updateTransactions(this, pendingTransactions);
        }
    }

    private async getUTXOUsedInPendingTransaction() {
        let pendingTx = await this.getPendingTransaction();
        if (pendingTx.length === 0) return [];

        let txList = await this.getrawtransaction(this.id as StandardCoinName, pendingTx);
        let usedUTXO = [];
        for (let i = 0, len = txList.length; i < len; i++) {
            let vinLen = 0;
            if (txList[i].result && txList[i].result.vin) {
                vinLen = txList[i].result.vin.length;
            }
            for (let j = 0; j < vinLen; j++) {
                usedUTXO.push(txList[i].result.vin[j].txid);
            }
        }
        return usedUTXO;
    }

    public async getrawtransaction(subWalletId: StandardCoinName, txidArray: string[]): Promise<any[]> {
        const paramArray = [];
        for (let i = 0, len = txidArray.length; i < len; i++) {
            const txid = txidArray[i];
            const param = {
                method: 'getrawtransaction',
                params: {
                    txid,
                    verbose: true
                },
                id: i.toString()
            };
            paramArray.push(param);
        }

        let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForRpc(subWalletId);
        const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return null;
        }

        let result: any[] = null;
        let retryTimes = 0;
        do {
            try {
                result = await GlobalJsonRPCService.instance.httpPost(rpcApiUrl, paramArray);
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < GlobalElastosAPIService.API_RETRY_TIMES);

        // Logger.log('wallet', 'getrawtransaction:', result)
        return result;
    }

    /**
     *
     * @param amountSELA SELA
     */
    public async getAvailableUtxo(amountSELA: number, address = null): Promise<AvalaibleUtxos> {
        let utxoArray: Utxo[] = null;
        if (this.id === StandardCoinName.ELA) {
            if (address) { // for createStakeTransaction. Only use the utxos of the first external address.
                let amountELA = amountSELA / Config.SELA
                utxoArray = await this.getUtxosByAmount(address, amountELA.toString(), UtxoType.Unused);
            } else {
                let addressesHasBalance = [];
                for (let i = 0; i < this.addressWithBalanceArray.length; i++) {
                    addressesHasBalance.push(this.addressWithBalanceArray[i].address);
                }
                let votingUtxoArray = await this.getVotingUtxoByRPC(addressesHasBalance);
                if ((amountSELA === -1) || (!this.balance.gt(amountSELA + this.votingAmountSELA))) {
                    // TODO: use getUtxosByAmount
                    utxoArray = await this.getAllUtxoByType(UtxoType.Mixed, addressesHasBalance);
                    // TODO: Notify user to vote?
                } else {
                    let addressList = this.getAddressListByAmount(amountSELA.toString(), votingUtxoArray);
                    if (addressList.length == 1) {
                        let amountELA = amountSELA / Config.SELA
                        utxoArray = await this.getUtxosByAmount(addressList[0], amountELA.toString(), UtxoType.Unused);
                    } else {
                        utxoArray = await this.getAllUtxoByType(UtxoType.Normal, addressesHasBalance);
                    }
                }
            }
        } else {
            utxoArray = await this.getAllUtxoByType(UtxoType.Mixed);
        }

        if (utxoArray === null) {
            Logger.warn('wallet', 'Can not find utxo!')
            return { value: 0, utxo: null };
        }

        // Remove the utxo that used in pending transactions.
        let usedUTXOs = await this.getUTXOUsedInPendingTransaction();
        if (usedUTXOs.length > 0) {
            for (let i = utxoArray.length - 1; i >= 0; i--) {
                if (usedUTXOs.indexOf(utxoArray[i].txid) >= 0) {
                    utxoArray.splice(i, 1);
                }
            }
        }

        let utxoArrayForSDK: UTXOInput[] = [];
        let getEnoughUTXO = false;
        let totalAmount = 0;
        if (utxoArray) {
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoAmountSELA = Util.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
                let utxoInput: UTXOInput = {
                    Address: utxoArray[i].address,
                    Amount: utxoAmountSELA.toString(),
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoInput);
                totalAmount += utxoAmountSELA;
                if ((amountSELA != -1) && (totalAmount >= amountSELA)) {
                    Logger.log('wallet', 'Get enough utxo for :', amountSELA);
                    getEnoughUTXO = true;
                    break;
                }
            }
        }

        if ((usedUTXOs.length > 0) && (!getEnoughUTXO || (amountSELA == -1))) {
            Logger.warn('wallet', 'used UTXOs count:', usedUTXOs.length, usedUTXOs);
            return { value: 0, utxo: null };
        }

        if (!getEnoughUTXO) {
            //TODO. Maybe the coinbase utxo is not avaliable? or popup the prompt?
            //return all the utxo.
            return { value: totalAmount, utxo: utxoArrayForSDK };
        } else {
            return { value: totalAmount, utxo: utxoArrayForSDK };
        }
    }

    private async throwUtxoNotEnoughError() {
        if (await this.hasPendingBalance()) {
            throw new Error('There is already an on going transaction')
        } else {
            throw new Error('Insufficient Balance');
        }
    }

    public async getUtxoForSDK(utxoArray: Utxo[] = null): Promise<UTXOInput[]> {
        let utxoArrayForSDK = [];
        if (utxoArray) {
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoAmountSELA = Util.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
                let utxoInput: UTXOInput = {
                    Address: utxoArray[i].address,
                    Amount: utxoAmountSELA.toString(),
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoInput);
            }
        }

        Logger.log('wallet', 'UTXO for transfer:', utxoArrayForSDK);
        return await utxoArrayForSDK;
    }

    // Use toSELA  instead of accMul (Accuracy issues)
    // If after complete testing, there is no problem with toSELA, the getUtxoForSDK can be deleted.
    public async getUtxoForSDKEx(utxoArray: Utxo[] = null): Promise<UTXOInput[]> {
        let utxoArrayForSDK = [];
        if (utxoArray) {
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoInput: UTXOInput = {
                    Address: utxoArray[i].address,
                    Amount: Util.toSELA(parseFloat(utxoArray[i].amount)),
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoInput);
            }
        }

        Logger.log('wallet', 'UTXO for transfer:', utxoArrayForSDK);
        return await utxoArrayForSDK;
    }

    private async getVotedContent(): Promise<RawVoteContent[]> {
        // We only consider the case of one utxo for voting.
        if (this.votingUtxoArray && (this.votingUtxoArray.length > 0)) {
            let detail = await this.getTransactionDetails(this.votingUtxoArray[0].txid);
            if (detail) {
                return detail.vout[0].payload.contents;
            }
        }
        return null;
    }

    // Transform vote contents from raw rpc to the format required by the SDK
    private transformVoteContentForSDK(voteContent: RawVoteContent[]) {
        let votedContents: VoteContentInfo[] = [];

        for (let i = 0, len = voteContent.length; i < len; i++) {
            let voteType: VoteTypeString = voteTypeMap[voteContent[i].votetype];

            let candidates: Candidates = {};

            for (let j = 0, len = voteContent[i].candidates.length; j < len; j++) {
                let amountSELA = Util.accMul(parseFloat(voteContent[i].candidates[j].votes), Config.SELA)
                candidates[voteContent[i].candidates[j].candidate] = amountSELA.toString();
            }

            let newVoteContent: VoteContentInfo = { Type: voteType, Candidates: candidates }
            votedContents.push(newVoteContent);
        }

        return votedContents;
    }

    /**
     * Previously executed votes need to be added.
     */
    private async mergeVoteContents(userVoteContents: VoteContentInfo[]) {
        let rawvotedContents = await this.getVotedContent();
        if (!rawvotedContents) return userVoteContents;

        let votedContents: VoteContentInfo[] = await this.transformVoteContentForSDK(rawvotedContents);

        let newVoteContents = await this.invalidVoteCandidatesHelper.removeInvalidCandidates(userVoteContents, votedContents);
        Logger.log('wallet', 'newVoteContents :', newVoteContents);
        return newVoteContents;
    }

    /**
     * Get balance by type
     */
    public async getTotalBalanceByType(spendable = false) {
        let totalBalance = new BigNumber(0);
        let balanceList;

        let addressWithBalanceArrayTemp = [];

        // The Single Address Wallet should use the external address.
        if (!this.isSingleAddress()) {
            balanceList = await this.getBalanceByAddress(true, spendable);
            if (!balanceList || balanceList.value == null) {
                return null;
            }
            totalBalance = totalBalance.plus(balanceList.value);
            addressWithBalanceArrayTemp = balanceList.addresses;
        }

        balanceList = await this.getBalanceByAddress(false, spendable);
        if (!balanceList || balanceList.value == null) {
            return null;
        }
        totalBalance = totalBalance.plus(balanceList.value);
        addressWithBalanceArrayTemp = [...addressWithBalanceArrayTemp, ...balanceList.addresses];

        if (this.id == StandardCoinName.ELA) {
            // Coinbase reward, eg. dpos
            balanceList = await this.getBalanceByOwnerAddress(spendable);
            if (balanceList && (balanceList.value !== null)) {
                totalBalance = totalBalance.plus(balanceList.value);
                addressWithBalanceArrayTemp = [...addressWithBalanceArrayTemp, ...balanceList.addresses];
            }
        }

        this.addressWithBalanceArray = addressWithBalanceArrayTemp;

        // Logger.warn('wallet', "totalvalue:", totalBalance.toString());
        // for (let i = 0; i < this.addressWithBalanceArray.length; i++) {
        //     Logger.warn('wallet', this.addressWithBalanceArray[i].address, this.addressWithBalanceArray[i].value.toString());
        // }


        return totalBalance;
    }

    /**
     * Get balance by RPC
     */
    public async getBalanceByRPC() {
        if (this.backGroundUpdateStoped) return;

        let totalBalance = await this.getTotalBalanceByType(false);
        if (totalBalance !== null) {
            this.balance = totalBalance;
            await this.saveBalanceToCache();
        }

        // Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    }

    /**
     * Get staked balance, the unit is ELA.
     */
    public getStakedBalance() {
        return this.stakedBalance;
    }

    public async updateStakedBalance() {
        var stakeAddress = this.getOwnerStakeAddress();
        if (stakeAddress) {
            const result = await GlobalElastosAPIService.instance.getVoteRights(stakeAddress);
            if (result && result[0] && result[0].totalvotesright) {
                this.stakedBalance = parseFloat(result[0].totalvotesright);
            } else
                this.stakedBalance = 0;

            await this.saveStakedBalanceToCache();
        }
    }

    private async loadStakedBalanceFromCache() {
        if (!this.stakedBalanceKeyInCache) {
            this.stakedBalanceKeyInCache = this.masterWallet.id + '-' + this.getUniqueIdentifierOnNetwork() + '-stakedbalance';
        }
        this.stakedBalanceCache = await TimeBasedPersistentCache.loadOrCreate(this.stakedBalanceKeyInCache);
        if (this.stakedBalanceCache.size() !== 0) {
            this.stakedBalance = parseFloat(this.stakedBalanceCache.values()[0].data);
        }
    }

    public async saveStakedBalanceToCache(): Promise<void> {
        const timestamp = (new Date()).valueOf();
        this.stakedBalanceCache.set('stakedbalance', this.stakedBalance, timestamp);
        await this.stakedBalanceCache.save();
    }

    public getOwnerAddress(): string {
        if (!this.ownerAddress) {
            this.ownerAddress = (this.networkWallet.safe as any as ElastosMainChainSafe).getOwnerAddress();
        }
        return this.ownerAddress;
    }

    public getOwnerDepositAddress(): string {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).getOwnerDepositAddress();
    }

    public getOwnerStakeAddress(): string {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).getOwnerStakeAddress();
    }

    public getCodeofOwnerStakeAddress(): string {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).getCodeofOwnerStakeAddress();
    }

    public getCodeofOwnerAddress(): string {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).getCodeofOwnerAddress();
    }

    public getOwnerPublicKey(): string {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).getOwnerPublicKey();
    }

    public getPublicKeys(start: number, count: number, internal: boolean): string[] | PublickeysInfo {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).getPublicKeys(start, count, internal);
    }

    public signDigest(address: string, digest: string, passwd: string): Promise<string> {
        return (this.networkWallet.safe).signDigest(address, digest, passwd);
    }

    public signDigestWithOwnerKey(digest: string, passwd: string): Promise<string> {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).signDigestWithOwnerKey(digest, passwd);
    }

    public verifyDigest(publicKey: string, digest: string, signature: string): boolean {
        return (this.networkWallet.safe as any as ElastosMainChainSafe).verifyDigest(publicKey, digest, signature);
    }

    private async getBalanceByOwnerAddress(spendable = false) {
        if (this.id != StandardCoinName.ELA) return;

        let ownerAddress = this.getOwnerAddress();
        if (!ownerAddress) return null;

        let addressArray = [ownerAddress];
        try {
            const balanceList = await this.callGetBalanceByAddress(this.id as StandardCoinName, addressArray, spendable);
            // Logger.log("wallet", 'getBalanceByOwnerAddress balance:', balance.toString());
            return balanceList;
        } catch (e) {
            Logger.error("wallet", 'jsonRPCService.getBalanceByAddress exception:', e);
            throw e;
        }
    }

    private async getBalanceByAddress(internalAddress: boolean, spendable = false) {
        let startIndex = 0;
        let totalBalanceList: BalanceList = {
            value: null,
            addresses: []
        }
        let totalBalance = new BigNumber(0);
        let addressArray: string[] = null;
        let maxAddressCount = this.getAddressCount(internalAddress);
        let count = 150;

        do {
            if (startIndex + count > maxAddressCount) {
                count = maxAddressCount - startIndex;
                if (count <= 0) {
                    break;
                }
            }

            addressArray = this.networkWallet.safe.getAddresses(startIndex, count, internalAddress, AddressUsage.DEFAULT);
            startIndex += addressArray.length;

            try {
                const balanceList = await this.callGetBalanceByAddress(this.id as StandardCoinName, addressArray, spendable);
                if (!balanceList || balanceList.value === null) {
                    Logger.warn("wallet", 'Can not get balance by rpc.', this.id);
                    return null
                }
                totalBalance = totalBalance.plus(balanceList.value);
                totalBalanceList.addresses = [...totalBalanceList.addresses, ...balanceList.addresses];
            } catch (e) {
                Logger.error("wallet", 'jsonRPCService.getBalanceByAddress exception:', e);
                throw e;
            }
        } while (!this.isSingleAddress());

        totalBalanceList.value = totalBalance;
        // Logger.log("wallet", 'balance:', totalBalance.toFixed());

        return totalBalanceList;
    }

    // return balance in SELA
    public async callGetBalanceByAddress(subWalletId: StandardCoinName, addressArray: string[], spendable = false): Promise<BalanceList> {
        let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForRpc(subWalletId);
        const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
        if (rpcApiUrl === null) {
            return null;
        }

        let totalBalanceOfSELA = new BigNumber(0);
        const paramArray = [];
        let index = 0;
        for (const address of addressArray) {
            const param = {
                method: 'getreceivedbyaddress',
                params: {
                    address,
                    spendable
                },
                id: index.toString()
            };
            index++;
            paramArray.push(param);
        }

        let retryTimes = 0;
        let balanceList: BalanceList = {
            value: null,
            addresses: []
        }
        do {
            try {
                const resultArray = await GlobalJsonRPCService.instance.httpPost(rpcApiUrl, paramArray);
                for (const result of resultArray) {
                    if (result.result) {
                        if (result.result != '0') {
                            let balanceOfSELA = new BigNumber(result.result).multipliedBy(this.tokenAmountMulipleTimes);
                            totalBalanceOfSELA = totalBalanceOfSELA.plus(balanceOfSELA);
                            balanceList.addresses.push({ address: addressArray[parseInt(result.id)], value: balanceOfSELA });
                        }
                    }
                }
                balanceList.value = totalBalanceOfSELA;
                break;
            } catch (e) {
                // wait 100ms?
            }
        } while (++retryTimes < GlobalElastosAPIService.API_RETRY_TIMES);
        return balanceList;
    }

    async getTransactionDetails(txid: string): Promise<TransactionDetail> {
        let details = await this.getrawtransaction(this.id as StandardCoinName, [txid]);
        if (details && details[0].result) {
            return details[0].result;
        } else {
            // Remove error transaction.
            // TODO await this.removeInvalidTransaction(txid);
            return null;
        }
    }

    async getRealAddressInCrosschainTx(txDetail: TransactionDetail) {
        let targetAddress = '';
        // TODO: 1.vout is a array. 2. show the right address for the cross chain transaction
        if (txDetail.vout && txDetail.vout[0]) {
            // Cross chain transfer: ELA main chain to side chain.
            if (txDetail.payload) {
                // ELA main chain to side chain.
                if (txDetail.payload.crosschainaddresses) {
                    // Receiving address
                    targetAddress = txDetail.payload.crosschainaddresses[0];
                } else if (txDetail.payload.genesisblockaddress) {
                    // Sending address
                    let realtxid = Util.reversetxid(txDetail.payload.sidechaintransactionhashes[0]);

                    if (txDetail.payload.genesisblockaddress === Config.ETHSC_DEPOSIT_ADDRESS) {
                        let result = await GlobalEthereumRPCService.instance.getETHSCTransactionByHash(
                            GlobalElastosAPIService.instance.getApiUrlForChainCode(StandardCoinName.ETHSC),
                            realtxid);
                        if (result && result.from) {
                            targetAddress = result.from;
                        }
                    } else if (txDetail.payload.genesisblockaddress === Config.IDCHAIN_DEPOSIT_ADDRESS) {
                        // TODO: get the real address.
                    } else if (txDetail.payload.genesisblockaddress === Config.ETHDID_DEPOSIT_ADDRESS) {
                        // TODO: get the real address.
                    } else {
                        Logger.error('wallet', 'Can not find the chain for genesis block address:', txDetail.payload.genesisblockaddress);
                        return '';
                    }
                }
            } else {
                targetAddress = txDetail.vout[0].address;
            }
        }

        return targetAddress;
    }

    async getAllUtxoByType(type: UtxoType, addressArray: string[] = null) {
        let utxoArray = null;
        if (addressArray && addressArray.length > 0) {
            utxoArray = await GlobalElastosAPIService.instance.getAllUtxoByAddress(this.id as StandardCoinName, addressArray, type);
        } else {
            utxoArray = await this.getAllUtxoByAddress(false, type);

            let elastosNetworkOptions = <ElastosMainChainWalletNetworkOptions>this.masterWallet.getNetworkOptions("elastos");
            if (!elastosNetworkOptions.singleAddress) {
                let utxos = await this.getAllUtxoByAddress(true, type);
                if (utxos && utxos.length > 0) {
                    if (utxoArray)
                        utxoArray = [...utxoArray, ...utxos];
                    else
                        utxoArray = utxos;
                }
            }
        }
        return utxoArray;
    }

    /**
     * Get the amount for voting.
     * If the balance is sufficient, we will not use the voting ELA.
     * If not, we will use the voting ELA, and the voting was cancelled.
     */
    async getVotingUtxoByRPC(addressArray: string[] = null): Promise<Utxo[]> {
        this.votingUtxoArray = await this.getAllUtxoByType(UtxoType.Vote, addressArray);
        let votingAmountEla = 0;
        if (this.votingUtxoArray) {
            Logger.log('wallet', 'getVotingUtxoByRPC:', this.votingUtxoArray)
            for (let i = 0, len = this.votingUtxoArray.length; i < len; i++) {
                let amount = parseFloat(this.votingUtxoArray[i].amount);
                votingAmountEla += amount;
            }
            this.votingAmountSELA = Util.accMul(votingAmountEla, Config.SELA);
        } else {
            this.votingAmountSELA = 0;
        }
        return this.votingUtxoArray;
    }

    // For consolidate utxos
    public async getNormalUtxos(): Promise<Utxo[]> {
        let addressesHasBalance = [];
        for (let i = 0; i < this.addressWithBalanceArray.length; i++) {
            addressesHasBalance.push(this.addressWithBalanceArray[i].address);
        }
        let normalUtxoArray = await this.getAllUtxoByType(UtxoType.Normal, addressesHasBalance);
        if (normalUtxoArray) {
            // Remove the utxo that used in pending transactions.
            let usedUTXOs = await this.getUTXOUsedInPendingTransaction();
            if (usedUTXOs.length > 0) {
                for (let i = normalUtxoArray.length - 1; i >= 0; i--) {
                    if (usedUTXOs.indexOf(normalUtxoArray[i].txid) >= 0) {
                        normalUtxoArray.splice(i, 1);
                    }
                }
            }
            return normalUtxoArray;
        } else return [];
    }

    async getUtxosByAmount(address: string, amountELA: string, utxotype: UtxoType) {
        let utxoArray: Utxo[] = null;
        try {
            utxoArray = await GlobalElastosAPIService.instance.getUtxosByAmount(this.id as StandardCoinName, address, amountELA, utxotype);
        } catch (e) {
            Logger.error("wallet", 'GlobalElastosAPIService getUtxosByAmount exception:', e);
            throw e;
        }

        Logger.log('wallet', 'getUtxosByAmount utxoArray:', utxoArray)
        return utxoArray;
    }

    getAddressListByAmount(amountSELA: string, filterUtxo: Utxo[] = null): string[] {
        let amountOfSELA = new BigNumber(amountSELA);

        for (let i = 0; filterUtxo && (i < filterUtxo.length); i++) {
            let addresses = this.addressWithBalanceArray.find((a) => {
                return a.address == filterUtxo[i].address;
            })
            if (addresses) {
                addresses.value = addresses.value.minus(new BigNumber(filterUtxo[i].amount).multipliedBy(this.tokenAmountMulipleTimes));
            }
        }

        this.addressWithBalanceArray.sort((a, b) => {
            if (b.value.isGreaterThan(a.value)) return 1;
            else return -1;
        })

        let addressArray = [];
        let remainAmount = amountOfSELA;
        for (let i = 0; i < this.addressWithBalanceArray.length; i++) {
            addressArray.push(this.addressWithBalanceArray[i].address);
            remainAmount = remainAmount.minus(this.addressWithBalanceArray[i].value);
            if (remainAmount.isLessThanOrEqualTo(0)) break;
        }
        return addressArray;
    }

    async getAllUtxoByAddress(internalAddress: boolean, type: UtxoType): Promise<Utxo[]> {
        let startIndex = 0;
        let utxoArray: Utxo[] = null;
        let addressArray = null;
        let maxAddressCount = this.getAddressCount(internalAddress);
        let count = 150;

        do {
            if (startIndex + count > maxAddressCount) {
                count = maxAddressCount - startIndex;
                if (count <= 0) {
                    break;
                }
            }

            addressArray = this.networkWallet.safe.getAddresses(startIndex, count, internalAddress, AddressUsage.DEFAULT);

            // The ownerAddress is different with the external address even in single address wallet.
            if ((startIndex === 0) && !internalAddress && (this.id === StandardCoinName.ELA)) {
                // OwnerAddress: for register dpos node, CRC.
                const ownerAddress = this.getOwnerAddress();
                if (ownerAddress) addressArray.push(ownerAddress);
            }

            startIndex += addressArray.length;

            try {
                let utxos = await GlobalElastosAPIService.instance.getAllUtxoByAddress(this.id as StandardCoinName, addressArray, type);
                if (utxos && utxos.length > 0) {
                    if (utxoArray)
                        utxoArray = [...utxoArray, ...utxos];
                    else
                        utxoArray = utxos;
                }
            } catch (e) {
                Logger.error("wallet", 'jsonRPCService.getAllUtxoByAddress exception:', e);
                throw e;
            }
        } while (!this.isSingleAddress());

        //Logger.log("wallet", ' utxoArray length:', utxoArray ? utxoArray.length : 0);
        return utxoArray;
    }


    /* public async saveTransactions(transactionsList: ElastosTransaction[]): Promise<void> {
      for (let i = 0, len = transactionsList.length; i < len; i++) {
        this.transactionsCache.set(transactionsList[i].txid, transactionsList[i], transactionsList[i].time);
      }
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.paginatedTransactions.txhistory.length)
      await this.transactionsCache.save();
    } */

    /* TODO - MOVE TO PROVIDER? private async removeInvalidTransaction(txid: string): Promise<void> {
      let existingIndex = this.paginatedTransactions.txhistory.findIndex(i => i.txid == txid);
      if (existingIndex >= 0) {
        Logger.warn('wallet', 'Find invalid transaction, remove it ', txid);
        this.paginatedTransactions.txhistory.splice(existingIndex, 1);
        this.paginatedTransactions.totalcount--;

        this.transactionsCache.remove(txid);
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.paginatedTransactions.txhistory.length)
        await this.transactionsCache.save();
      }
    } */

    // Main chain and ID chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableEarnProviders(): EarnProvider[] {
        return [];
    }

    // Main chain and ID chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableSwapProviders(): SwapProvider[] {
        return [];
    }

    // Main chain and ID chain don't support such "EVM" features for now, so we override the default
    // implementation to return nothing
    public getAvailableBridgeProviders(): BridgeProvider[] {
        return [];
    }


    //
    //proposal transaction functions
    //

    public proposalOwnerDigest(payload: NormalProposalOwnerInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalOwnerDigest(payload);
    }

    public proposalCRCouncilMemberDigest(payload: NormalProposalOwnerInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalCRCouncilMemberDigest(payload);
    }

    public async createProposalTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createProposalTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public async createProposalChangeOwnerTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createProposalChangeOwnerTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public terminateProposalOwnerDigest(payload: TerminateProposalOwnerInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).terminateProposalOwnerDigest(payload);
    }

    public terminateProposalCRCouncilMemberDigest(payload: TerminateProposalOwnerInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).terminateProposalCRCouncilMemberDigest(payload);
    }

    public async createTerminateProposalTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createTerminateProposalTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public proposalSecretaryGeneralElectionDigest(payload: SecretaryElectionInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalSecretaryGeneralElectionDigest(payload);
    }

    public proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload: SecretaryElectionInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalSecretaryGeneralElectionCRCouncilMemberDigest(payload);
    }

    public async createSecretaryGeneralElectionTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createSecretaryGeneralElectionTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public proposalChangeOwnerDigest(payload: ChangeProposalOwnerInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalChangeOwnerDigest(payload);
    }

    public proposalChangeOwnerCRCouncilMemberDigest(payload: ChangeProposalOwnerInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalChangeOwnerCRCouncilMemberDigest(payload);
    }

    public proposalTrackingSecretaryDigest(payload: CRCProposalTrackingInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalTrackingSecretaryDigest(payload);
    }

    public async createProposalTrackingTransaction(payload: CRCProposalTrackingInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createProposalTrackingTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public proposalReviewDigest(payload: CRCProposalReviewInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalReviewDigest(payload);
    }

    public async createProposalReviewTransaction(payload: CRCProposalReviewInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createProposalReviewTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public proposalTrackingOwnerDigest(payload: CRCProposalTrackingInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalTrackingOwnerDigest(payload);
    }

    public proposalWithdrawDigest(payload: CRCProposalWithdrawInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).proposalWithdrawDigest(payload);
    }

    public async createProposalWithdrawTransaction(payload: CRCProposalWithdrawInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createProposalWithdrawTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public reserveCustomIDOwnerDigest(payload: ReserveCustomIDOwnerInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).reserveCustomIDOwnerDigest(payload);
    }

    public reserveCustomIDCRCouncilMemberDigest(payload: ReserveCustomIDOwnerInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).reserveCustomIDCRCouncilMemberDigest(payload);
    }

    public async createReserveCustomIDTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createReserveCustomIDTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public receiveCustomIDOwnerDigest(payload: ReceiveCustomIDOwnerInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).receiveCustomIDOwnerDigest(payload);
    }

    public receiveCustomIDCRCouncilMemberDigest(payload: ReceiveCustomIDOwnerInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).receiveCustomIDCRCouncilMemberDigest(payload);
    }

    public async createReceiveCustomIDTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createReceiveCustomIDTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public changeCustomIDFeeOwnerDigest(payload: ChangeCustomIDFeeOwnerInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).changeCustomIDFeeOwnerDigest(payload);
    }

    public changeCustomIDFeeCRCouncilMemberDigest(payload: ChangeCustomIDFeeOwnerInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).changeCustomIDFeeCRCouncilMemberDigest(payload);
    }

    public async createChangeCustomIDFeeTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createChangeCustomIDFeeTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public registerSidechainOwnerDigest(payload: RegisterSidechainProposalInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).registerSidechainOwnerDigest(payload);
    }

    public registerSidechainCRCouncilMemberDigest(payload: RegisterSidechainProposalInfo) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).registerSidechainCRCouncilMemberDigest(payload);
    }

    public async createRegisterSidechainTransaction(payload: CRCProposalInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createRegisterSidechainTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    //
    //dpos registration transaction functions
    //
    public async createRegisterProducerTransaction(payload: ProducerInfoJson, amount: number, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(amount + 20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createRegisterProducerTransaction(
            au.utxo,
            payload,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createCancelProducerTransaction(payload: CancelProducerInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createCancelProducerTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public async createUpdateProducerTransaction(payload: ProducerInfoJson, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createUpdateProducerTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public generateProducerPayload(publicKey: string, nodePublicKey: string, nickname: string, url: string, IPAddress: string, location: number, payPasswd: string, stakeUntil = 0) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).generateProducerPayload(
            publicKey,
            nodePublicKey,
            nickname,
            url,
            IPAddress,
            location,
            payPasswd,
            stakeUntil
        );
    }

    public generateCancelProducerPayload(publicKey: string, payPasswd: string): Promise<CancelProducerInfo> {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).generateCancelProducerPayload(
            publicKey,
            payPasswd
        );
    }

    public async createRetrieveDepositTransaction(utxo: UTXOInput[], amount: number, memo = ""): Promise<EncodedTx> {
        return await (this.networkWallet.safe as unknown as ElastosMainChainSafe).createRetrieveDepositTransaction(
            utxo,
            Util.accMul(amount, Config.SELA).toString(),
            '10000',
            memo
        );
    }

    //
    //CR registration transaction functions
    //
    public getCRDepositAddress(): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).getCRDepositAddress();
    }

    public generateCRInfoPayload(publicKey: string, did: string, nickname: string, url: string, location: number) {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).generateCRInfoPayload(
            publicKey,
            did,
            nickname,
            url,
            location
        );
    }

    public generateUnregisterCRPayload(cid: string): UnregisterCRPayload {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).generateUnregisterCRPayload(cid);
    }

    public async createRegisterCRTransaction(payload: CRInfoJson, amount: number, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(amount + 20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createRegisterCRTransaction(
            au.utxo,
            payload,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createUnregisterCRTransaction(payload: CRInfoJson, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createUnregisterCRTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public async createUpdateCRTransaction(payload: CRInfoJson, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createUpdateCRTransaction(
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    public async createRetrieveCRDepositTransaction(utxo: UTXOInput[], amount: number, memo = ""): Promise<EncodedTx> {
        return await (this.networkWallet.safe as unknown as ElastosMainChainSafe).createRetrieveCRDepositTransaction(
            utxo,
            Util.accMul(amount, Config.SELA).toString(),
            '10000',
            memo
        );
    }

    public async createCRCouncilMemberClaimNodeTransaction(version: number, payload: CRCouncilMemberClaimNodeInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createCRCouncilMemberClaimNodeTransaction(
            version,
            au.utxo,
            payload,
            '10000',
            memo
        );
    }

    // BPoS
    // amount: sela
    public async createStakeTransaction(payload: PayloadStakeInfo, amount: number, memo = ""): Promise<EncodedTx> {
        // Use the first external address.
        let firstExternalAddress = this.getCurrentReceiverAddress();

        let au = await this.getAvailableUtxo(amount + 20000, firstExternalAddress);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createStakeTransaction(
            au.utxo,
            payload,
            Config.ELA_STAKED_LOCK_ADDRESS,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createDPoSV2VoteTransaction(payload: VotingInfo, memo = ""): Promise<EncodedTx> {
        let firstExternalAddress = this.getCurrentReceiverAddress();
        let au = await this.getAvailableUtxo(20000, firstExternalAddress);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createDPoSV2VoteTransaction(au.utxo, payload, '10000', memo);
    }

    public getDPoSV2ClaimRewardDigest(payload: DPoSV2ClaimRewardInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).getDPoSV2ClaimRewardDigest(payload);
    }

    public async createDPoSV2ClaimRewardTransaction(payload: DPoSV2ClaimRewardInfo, memo = ""): Promise<EncodedTx> {
        let firstExternalAddress = this.getCurrentReceiverAddress();
        let au = await this.getAvailableUtxo(20000, firstExternalAddress);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createDPoSV2ClaimRewardTransaction(au.utxo, payload, '10000', memo);
    }

    public unstakeDigest(payload: UnstakeInfo): string {
        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).unstakeDigest(payload);
    }

    public async createUnstakeTransaction(payload: UnstakeInfo, memo = ""): Promise<EncodedTx> {
        let firstExternalAddress = this.getCurrentReceiverAddress();
        let au = await this.getAvailableUtxo(20000, firstExternalAddress);
        if (!au.utxo) await this.throwUtxoNotEnoughError();

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createUnstakeTransaction(au.utxo, payload, '10000', memo);
    }

    // BPoS NFT
    public async createMintNFTTransaction(payload: CreateNFTInfo, memo = ""): Promise<EncodedTx> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return (this.networkWallet.safe as unknown as ElastosMainChainSafe).createMintNFTTransaction(au.utxo, payload, '10000', memo);
    }
}