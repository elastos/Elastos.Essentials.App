import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import { ELATransactionCoder } from 'src/app/helpers/ela/ela.transaction.coder';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { ElastosMainChainWalletNetworkOptions } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { WalletUtil } from 'src/app/wallet/model/wallet.util';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { TransactionService } from 'src/app/wallet/services/transaction.service';
import { Config } from '../../../../../config/Config';
import { Candidates, jsToSpvWalletId, SPVService, VoteContent, VoteType } from '../../../../../services/spv.service';
import { StandardCoinName } from '../../../../coin';
import { BridgeProvider } from '../../../../earn/bridgeprovider';
import { EarnProvider } from '../../../../earn/earnprovider';
import { SwapProvider } from '../../../../earn/swapprovider';
import { AnyOfflineTransaction, ElastosTransaction, Outputs, RawTransactionType, RawVoteContent, TransactionDetail, TransactionDirection, TransactionInfo, TransactionStatus, TransactionType, Utxo, UtxoForSDK, UtxoType } from '../../../../tx-providers/transaction.types';
import { AnyNetworkWallet } from '../../../base/networkwallets/networkwallet';
import { MainCoinSubWallet } from '../../../base/subwallets/maincoin.subwallet';
import { ElastosTransactionsHelper } from '../../transactions.helper';
import { InvalidVoteCandidatesHelper } from '../invalidvotecandidates.helper';
import { ElastosMainChainSafe } from '../safes/mainchain.safe';


const voteTypeMap = [VoteType.Delegate, VoteType.CRC, VoteType.CRCProposal, VoteType.CRCImpeachment]

