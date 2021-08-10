import { StandardSubWallet } from './StandardSubWallet';
import BigNumber from 'bignumber.js';
import { AllTransactionsHistory, RawTransactionType, RawVoteContent, TransactionDetail, TransactionDirection, TransactionHistory, TransactionInfo, TransactionStatus, TransactionType, Utxo, UtxoForSDK, UtxoType } from '../Transaction';
import { TranslateService } from '@ngx-translate/core';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { Logger } from 'src/app/logger';
import { Config } from '../../config/Config';
import { Util } from '../Util';
import { AllAddresses, Candidates, VoteContent, VoteType } from '../SPVWalletPluginBridge';
import { InvalidVoteCandidatesHelper } from '../InvalidVoteCandidatesHelper';
import moment from 'moment';


const voteTypeMap = [VoteType.Delegate, VoteType.CRC, VoteType.CRCProposal, VoteType.CRCImpeachment]

/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class MainAndIDChainSubWallet extends StandardSubWallet {
    // voting
    private votingAmountSELA = 0; // ELA
    private votingUtxoArray: Utxo[] = null;

    private ownerAddress = null;

    private needtoLoadMoreAddresses: string[] = [];
    private TRANSACTION_LIMIT = 50;// for rpc
    // Maybe there are lots of transactions and we need to merge the transactions for multi address wallet,
    // for performance we only merge the transactions from timestampStart to timestampEnd.
    private timestampStart = 0;
    private timestampEnd = 0;
    private loadMoreTimes = 0;

    private getTransactionsTime = 0;

    private invalidVoteCandidatesHelper: InvalidVoteCandidatesHelper = null;

    constructor(masterWallet: MasterWallet, id: StandardCoinName) {
        super(masterWallet, id);

        this.initialize();
    }

    protected async initialize() {
        this.invalidVoteCandidatesHelper = new InvalidVoteCandidatesHelper(this.jsonRPCService);

        await this.loadTransactionsFromCache();

        setTimeout(async () => {
            if (!this.masterWallet.account.SingleAddress) {
              await this.checkAddresses(true);
              await this.checkAddresses(false);
            }
            await this.updateBalance();
        }, 1000);
    }

    public async getOwnerAddress(): Promise<string> {
      if (!this.ownerAddress) {
        this.ownerAddress = await this.masterWallet.walletManager.spvBridge.getOwnerAddress(
          this.masterWallet.id, this.id);
      }
      return this.ownerAddress;
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
        if (this.transactions == null) {
            await this.getTransactionByRPC();
            this.loadTxDataFromCache = false;
        } else {
            this.loadTxDataFromCache = true;
        }

        if (this.transactions) {
          if ((startIndex + 20 > this.transactions.txhistory.length) && (this.needtoLoadMoreAddresses.length > 0)) {
              await this.getMoreTransactionByRPC(++this.loadMoreTimes);
          }

          // For performance, only return 20 transactions.
          let newTxList: AllTransactionsHistory = {
              totalcount: this.transactions.totalcount,
              txhistory: this.transactions.txhistory.slice(startIndex, startIndex + 20),
          }
          return newTxList;
        }
        else {
          return null;
        }
    }

    public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
        const transactionInfo = await super.getTransactionInfo(transaction, translate);
        transactionInfo.amount = new BigNumber(transaction.value, 10);//.dividedBy(Config.SELAAsBigNumber);
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

        return transactionInfo;
    }

    private getSenderAddress(transaction: TransactionHistory): string[] {
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

    public async update() {
        await this.getBalanceByRPC();
        await this.getTransactionByRPC(this.timestampEnd);
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
        return this.balance.gt(amount);
    }

    // Ignore gasPrice and gasLimit.
    public async createPaymentTransaction(toAddress: string, amount: number, memo: string = "", gasPrice: string = null, gasLimit:string = null): Promise<string> {
        let toAmount = 0;
        if (amount == -1) {
            toAmount = Math.floor(this.balance.minus(10000).toNumber());
        } else {
            toAmount = this.accMul(amount, Config.SELA);
        }
        Logger.log('wallet', 'createPaymentTransaction toAmount:', toAmount);

        let outputs = [{
            "Address": toAddress,
            "Amount": toAmount.toString()
        }]

        let utxo = await this.getAvailableUtxo(toAmount + 10000);// 10000: fee
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createTransaction(
            this.masterWallet.id,
            this.id, // From subwallet id
            JSON.stringify(utxo),
            JSON.stringify(outputs),
            '10000',
            memo // User input memo
        );
    }

    public async createVoteTransaction(voteContents: VoteContent[], memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(-1);
        if (!utxo) return;

        let newVoteContents = await this.mergeVoteContents(voteContents);
        Logger.log('wallet', 'createVoteTransaction:', JSON.stringify(newVoteContents));

        return this.masterWallet.walletManager.spvBridge.createVoteTransaction(
            this.masterWallet.id,
            this.id, // From subwallet id
            JSON.stringify(utxo),
            JSON.stringify(newVoteContents),
            '10000',
            memo // User input memo
        );
    }

    public async createDepositTransaction(toElastosChainCode: StandardCoinName, toAddress: string, amount: number, memo: string = ""): Promise<string> {
        let toAmount = this.accMul(amount, Config.SELA);
        Logger.log('wallet', 'createDepositTransaction toAmount:', toAmount);
        let utxo = await this.getAvailableUtxo(toAmount + 20000);// 20000: fee, cross transafer need more fee.
        if (!utxo) return;

        let lockAddres = '';
        switch (toElastosChainCode) {
          case StandardCoinName.IDChain:
            lockAddres = Config.IDCHAIN_DEPOSIT_ADDRESS;
          break;
          case StandardCoinName.ETHSC:
            lockAddres = Config.ETHSC_DEPOSIT_ADDRESS;
          break;
          case StandardCoinName.ETHDID:
            lockAddres = Config.ETHDID_DEPOSIT_ADDRESS;
          break;
          default:
            Logger.error('wallet', 'createDepositTransaction not support ', toElastosChainCode);
            return null;
        }

        return this.masterWallet.walletManager.spvBridge.createDepositTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            toElastosChainCode,
            toAmount.toString(),
            toAddress,
            lockAddres,
            '10000',
            memo // User input memo
        );
    }

    // Ignore gasPrice and gasLimit.
    public async createWithdrawTransaction(toAddress: string, amount: number, memo: string, gasPrice: string, gasLimit: string): Promise<string> {
        let toAmount = 0;
        if (amount == -1) {
            toAmount = Math.floor(this.balance.minus(20000).toNumber());
        } else {
            toAmount = this.accMul(amount, Config.SELA);
        }
        Logger.log('wallet', 'createWithdrawTransaction toAmount:', toAmount);
        let utxo = await this.getAvailableUtxo(toAmount + 20000); //20000: fee, cross transafer need more fee.
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createWithdrawTransaction(
            this.masterWallet.id,
            this.id, // From subwallet id
            JSON.stringify(utxo),
            toAmount.toString(),
            toAddress,
            '10000',
            memo
        );
    }

    public async createIDTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createIdTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            memo, // User input memo
            '10000',
        );
    }

    public async publishTransaction(transaction: string): Promise<string> {
        let rawTx = await this.masterWallet.walletManager.spvBridge.convertToRawTransaction(
            this.masterWallet.id,
            this.id,
            transaction,
        )

        let txid = await this.jsonRPCService.sendrawtransaction(this.id as StandardCoinName, rawTx);
        return txid;
    }

    //
    //proposal transaction functions
    //

    public async createProposalTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createProposalTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalChangeOwnerTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createProposalChangeOwnerTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createTerminateProposalTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createTerminateProposalTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createSecretaryGeneralElectionTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createSecretaryGeneralElectionTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalTrackingTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createProposalTrackingTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalReviewTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createProposalReviewTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createProposalWithdrawTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createProposalWithdrawTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    //
    //dpos registration transaction functions
    //
    public async createRegisterProducerTransaction(payload: string, amount: number, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(amount);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createRegisterProducerTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createCancelProducerTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createCancelProducerTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createUpdateProducerTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createUpdateProducerTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createRetrieveDepositTransaction(utxo: UtxoForSDK[], amount: number, memo: string = ""): Promise<string> {
        return this.masterWallet.walletManager.spvBridge.createRetrieveDepositTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            this.accMul(amount, Config.SELA).toString(),
            '10000',
            memo
        );
    }

    //
    //CR registration transaction functions
    //
    public async createRegisterCRTransaction(payload: string, amount: number, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(amount);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createRegisterCRTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            amount.toString(),
            '10000',
            memo
        );
    }

    public async createUnregisterCRTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createUnregisterCRTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createUpdateCRTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createUpdateCRTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    public async createRetrieveCRDepositTransaction(amount: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createRetrieveCRDepositTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            amount,
            '10000',
            memo
        );
    }

    public async createCRCouncilMemberClaimNodeTransaction(payload: string, memo: string = ""): Promise<string> {
        let utxo = await this.getAvailableUtxo(20000);
        if (!utxo) return;

        return this.masterWallet.walletManager.spvBridge.createCRCouncilMemberClaimNodeTransaction(
            this.masterWallet.id,
            this.id,
            JSON.stringify(utxo),
            payload,
            '10000',
            memo
        );
    }

    // ********************************
    // Private
    // ********************************

    /**
     * If the last address is used, the spvsdk will create new addresses.
     */
    protected async checkAddresses(internal: boolean) {
        let addressArrayUsed = []

        try {
            do {
              let addressArray = await this.masterWallet.walletManager.spvBridge.getLastAddresses(this.masterWallet.id, this.id, internal);
              addressArrayUsed = []
              const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, addressArray, this.TRANSACTION_LIMIT, 0);
              if (txRawList && txRawList.length > 0) {
                  for (let i = 0, len = txRawList.length; i < len; i++) {
                      addressArrayUsed.push(txRawList[i].result.txhistory[0].address);
                  }
              }

              if (addressArrayUsed.length > 0) {
                await this.masterWallet.walletManager.spvBridge.updateUsedAddress(this.masterWallet.id, this.id, addressArrayUsed);
              }
            } while (addressArrayUsed.length > 0);
        } catch (e) {
            Logger.error("wallet", 'checkAddresses exception:', e);
            throw e;
        }
    }

    private async getPendingTransaction() {
      const twoMinutesago = moment().add(-2, 'minutes').valueOf();
      // It takes several seconds for getTransactionByRPC.
      if ((this.transactions === null) || (this.getTransactionsTime < twoMinutesago)) {
        // Update transactions to get the pending transactions.
        await this.getTransactionByRPC(this.timestampEnd);
      }

      let pendingTransactions = [];
      for (let i = 0, len = this.transactions.txhistory.length; i < len; i++) {
        if (this.transactions.txhistory[i].Status !== TransactionStatus.CONFIRMED) {
          pendingTransactions.push(this.transactions.txhistory[i].txid);
        } else {
          // the transactions list is sorted by block height.
          break;
        }
      }
      Logger.log('wallet', 'Pending Transactions:', pendingTransactions);
      return pendingTransactions;
    }

    private async getUTXOUsedInPendingTransaction() {
      let pendingTx = await this.getPendingTransaction();
      if (pendingTx.length === 0) return [];

      let txList = await this.jsonRPCService.getrawtransaction(this.id as StandardCoinName, pendingTx);
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

    /**
     *
     * @param amountSELA SELA
     */
    private async getAvailableUtxo(amountSELA: number) {
        let utxoArray: Utxo[] = null;
        if (this.id === StandardCoinName.ELA) {
            await this.getVotingUtxoByRPC();
            if ((amountSELA === -1) || (!this.balance.gt(amountSELA + this.votingAmountSELA))) {
                utxoArray = await this.getAllUtxoByType(UtxoType.Mixed);
                // TODO: Notify user to vote?
            } else {
                utxoArray = await this.getAllUtxoByType(UtxoType.Normal);
            }
        } else {
            utxoArray = await this.getAllUtxoByType(UtxoType.Mixed);
        }

        if (utxoArray === null) {
          Logger.warn('wallet', 'Can not find utxo!')
          return null;
        }

        // Remove the utxo that used in pending transactions.
        let usedUTXOs = await this.getUTXOUsedInPendingTransaction();
        for (let i = utxoArray.length - 1; i >= 0; i--) {
          if (usedUTXOs.indexOf(utxoArray[i].txid) >= 0) {
              utxoArray.splice(i, 1);
          }
        }

        let utxoArrayForSDK = [];
        let getEnoughUTXO = false;
        if (utxoArray) {
            let totalAmount = 0;
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoAmountSELA = this.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
                let utxoForSDK: UtxoForSDK = {
                    Address: utxoArray[i].address,
                    Amount: utxoAmountSELA.toString(),
                    Index: utxoArray[i].vout,
                    TxHash: utxoArray[i].txid
                }
                utxoArrayForSDK.push(utxoForSDK);
                totalAmount += utxoAmountSELA;
                if ((amountSELA != -1) && (totalAmount >= amountSELA)) {
                    Logger.log('wallet', 'Get enought utxo for :', amountSELA);
                    getEnoughUTXO = true;
                    break;
                }
            }
        }

        if ((usedUTXOs.length > 0) && (!getEnoughUTXO || (amountSELA == -1))) {
            Logger.warn('wallet', 'used UTXOs count:', usedUTXOs.length);
            await this.masterWallet.walletManager.popupProvider.ionicAlert('wallet.transaction-pending');
            return null;
        }

        if (!getEnoughUTXO) {
          //TODO. Maybe the coinbase utxo is not avaliable? or popup the prompt?
          //return all the utxo.
          return utxoArrayForSDK;
        } else {
          return utxoArrayForSDK;
        }
    }

    public async getUtxoForSDK(utxoArray: Utxo[] = null): Promise<UtxoForSDK[]> {
        let utxoArrayForSDK = [];
        if (utxoArray) {
            for (let i = 0, len = utxoArray.length; i < len; i++) {
                let utxoAmountSELA = this.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
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
        return utxoArrayForSDK;
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
                let amountSELA = this.accMul(voteContent[i].candidates[j].votes, Config.SELA)
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
     * Get balance by RPC
     */
    public async getBalanceByRPC() {
        let totalBalance = new BigNumber(0);

        let balance: BigNumber;
        // The Single Address Wallet should use the external address.
        if (!this.masterWallet.account.SingleAddress) {
            balance = await this.getBalanceByAddress(true);
            if (balance == null) {
              return;
            }
            totalBalance = totalBalance.plus(balance);
        }

        balance = await this.getBalanceByAddress(false);
        if (balance == null) {
          return;
        }
        totalBalance = totalBalance.plus(balance);

        if (this.id == StandardCoinName.ELA) {
          // Coinbase reward, eg. dpos
          balance = await this.getBalanceByOwnerAddress();
          if (balance == null) {
            return;
          }
          totalBalance = totalBalance.plus(balance);
        }

        this.balance = totalBalance;
        this.saveBalanceToCache();

        Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    }

    private async getBalanceByOwnerAddress() {
      if (this.id != StandardCoinName.ELA) return;

      let ownerAddress = await this.getOwnerAddress();
      let addressArray = [ownerAddress];
      try {
          const balance = await this.jsonRPCService.getBalanceByAddress(this.id as StandardCoinName, addressArray);
          if (balance === null) {
            Logger.warn("wallet", 'Can not get balance by rpc.', this.id);
            return null
          }
          Logger.log("wallet", 'getBalanceByOwnerAddress balance:', balance.toString());
          return balance;
      } catch (e) {
          Logger.error("wallet", 'jsonRPCService.getBalanceByAddress exception:', e);
          throw e;
      }
    }

    private async getBalanceByAddress(internalAddress: boolean) {
        let requestAddressCount = 1;

        let startIndex = 0;
        let totalBalance = new BigNumber(0);
        let addressArray: AllAddresses = null;
        do {
            addressArray = await this.masterWallet.walletManager.spvBridge.getAllAddresses(
                this.masterWallet.id, this.id, startIndex, 150, internalAddress);
            if (addressArray.Addresses.length === 0) {
                requestAddressCount = startIndex;
                break;
            }
            startIndex += addressArray.Addresses.length;

            try {
                const balance = await this.jsonRPCService.getBalanceByAddress(this.id as StandardCoinName, addressArray.Addresses);
                if (balance === null) {
                  Logger.warn("wallet", 'Can not get balance by rpc.', this.id);
                  return null
                }
                totalBalance = totalBalance.plus(balance);
            } catch (e) {
                Logger.error("wallet", 'jsonRPCService.getBalanceByAddress exception:', e);
                throw e;
            }
        } while (!this.masterWallet.account.SingleAddress);

        Logger.log("wallet", 'balance:', totalBalance.toString());

        return totalBalance;
    }

    /**
     * Call this when import a new wallet or get the latest transactions.
     * @param timestamp get the transactions after the timestamp
     * @returns
     */
    async getTransactionByRPC(timestamp: number = 0) {
        this.getTransactionsTime = moment().valueOf();
        let txList = await this.getTransactionByAddress(false, timestamp);

        // The Single Address Wallet should use the external address.
        if (!this.masterWallet.account.SingleAddress) {
            let txListInterna = await this.getTransactionByAddress(true, timestamp);
            if (txListInterna && txListInterna.length > 0) {
                txList.push.apply(txList, txListInterna);
            }
        }

        // TODO: get the addreses that need to load more transactions.
        if (timestamp === 0) {
            this.needtoLoadMoreAddresses = []
            for (let i = 0, len = txList.length; i < len; i++) {
                if (txList[i].totalcount > this.TRANSACTION_LIMIT) {
                    let len = txList[i].txhistory.length;
                    let timestamp = txList[i].txhistory[len - 1].time;
                    if (this.timestampStart <= timestamp) {
                        this.timestampStart = timestamp;
                    }
                    // There are lot of transactions in this address.
                    this.needtoLoadMoreAddresses.push(txList[i].txhistory[0].address)
                }
            }
            // Logger.warn("wallet", 'this.needtoLoadMoreAddresses:', this.needtoLoadMoreAddresses);
        }

        if (this.transactions == null) {
          // init
          this.transactions = {totalcount:0, txhistory:[]};
        }

        if (txList.length > 0) {
            this.mergeTransactionListAndSort(txList);
        } else {
            // Notify the page to show the right time of the transactions even no new transaction.
            this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length);
        }

        return true;
    }

    // Call this when load more transactions.
    //
    async getMoreTransactionByRPC(times: number) {
        if (this.needtoLoadMoreAddresses.length === 0) {
            Logger.log('wallet', 'All Transactions are loaded...')
            return;
        }

        let skipTxCount = times * this.TRANSACTION_LIMIT;
        let nextLimit = skipTxCount + this.TRANSACTION_LIMIT;
        let txList: AllTransactionsHistory[] = [];
        try {
            const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, this.needtoLoadMoreAddresses,
                this.TRANSACTION_LIMIT, skipTxCount, 0);

            this.needtoLoadMoreAddresses = [];
            this.timestampEnd = this.timestampStart;
            this.timestampStart = 0;
            if (txRawList && txRawList.length > 0) {
                for (let i = 0, len = txRawList.length; i < len; i++) {
                    txList.push(txRawList[i].result);
                    if (txRawList[i].result.totalcount > nextLimit) {
                        let len = txList[i].txhistory.length;
                        let timestamp = txList[i].txhistory[len - 1].time;
                        if (this.timestampStart <= timestamp) {
                            this.timestampStart = timestamp;
                        }
                        this.needtoLoadMoreAddresses.push(txRawList[i].result.txhistory[0].address)
                    }
                }
                // Logger.log("wallet", 'this.needtoLoadMoreAddresses:', this.needtoLoadMoreAddresses);
            }
        } catch (e) {
            Logger.log("wallet", 'getTransactionByAddress exception:', e);
            throw e;
        }

        if (txList.length > 0) {
            this.mergeTransactionListAndSort(txList);
        }
    }

    async getTransactionByAddress(internalAddress: boolean, timestamp: number = 0) {
        let startIndex = 0;
        let txListTotal: AllTransactionsHistory[] = [];

        if (internalAddress) {
            Logger.log("wallet", 'get Transaction for internal Address');
        } else {
            Logger.log("wallet", 'get Transaction for external Address');
        }

        let addressArray = null;
        do {
            addressArray = await this.masterWallet.walletManager.spvBridge.getAllAddresses(
                this.masterWallet.id, this.id, startIndex, 150, internalAddress);
            if (addressArray.Addresses.length === 0) {
                break;
            }
            if ((startIndex === 0) && !internalAddress && (this.id === StandardCoinName.ELA)) {
              // OwnerAddress: for register dpos node, CRC.
              const ownerAddress = await this.getOwnerAddress();
              addressArray.Addresses.push(ownerAddress);
            }

            startIndex += addressArray.Addresses.length;

            try {
                const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, addressArray.Addresses, this.TRANSACTION_LIMIT, 0, timestamp);
                if (txRawList && txRawList.length > 0) {
                    for (let i = 0, len = txRawList.length; i < len; i++) {
                        txListTotal.push(txRawList[i].result);
                    }
                }
            } catch (e) {
                Logger.log("wallet", 'getTransactionByAddress exception:', e);
                throw e;
            }
        } while (!this.masterWallet.account.SingleAddress);

        // Logger.log('Wallet', 'TX:', this.masterWallet.id, ' elastosChainCode:', this.id, ' ', txListTotal)
        return txListTotal;
    }

    async getTransactionDetails(txid: string): Promise<TransactionDetail> {
        let details = await this.jsonRPCService.getrawtransaction(this.id as StandardCoinName, [txid]);
        if (details && details[0].result) {
          return details[0].result;
        } else {
          // Remove error transaction.
          this.removeInvalidTransaction(txid);
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
                        let result = await this.jsonRPCService.getETHSCTransactionByHash(StandardCoinName.ETHSC, realtxid);
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

    async getAllUtxoByType(type: UtxoType) {
        let utxoArray = await this.getAllUtxoByAddress(false, type);

        if (!this.masterWallet.account.SingleAddress) {
            let utxos = await this.getAllUtxoByAddress(true, type);
            if (utxos && utxos.length > 0) {
                utxoArray ? utxoArray.push.apply(utxoArray, utxos) : utxoArray = utxos;
            }
        }
        return utxoArray;
    }

    /**
     * Get the amount for voting.
     * If the balance is sufficient, we will not use the voting ELA.
     * If not, we will use the voting ELA, and the voting was cancelled.
     */
    async getVotingUtxoByRPC() {
        this.votingUtxoArray = await this.getAllUtxoByType(UtxoType.Vote);
        let votingAmountEla = 0;
        if (this.votingUtxoArray) {
            Logger.log('wallet', 'getVotingUtxoByRPC:', this.votingUtxoArray)
            for (let i = 0, len = this.votingUtxoArray.length; i < len; i++) {
                let amount = parseFloat(this.votingUtxoArray[i].amount);
                votingAmountEla += amount;
            }
            this.votingAmountSELA = this.accMul(votingAmountEla, Config.SELA);
        } else {
            this.votingAmountSELA = 0;
        }
    }

    async getAllUtxoByAddress(internalAddress: boolean, type: UtxoType): Promise<Utxo[]> {
        let requestAddressCount = 1;

        let startIndex = 0;
        let utxoArray: Utxo[] = null;
        let addressArray = null;
        do {
            addressArray = await this.masterWallet.walletManager.spvBridge.getAllAddresses(
                this.masterWallet.id, this.id, startIndex, 150, internalAddress);
            if (addressArray.Addresses.length === 0) {
                requestAddressCount = startIndex;
                break;
            }
            // The ownerAddress is different with the external address even in single address wallet.
            if ((startIndex === 0) && !internalAddress && (this.id === StandardCoinName.ELA)) {
              // OwnerAddress: for register dpos node, CRC.
              const ownerAddress = await this.getOwnerAddress();
              addressArray.Addresses.push(ownerAddress);
            }

            startIndex += addressArray.Addresses.length;

            try {
                let utxos = await this.jsonRPCService.getAllUtxoByAddress(this.id as StandardCoinName, addressArray.Addresses, type);
                if (utxos && utxos.length > 0) {
                    utxoArray ? utxoArray.push.apply(utxoArray, utxos) : utxoArray = utxos;
                }
            } catch (e) {
                Logger.error("wallet", 'jsonRPCService.getAllUtxoByAddress exception:', e);
                throw e;
            }
        } while (!this.masterWallet.account.SingleAddress);

        Logger.log("wallet", 'request Address count:', requestAddressCount, ' utxoArray:', utxoArray);
        return utxoArray;
    }

    private mergeTransactionListAndSort(txList: AllTransactionsHistory[]) {
        // When you send transaction, one of the output is the address of this wallet,
        // So we must merge these transactions.
        // For send transactions, every input and output has a transactions.
        // If all the output is the address of this wallet, then this transaction direction is 'MOVED'
        this.mergeTransactionList(txList);

        // sort by block height
        this.transactions.txhistory.sort(function (A, B) {
            // The height is 0 if the transaction is pending.
            if (B.height === 0) return 1;
            if (A.height === 0) return -1;
            return B.height - A.height;
        });

        this.timestampEnd = this.getLastConfirmedTransactionTimestamp();

        this.saveTransactions(this.transactions.txhistory);
    }

    private getLastConfirmedTransactionTimestamp() {
      for (let i = 0, len = this.transactions.txhistory.length; i < len; i++) {
          if (this.transactions.txhistory[i].Status === TransactionStatus.CONFIRMED) {
            // the transactions list is sorted by block height.
            return this.transactions.txhistory[i].time;
          }
      }
      return 0;
    }

    private mergeTransactionList(txList: AllTransactionsHistory[]) {
        Logger.log('wallet', 'mergeTransactionList start timestamp:', this.timestampStart);
        let transactionHistory: TransactionHistory[] = [];
        // Get the txhistory after the timestampStart.
        for (let i = 0, len = txList.length; i < len; i++) {
            for (const txhistory of txList[i].txhistory) {
                // txhistory.time === 0: pending transaction.
                if ((txhistory.time === 0) || (txhistory.time >= this.timestampStart)) {
                    transactionHistory.push(txhistory);
                }
            }
        }

        let allSentTx = transactionHistory.filter((tx) => {
            return tx.type === 'sent'
        })

        let sendtxidArray = [];
        let len = allSentTx.length;
        for (let i = 0; i < len; i++) {
            let isMatch = sendtxidArray.some((tx) => { return tx.txid === allSentTx[i].txid })
            if (!isMatch) {
                sendtxidArray.push({ height: allSentTx[i].height, txid: allSentTx[i].txid });
            }
        }

        //merge and update
        let totalMergeTxCount = 0;
        for (let i = 0, len2 = sendtxidArray.length; i < len2; i++) {
            let txWithSameTxId = transactionHistory.filter((tx) => {
                return tx.txid === sendtxidArray[i].txid;
            })

            let updateInfo = this.mergeTransactionsWithSameTxid(txWithSameTxId);

            let updateArray = false;
            // update the first sent transaction and remove the others.
            for (let j = transactionHistory.length - 1; j >= 0; j--) {
                if ((transactionHistory[j].height == sendtxidArray[i].height)
                    && (transactionHistory[j].txid == sendtxidArray[i].txid)) {
                    if (!updateArray && (transactionHistory[j].type === 'sent')) {
                        transactionHistory[j].value = updateInfo.value;
                        transactionHistory[j].type = updateInfo.type as TransactionDirection;
                        transactionHistory[j].inputs = updateInfo.inputs;
                        transactionHistory[j].outputs = updateInfo.outputs;
                        updateArray = true;
                    } else {
                        transactionHistory.splice(j, 1);
                        totalMergeTxCount++;
                    }
                }
            }
        }

        for (let i = 0, len = transactionHistory.length; i < len; i++) {
          let existingIndex = this.transactions.txhistory.findIndex(tx => tx.txid == transactionHistory[i].txid);
          if (existingIndex === -1) {
            this.transactions.txhistory.push(transactionHistory[i]);
          } else {
            // update
            this.transactions.txhistory[existingIndex] = transactionHistory[i];
          }
        }

        // TODO to improve : "+ 100": just mean we don't load all the transactions.
        this.needtoLoadMoreAddresses.length === 0 ? this.transactions.totalcount = this.transactions.txhistory.length :
        this.transactions.totalcount = this.transactions.txhistory.length + 100;
    }

    /**
     *
     * @param transactionsArray
     */
    mergeTransactionsWithSameTxid(transactionsArray) {
        // update value, inputs, type
        let sendTx = [], recvTx = [], sentInputs = [], sentOutputs = [], recvAddress = [];
        let isMoveTransaction = true;
        let sentValue: number = 0, recvValue: number = 0;

        if (transactionsArray.length == 1) {
            isMoveTransaction = true;
            // If all the outputs address belong to this wallet, then this transactions is move transaction.
            for (let i = 0; i < transactionsArray[0].outputs.length; i++) {
                if (transactionsArray[0].inputs.indexOf(transactionsArray[0].outputs[i]) < 0) {
                    isMoveTransaction = false;
                    break;
                }
            }

            let value, type = 'sent';
            if (isMoveTransaction) {
                value = '0', type = 'moved';
            } else {
                value = transactionsArray[0].value;
            }

            return { value, type, inputs: transactionsArray[0].inputs, outputs: transactionsArray[0].outputs }
        }

        for (let i = 0, len = transactionsArray.length; i < len; i++) {
            if (transactionsArray[i].type === 'sent') {
                sendTx.push(transactionsArray[i]);
            } else {
                recvTx.push(transactionsArray[i]);
            }
        }

        // Move transaction : sent outputs same as the received address.
        for (let i = 0, len = recvTx.length; i < len; i++) {
            recvValue += parseFloat(recvTx[i].value);
            recvAddress.push(recvTx[i].address);
        }

        // update value
        for (let i = 0, len = sendTx.length; i < len; i++) {
            sentValue += parseFloat(sendTx[i].value);
            sentInputs.push(sendTx[i].inputs);

            for (let j = 0; j < sendTx[i].outputs.length; j++) {
                if (sentOutputs.indexOf(sendTx[i].outputs[j]) < 0) {
                    sentOutputs.push(sendTx[i].outputs[j]);
                }
            }
        }

        // If all the outputs address belong to this wallet, then this transactions is move transaction.
        for (let i = sentOutputs.length - 1; i >= 0; i--) {
            if (recvAddress.indexOf(sentOutputs[i]) < 0) {
                isMoveTransaction = false;
                // break;
            } else {
                // This address belongs to this wallet, so remove it.
                sentOutputs.splice(i, 1);
            }
        }

        // TODO: Need to update sent outputs, remove the received address.


        let value, type = 'sent';
        if (isMoveTransaction) {
            value = '0', type = 'moved';
        } else {
            value = (sentValue - recvValue).toFixed(8).toString();
        }

        return { value, type, inputs: sentInputs, outputs: sentOutputs }
    }

    public saveTransactions(transactionsList: TransactionHistory[]) {
      for (let i = 0, len = transactionsList.length; i < len; i++) {
        this.transactionsCache.set(transactionsList[i].txid, transactionsList[i], transactionsList[i].time);
      }
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
      this.transactionsCache.save();
    }

    private removeInvalidTransaction(txid: string) {
      let existingIndex = this.transactions.txhistory.findIndex(i => i.txid == txid);
      if (existingIndex >= 0) {
        Logger.warn('wallet', 'Find invalid transaction, remove it ', txid);
        this.transactions.txhistory.splice(existingIndex, 1);
        this.transactions.totalcount--;

        this.transactionsCache.remove(txid);
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
        this.transactionsCache.save();
      }
    }

    accMul(arg1, arg2) {
        let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try { m += s1.split(".")[1].length } catch (e) { }
        try { m += s2.split(".")[1].length } catch (e) { }

        return Math.floor(Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m))
    }
}