export type AvalaibleUtxos = {
    value: number;
    utxo: UtxoForSDK[];
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

    private ownerAddress: string = null;

    private externalAddressCount = 110; // Addresses for user.
    private internalAddressCount = 105;

    private addressWithBalanceArray: AdressWithBalance[] = [];

    private invalidVoteCandidatesHelper: InvalidVoteCandidatesHelper = null;

    constructor(networkWallet: AnyNetworkWallet) {
        super(networkWallet, StandardCoinName.ELA);

        this.tokenDecimals = 8;
        this.tokenAmountMulipleTimes = Config.SELAAsBigNumber;
    }

    public supportsCrossChainTransfers(): boolean {
        return true;
    }

    public async startBackgroundUpdates(): Promise<void> {
        await super.startBackgroundUpdates();

        this.invalidVoteCandidatesHelper = new InvalidVoteCandidatesHelper();

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        runDelayed(async () => {
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

    protected async getTransactionName(transaction: ElastosTransaction, translate: TranslateService): Promise<string> {
        if (transaction.type === TransactionDirection.MOVED) {
            // TODO: show different icon for different vote?
            if (transaction.votecategory !== 0) {
                return await "wallet.coin-op-vote";
            }

            let transactionName = '';
            switch (transaction.txtype) {
                case RawTransactionType.RegisterProducer:
                    transactionName = "wallet.coin-op-producer-register";
                    break;
                case RawTransactionType.CancelProducer:
                    transactionName = "wallet.coin-op-producer-cancel";
                    break;
                case RawTransactionType.UpdateProducer:
                    transactionName = "wallet.coin-op-producer-update";
                    break;
                case RawTransactionType.ReturnDepositCoin:
                    transactionName = "wallet.coin-op-producer-return";
                    break;
                case RawTransactionType.ActivateProducer:
                    transactionName = "wallet.coin-op-producer-active";
                    break;
                case RawTransactionType.RegisterCR:
                    transactionName = "wallet.coin-op-cr-register";
                    break;
                case RawTransactionType.UnregisterCR:
                    transactionName = "wallet.coin-op-cr-cancel";
                    break;
                case RawTransactionType.UpdateCR:
                    transactionName = "wallet.coin-op-cr-update";
                    break;
                case RawTransactionType.ReturnCRDepositCoin:
                    transactionName = "wallet.coin-op-cr-return";
                    break;

                case RawTransactionType.CrcProposal:
                    transactionName = "wallet.coin-op-proposal";
                    break;
                case RawTransactionType.CrcProposalReview:
                    transactionName = "wallet.coin-op-proposal-review";
                    break;
                case RawTransactionType.CrcProposalTracking:
                    transactionName = "wallet.coin-op-proposal-tracking";
                    break;
                case RawTransactionType.CrcProposalWithdraw:
                    transactionName = "wallet.coin-op-proposal-withdraw";
                    break;
                case RawTransactionType.CrCouncilMemberClaimNode:
                    transactionName = "wallet.coin-op-crc-claim";
                    break;
            }
            if (transactionName.length > 0) {
                return transactionName;
            }
        }

        return ElastosTransactionsHelper.getTransactionName(transaction);
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
    public async getRootPaymentAddress(): Promise<string> {
        let allAddresses = await this.networkWallet.safe.getAddresses(0, 1, false, AddressUsage.DEFAULT);
        //let allAddresses = await SPVService.instance.getAddresses(jsToSpvWalletId(this.masterWallet.id), this.id, 0, 1, false);
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
        let transactionInfo = ElastosTransactionsHelper.getTransactionInfo(transaction);
        transactionInfo.amount = new BigNumber(transaction.value, 10);
        transactionInfo.symbol = '';
        transactionInfo.isCrossChain = false;
        transactionInfo.txid = transaction.txid;

        let senderAddresses = this.getSenderAddress(transaction);
        // TODO: Should show all the sender address.
        transactionInfo.from = senderAddresses ? senderAddresses[0] : null;

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
                break;
            default:
                break;
        }

        return await transactionInfo;
    }

    public async getTransactionInfoForOfflineTransaction(transaction: AnyOfflineTransaction): Promise<TransactionInfo> {
        let receiverAddress: string = null;
        let amount: BigNumber = null;
        try {
            let buffer = Buffer.from(transaction.rawTx.Data, "base64");
            let decoded = await ELATransactionCoder.decodeTx(buffer, false);
            if (decoded && decoded.Outputs && decoded.Outputs.length > 0) {
                receiverAddress = decoded.Outputs[0].Address;
                amount = new BigNumber(decoded.Outputs[0].Value).dividedBy(Config.SELA);
            }
        }
        catch (e) {
            Logger.warn("Failed to decode elastos mainchain raw transaction from offline transaction", e);
        }

        let txInfo: TransactionInfo = {
            amount: amount,
            confirmStatus: 0,
            datetime: moment.unix(transaction.updated),
            direction: TransactionDirection.SENT,
            fee: null, // unknown, not published yet
            height: 1, // unknown, not published yet
            memo: null, // TODO: extract from raw tx
            name: ElastosTransactionsHelper.getTransactionStatusName(TransactionStatus.NOT_PUBLISHED),
            payStatusIcon: "./assets/wallet/buttons/send.png",
            status: TransactionStatus.PENDING,
            statusName: ElastosTransactionsHelper.getTransactionStatusName(TransactionStatus.PENDING),
            symbol: "", //this.networkWallet.displayToken,
            to: receiverAddress,
            from: null,
            timestamp: 0,
            txid: null,
            type: TransactionType.SENT,
            isCrossChain: false // TODO: that's elastos specific
        }
        return txInfo;
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

    public supportMemo() {
        return true;
    }

    public async update() {
        await this.getBalanceByRPC();
    }

    public async updateBalance() {
        await this.getBalanceByRPC();
    }

    /**
     * Check whether there are any unconfirmed transactions
     * For vote transaction
     */
    public async hasPendingBalance() {
        let pendingTx = await this.getPendingTransaction();
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
        if (!au.utxo) return;

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

    public async createVoteTransaction(voteContents: VoteContent[], memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(-1);
        if (!au.utxo) return;

        let newVoteContents = await this.mergeVoteContents(voteContents);
        Logger.log('wallet', 'createVoteTransaction:', JSON.stringify(newVoteContents));

        // TODO: use safe
        return SPVService.instance.createVoteTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id, // From subwallet id
            JSON.stringify(au.utxo),
            JSON.stringify(newVoteContents),
            '10000',
            memo // User input memo
        );
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
        if (!au.utxo) return;

        Logger.log('wallet', 'createDepositTransaction toAmount:', toAmount);

        let lockAddres = '';
        switch (toSubWalletId) {
            case StandardCoinName.ETHSC:
                lockAddres = Config.ETHSC_DEPOSIT_ADDRESS;
                break;
            case StandardCoinName.ETHDID:
                lockAddres = Config.ETHDID_DEPOSIT_ADDRESS;
                break;
            default:
                Logger.error('wallet', 'createDepositTransaction not support ', toSubWalletId);
                return null;
        }

        // TODO: use safe
        return SPVService.instance.createDepositTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            1,
            JSON.stringify(au.utxo),
            toSubWalletId,
            toAmount.toString(),
            toAddress,
            lockAddres,
            '10000',
            memo // User input memo
        );
    }

    // Ignore gasPrice, gasLimit and nonce.
    public async createWithdrawTransaction(toAddress: string, amount: number, memo, gasPrice: string, gasLimit: string, nonce: number): Promise<string> {
        let toAmount = 0;
        let au: AvalaibleUtxos = null;

        if (amount == -1) {
            // toAmount = Math.floor(this.balance.minus(20000).toNumber());
            au = await this.getAvailableUtxo(-1);
            toAmount = au.value - 20000;//20000: fee, cross transafer need more fee.
        } else {
            toAmount = Util.accMul(amount, Config.SELA);
            au = await this.getAvailableUtxo(toAmount + 20000); //20000: fee, cross transafer need more fee.
        }
        if (!au.utxo) return;

        Logger.log('wallet', 'createWithdrawTransaction toAmount:', toAmount);

        // TODO: use safe
        return SPVService.instance.createWithdrawTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id, // From subwallet id
            JSON.stringify(au.utxo),
            toAmount.toString(),
            toAddress,
            '10000',
            memo
        );
    }

    public async createIDTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        // TODO: use safe
        return SPVService.instance.createIdTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            memo, // User input memo
            '10000',
        );
    }

    public async createConsolidateTransaction(utxoArray: Utxo[], memo = ''): Promise<string> {
        if (!utxoArray || utxoArray.length == 0) return null;

        let utxoArrayForSDK = [];
        let totalAmount = 0;
        for (let i = 0, len = utxoArray.length; i < len; i++) {
            let utxoAmountSELA = Util.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
            let utxoForSDK: UtxoForSDK = {
                Address: utxoArray[i].address,
                Amount: utxoAmountSELA.toString(),
                Index: utxoArray[i].vout,
                TxHash: utxoArray[i].txid
            }
            utxoArrayForSDK.push(utxoForSDK);
            totalAmount += utxoAmountSELA;
        }

        let toAmount = totalAmount - 10000;// 10000: fee

        let toAddress = await this.createAddress();

        Logger.log('wallet', 'createConsolidateTransaction toAmount:', toAmount);

        let outputs = [{
            "Address": toAddress,
            "Amount": toAmount.toString()
        }]

        return SPVService.instance.createTransaction(
            this.masterWallet.id,
            this.id, // From subwallet id
            JSON.stringify(utxoArrayForSDK),
            JSON.stringify(outputs),
            '10000',
            memo
        );
    }

    /**
     * @param transaction Raw transaction payload ready to be published
     */
    public async publishTransaction(transaction: string): Promise<string> {
        await TransactionService.instance.displayGenericPublicationLoader();
        return await this.sendRawTransaction(this.id as StandardCoinName, transaction);
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
        return GlobalJsonRPCService.instance.httpPost(rpcApiUrl, param);
    }

    // ********************************
    // Private
    // ********************************

    /**
     * If the last address is used, the spvsdk will create new addresses.
     */
    protected async checkAddresses(internal: boolean) {
        const checkCount = 10;
        let startIndex = this.externalAddressCount;

        if (!internal) startIndex = this.internalAddressCount - checkCount;

        let findTx = false;
        try {
            do {
                console.log("mainchain subwallet checkAddresses ", startIndex);
                findTx = false;
                let addressArray = await this.networkWallet.safe.getAddresses(startIndex, checkCount, internal, AddressUsage.DEFAULT);
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

    private async getPendingTransaction() {
        const twoMinutesago = moment().add(-2, 'minutes').valueOf();
        // It takes several seconds for getTransactionByRPC.
        if ((this.networkWallet.getTransactionDiscoveryProvider().fetchTransactionTimestamp < twoMinutesago)) {
            // Update transactions to get the pending transactions.
            await this.fetchNewestTransactions();
        }

        let transaction = await this.networkWallet.getTransactionDiscoveryProvider().getTransactions(this);
        let pendingTransactions = [];
        for (let i = 0, len = transaction.length; i < len; i++) {
            if (transaction[i].Status !== TransactionStatus.CONFIRMED) {
                pendingTransactions.push(transaction[i].txid);
            } else {
                // the transactions list is sorted by block height.
                break;
            }
        }
        Logger.log('wallet', 'Pending Transactions:', pendingTransactions);
        return pendingTransactions;
    }

    // Some pending transactions may be long ago transactions, which may not be updated when updating transaction records,
    // So we must first process the pending transactions after startup to confirm whether they are confirmed or invalid transactions.
    private async updatePendingTransaction() {
        let transaction = await this.networkWallet.getTransactionDiscoveryProvider().getTransactions(this);
        let pendingTransactions = [];
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
    public async getAvailableUtxo(amountSELA: number): Promise<AvalaibleUtxos> {
        let utxoArray: Utxo[] = null;
        if (this.id === StandardCoinName.ELA) {
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
                    utxoArray = await this.getUtxosByAmount(addressList[0], amountELA.toString(), UtxoType.Normal);
                } else {
                    utxoArray = await this.getAllUtxoByType(UtxoType.Normal, addressesHasBalance);
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

        let utxoArrayForSDK: UtxoForSDK[] = [];
        let getEnoughUTXO = false;
        let totalAmount = 0;
        if (utxoArray) {
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoAmountSELA = Util.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
                let utxoForSDK: UtxoForSDK = {
                    Address: utxoArray[i].address,
                    Amount: utxoAmountSELA.toString(),
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoForSDK);
                totalAmount += utxoAmountSELA;
                if ((amountSELA != -1) && (totalAmount >= amountSELA)) {
                    Logger.log('wallet', 'Get enough utxo for :', amountSELA);
                    getEnoughUTXO = true;
                    break;
                }
            }
        }

        if ((usedUTXOs.length > 0) && (!getEnoughUTXO || (amountSELA == -1))) {
            Logger.warn('wallet', 'used UTXOs count:', usedUTXOs.length);
            await PopupProvider.instance.ionicAlert('wallet.transaction-pending');
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

    public async getUtxoForSDK(utxoArray: Utxo[] = null): Promise<UtxoForSDK[]> {
        let utxoArrayForSDK = [];
        if (utxoArray) {
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoAmountSELA = Util.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
                let utxoForSDK: UtxoForSDK = {
                    Address: utxoArray[i].address,
                    Amount: utxoAmountSELA.toString(),
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoForSDK);
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
        let votedContents: VoteContent[] = [];

        for (let i = 0, len = voteContent.length; i < len; i++) {
            let voteType: VoteType = voteTypeMap[voteContent[i].votetype];

            let candidates: Candidates = {};

            for (let j = 0, len = voteContent[i].candidates.length; j < len; j++) {
                let amountSELA = Util.accMul(parseFloat(voteContent[i].candidates[j].votes), Config.SELA)
                candidates[voteContent[i].candidates[j].candidate] = amountSELA.toString();
            }

            let newVoteContent: VoteContent = { Type: voteType, Candidates: candidates }
            votedContents.push(newVoteContent);
        }

        return votedContents;
    }

    /**
     * Previously executed votes need to be added.
     */
    private async mergeVoteContents(userVoteContents: VoteContent[]) {
        let rawvotedContents = await this.getVotedContent();
        if (!rawvotedContents) return userVoteContents;

        let votedContents: VoteContent[] = await this.transformVoteContentForSDK(rawvotedContents);

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
        let totalBalance = await this.getTotalBalanceByType(false);
        if (totalBalance !== null) {
            this.balance = totalBalance;
            await this.saveBalanceToCache();
        }

        // Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    }

    public async getOwnerAddress(): Promise<string> {
        if (!this.ownerAddress) {
            this.ownerAddress = await (this.networkWallet.safe as any as ElastosMainChainSafe).getOwnerAddress();
            //this.ownerAddress = await SPVService.instance.getOwnerAddress(jsToSpvWalletId(this.masterWallet.id), this.id);
        }
        return this.ownerAddress;
    }

    private async getBalanceByOwnerAddress(spendable = false) {
        if (this.id != StandardCoinName.ELA) return;

        let ownerAddress = await this.getOwnerAddress();
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

            addressArray = await this.networkWallet.safe.getAddresses(startIndex, count, internalAddress, AddressUsage.DEFAULT);
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

            addressArray = await this.networkWallet.safe.getAddresses(startIndex, count, internalAddress, AddressUsage.DEFAULT);

            // The ownerAddress is different with the external address even in single address wallet.
            if ((startIndex === 0) && !internalAddress && (this.id === StandardCoinName.ELA)) {
                // OwnerAddress: for register dpos node, CRC.
                const ownerAddress = await this.getOwnerAddress();
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

        Logger.log("wallet", ' utxoArray length:', utxoArray ? utxoArray.length : 0);
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

    public async createProposalTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createProposalTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalChangeOwnerTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createProposalChangeOwnerTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createTerminateProposalTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createTerminateProposalTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createSecretaryGeneralElectionTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createSecretaryGeneralElectionTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalTrackingTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createProposalTrackingTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalReviewTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createProposalReviewTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalWithdrawTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createProposalWithdrawTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createReserveCustomIDTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createReserveCustomIDTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createReceiveCustomIDTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createReceiveCustomIDTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createChangeCustomIDFeeTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createChangeCustomIDFeeTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createRegisterSidechainTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createRegisterSidechainTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    //
    //dpos registration transaction functions
    //
    public async createRegisterProducerTransaction(payload: string, amount: number, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(amount + 20000);
        if (!au.utxo) return;

        return SPVService.instance.createRegisterProducerTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createCancelProducerTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createCancelProducerTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createUpdateProducerTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createUpdateProducerTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public createRetrieveDepositTransaction(utxo: UtxoForSDK[], amount: number, memo = ""): Promise<string> {
        return SPVService.instance.createRetrieveDepositTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(utxo),
            Util.accMul(amount, Config.SELA).toString(),
            '10000',
            memo
        );
    }

    //
    //CR registration transaction functions
    //
    public async createRegisterCRTransaction(payload: string, amount: number, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(amount + 20000);
        if (!au.utxo) return;

        return SPVService.instance.createRegisterCRTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createUnregisterCRTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createUnregisterCRTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createUpdateCRTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createUpdateCRTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }

    public createRetrieveCRDepositTransaction(utxo: UtxoForSDK[], amount: number, memo = ""): Promise<string> {
        return SPVService.instance.createRetrieveCRDepositTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(utxo),
            Util.accMul(amount, Config.SELA).toString(),
            '10000',
            memo
        );
    }

    public async createCRCouncilMemberClaimNodeTransaction(payload: string, memo = ""): Promise<string> {
        let au = await this.getAvailableUtxo(20000);
        if (!au.utxo) return;

        return SPVService.instance.createCRCouncilMemberClaimNodeTransaction(
            jsToSpvWalletId(this.masterWallet.id),
            this.id,
            JSON.stringify(au.utxo),
            payload,
            '10000',
            memo
        );
    }
}