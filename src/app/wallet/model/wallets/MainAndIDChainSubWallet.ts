import { StandardSubWallet } from './StandardSubWallet';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { AllTransactionsHistory, RawVoteContent, RawVoteType, TransactionDetail, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType, Utxo, UtxoForSDK, UtxoType } from '../Transaction';
import { TranslateService } from '@ngx-translate/core';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { Logger } from 'src/app/logger';
import { Config } from '../../config/Config';
import { Util } from '../Util';
import { Candidates, VoteContent, VoteType } from '../SPVWalletPluginBridge';


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

  private loadedTransactions = false;
  private txArrayToDisplay: AllTransactionsHistory = {totalcount:0, txhistory:[]};
  private needtoLoadMoreAddresses: string[] = [];
  private TRANSACTION_LIMIT = 50;// for rpc
  // Maybe there are lots of transactions and we need to merge the transactions for multi address wallet,
  // for performance we only merge the transactions from timestampStart to timestampEnd.
  private timestampStart = 0;
  private timestampEnd = 0;
  private loadMoreTimes = 0;

  constructor(masterWallet: MasterWallet, id: StandardCoinName) {
    super(masterWallet, id);

    setTimeout(async () => {
      await this.checkAddresses();
      await this.updateBalance();
      // await this.getTransactionByRPC();
      if (id === StandardCoinName.ELA) {
        await this.getVotingUtxoByRPC();
      }
    }, 3000);
  }

  public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
    if (!this.loadedTransactions) {
      await this.getTransactionByRPC();
    }
    if ((startIndex + 20 > this.txArrayToDisplay.txhistory.length) && (this.needtoLoadMoreAddresses.length > 0)) {
      await this.getMoreTransactionByRPC(++this.loadMoreTimes);
    }

    // For performance, only return 20 transactions.
    let newTxList:AllTransactionsHistory = {
        totalcount: this.txArrayToDisplay.totalcount,
        txhistory :this.txArrayToDisplay.txhistory.slice(startIndex, startIndex + 20),
    }
    return newTxList;
  }

  public async getTransactionInfo(transaction: TransactionHistory, translate: TranslateService): Promise<TransactionInfo> {
    const transactionInfo = await super.getTransactionInfo(transaction, translate);
    transactionInfo.amount = new BigNumber(transaction.value, 10);//.dividedBy(Config.SELAAsBigNumber);
    transactionInfo.txid = transaction.txid;

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

    return transactionInfo;
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
   * For dpos vote transaction
   */
  public async hasPendingBalance() {
    // const jsonInfo = await this.masterWallet.walletManager.spvBridge.getBalanceInfo(this.masterWallet.id, this.id);
    // const balanceInfoArray = JSON.parse(jsonInfo);
    // for (const balanceInfo of balanceInfoArray) {
    //     if ((balanceInfo.Summary.SpendingBalance !== '0') ||
    //         (balanceInfo.Summary.PendingBalance !== '0')) {
    //         return true;
    //     }
    // }
    return false;
  }

  /**
   * Check whether the available balance is enough.
   * @param amount unit is SELA
   */
  public async isAvailableBalanceEnough(amount: BigNumber) {
    return true;
  }

  public async createPaymentTransaction(toAddress: string, amount: number, memo: string = ""): Promise<string> {
    let toAmount = this.accMul(amount, Config.SELA);
    let outputs = [{
      "Address": toAddress,
      "Amount": toAmount.toString()
    }]

    let utxo = await this.getUtxo(toAmount + 10000);// 10000: fee

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
    let utxo = await this.getUtxo(-1);
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

  public async createDepositTransaction(sideChainID: StandardCoinName, toAddress: string, amount: number, memo: string = ""): Promise<string> {
    let toAmount = this.accMul(amount, Config.SELA);
    let utxo = await this.getUtxo(toAmount + 20000);// 20000: fee, cross transafer need more fee.

    let lockAddres = '';
    if (sideChainID === StandardCoinName.IDChain) {
      lockAddres = Config.IDCHAIN_ADDRESS;
    } else if (sideChainID === StandardCoinName.ETHSC) {
      lockAddres = Config.ETHSC_ADDRESS;
    } else {
      Logger.error('wallet', 'createDepositTransaction not support ', sideChainID);
    }

    return this.masterWallet.walletManager.spvBridge.createDepositTransaction(
      this.masterWallet.id,
      this.id,
      JSON.stringify(utxo),
      sideChainID,
      toAmount.toString(),
      toAddress,
      lockAddres,
      '10000',
      memo // User input memo
    );
  }

  public async createWithdrawTransaction(toAddress: string, amount: number, memo: string): Promise<string> {
    let toAmount = this.accMul(amount, Config.SELA);
    let utxo = await this.getUtxo(toAmount + 20000); //20000: fee, cross transafer need more fee.

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
    let utxo = await this.getUtxo(20000);

    return this.masterWallet.walletManager.spvBridge.createIdTransaction(
      this.masterWallet.id,
      this.id,
      JSON.stringify(utxo),
      payload,
      memo, // User input memo
      '10000',
    );
  }

  public async publishTransaction(transaction: string): Promise<string>{
    let rawTx = await this.masterWallet.walletManager.spvBridge.convertToRawTransaction(
      this.masterWallet.id,
      this.id,
      transaction,
    )

    let txid = await this.jsonRPCService.sendrawtransaction(this.id as StandardCoinName, rawTx);
    return txid;
  }

  // ********************************
  // Private
  // ********************************

  /**
   * If the last address is used, then the spvsdk will create new addresses.
   */
   private async checkAddresses() {
    let addressArray  = await this.masterWallet.walletManager.spvBridge.getLastAddresses(this.masterWallet.id, this.id, true);
    let addressArrayExternal = await this.masterWallet.walletManager.spvBridge.getLastAddresses(this.masterWallet.id, this.id, false);
    addressArray.push.apply(addressArray, addressArrayExternal);

    let addressArrayUsed = []
    try {
      const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, addressArray, this.TRANSACTION_LIMIT, 0);
      if (txRawList && txRawList.length > 0) {
        for (let i = 0, len = txRawList.length ; i < len; i++) {
          addressArrayUsed.push(txRawList[i].result);
        }
      }
    } catch (e) {
      Logger.log("wallet", 'getTransactionByAddress exception:', e);
      throw e;
    }

    if (addressArrayUsed.length > 0) {
      Logger.warn('wallet',  'checkAddresses addressArrayUsed:', addressArrayUsed)
      await this.masterWallet.walletManager.spvBridge.updateUsedAddress(this.masterWallet.id, this.id, addressArrayUsed);
    }
  }

  /**
   *
   * @param amountSELA SELA
   */
   private async getUtxo(amountSELA: number) {
    let utxoArray:Utxo[] = null;
    if (this.id === StandardCoinName.ELA) {
      if ((amountSELA === -1) || (!this.balance.gt(amountSELA + this.votingAmountSELA))) {
        utxoArray = await this.getAllUtxoByType(UtxoType.Mixed);
        // TODO: Notify user to vote?
      } else {
        utxoArray = await this.getAllUtxoByType(UtxoType.Normal);
      }
    } else {
      utxoArray = await this.getAllUtxoByType(UtxoType.Mixed);
    }

    let utxoArrayForSDK = [];
    if (utxoArray) {
      let totalAmount = 0;
      for (let i = 0, len = utxoArray.length ; i < len; i++) {
        let utxoAmountSELA = this.accMul(parseFloat(utxoArray[i].amount), Config.SELA)
        let utxoForSDK: UtxoForSDK = {
            Address: utxoArray[i].address,
            Amount: utxoAmountSELA.toString(),
            Index: utxoArray[i].vout,
            TxHash: utxoArray[i].txid
        }
        utxoArrayForSDK.push(utxoForSDK);
        totalAmount += utxoAmountSELA;
        if ((amountSELA != -1) && (totalAmount > amountSELA)) {
          Logger.log('wallet', 'Get enought utxo for :', amountSELA);
          break;
        }
      }
    }

    Logger.log('wallet', 'UTXO for transfer:', utxoArrayForSDK);
    return utxoArrayForSDK;
  }

  private async getVotedContent(): Promise<RawVoteContent[]> {
    if (this.votingUtxoArray && (this.votingUtxoArray.length == 0)) {
      await this.getVotingUtxoByRPC(); //Try again.
    }

    // We only consider the case of one utxo for voting.
    if (this.votingUtxoArray && (this.votingUtxoArray.length > 0)) {
      let detail = await this.getTransactionDetails(this.votingUtxoArray[0].txid);
      return detail.vout[0].payload.contents;
    } else {
      return null;
    }
  }

  private isSameVoteType(voteTypeString: VoteType, rawVoteType: RawVoteType) {
    return voteTypeString === voteTypeMap[rawVoteType];
  }

  // Transform vote contents from raw rpc to the format required by the SDK
  private transformVoteContentForSDK(voteContent:RawVoteContent) {
    let voteType:VoteType = voteTypeMap[voteContent.votetype];

    let candidates: Candidates = {};

    for (let i = 0, len = voteContent.candidates.length; i < len; i++) {
      let amountSELA = this.accMul(voteContent.candidates[i].votes, Config.SELA)
      candidates[voteContent.candidates[i].candidate] = amountSELA.toString();
    }

    let newVoteContent: VoteContent = { Type: voteType, Candidates:candidates}
    return newVoteContent;
  }

  private async mergeVoteContents(userVoteContents: VoteContent[]) {
    let votedContents = await this.getVotedContent();
    if (!votedContents) return userVoteContents;

    let crrelatedStage = await this.jsonRPCService.getCRrelatedStage();
    let crinvoting = crrelatedStage.invoting;
    // Merge
    let newVoteContents = [];
    for (let i = 0, len = votedContents.length; i < len; i++) {
      let validContent = true;
      for (let j = 0, lenUserContents = userVoteContents.length; j < lenUserContents; j++) {
        if (this.isSameVoteType(userVoteContents[j].Type, votedContents[i].votetype)) {
          validContent = false;
        }
      }

      if ((votedContents[i].votetype === RawVoteType.CRC) && !crinvoting) {
        // remove crc vote if we are outside of the council voting period.
        validContent = false;
      }

      if (validContent) {
        let newVoteContent = this.transformVoteContentForSDK(votedContents[i]);
        newVoteContents.push(newVoteContent);
      }
    }

    newVoteContents.push.apply(newVoteContents, userVoteContents);

    // TODO: computeInvalidCandidates

    Logger.log('wallet', 'newVoteContents :', newVoteContents);
    return newVoteContents;
  }

  /**
   * Get balance by RPC
   */
  public async getBalanceByRPC() {
    Logger.test("wallet", 'TIMETEST getBalanceByRPC start:', this.id);

    let totalBalance = new BigNumber(0);

    let balance: BigNumber;
    // The Single Address Wallet should use the external address.
    if (!this.masterWallet.account.SingleAddress) {
      balance = await this.getBalanceByAddress(true);
      totalBalance = totalBalance.plus(balance);
    }

    balance = await this.getBalanceByAddress(false);
    totalBalance = totalBalance.plus(balance);

    this.balanceByRPC = totalBalance;
    this.balance = totalBalance;

    Logger.test("wallet", 'TIMETEST getBalanceByRPC ', this.id, ' end');
    Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    // Logger.log("wallet", this.masterWallet.id, ' ', this.id, ' timestampRPC:', this.timestampRPC);
    return true;
  }

  private async getBalanceByAddress(internalAddress: boolean) {
    let requestAddressCount = 1;

    let startIndex = 0;
    let totalBalance = new BigNumber(0);
    let addressArray = null;
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
        totalBalance = totalBalance.plus(balance);
      } catch (e) {
        Logger.log("wallet", 'jsonRPCService.getBalanceByAddress exception:', e);
        throw e;
      }
    } while (!this.masterWallet.account.SingleAddress);

    // Logger.log("wallet", 'request Address count:', requestAddressCount);
    // Logger.log("wallet", 'balance:', totalBalance.toString());

    return totalBalance;
  }

  /**
   * Call this when import a new wallet or get the latest transactions.
   * @param timestamp get the transactions after the timestamp
   * @returns
   */
  async getTransactionByRPC(timestamp: number = 0) {
    Logger.test("wallet", 'TIMETEST getTransactionByRPC Chain ID:', this.id, ' start timestamp:', timestamp);
    const currentTimestamp = moment().valueOf();
    this.timestampEnd = Math.round(currentTimestamp / 1000);

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
      for (let i = 0, len = txList.length ; i < len; i++) {
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

    if (txList.length > 0){
      this.mergeTransactionListAndSort(txList);
    }

    this.loadedTransactions = true;
    Logger.test("wallet", 'TIMETEST getTransactionByRPC ', this.id, ' end');
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
    let txList:AllTransactionsHistory[] = [];
    try {
      const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, this.needtoLoadMoreAddresses,
            this.TRANSACTION_LIMIT, skipTxCount, 0);

      this.needtoLoadMoreAddresses = [];
      this.timestampEnd = this.timestampStart;
      this.timestampStart = 0;
      if (txRawList && txRawList.length > 0) {
        for (let i = 0, len = txRawList.length ; i < len; i++) {
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

    if (txList.length > 0){
      this.mergeTransactionListAndSort(txList);
    }
  }

  async getTransactionByAddress(internalAddress: boolean, timestamp: number = 0) {
    let startIndex = 0;
    let txListTotal:AllTransactionsHistory[] = [];

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
      startIndex += addressArray.Addresses.length;

      try {
        const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, addressArray.Addresses, this.TRANSACTION_LIMIT, 0, timestamp);
        if (txRawList && txRawList.length > 0) {
          for (let i = 0, len = txRawList.length ; i < len; i++) {
            txListTotal.push(txRawList[i].result);
          }
        }
      } catch (e) {
        Logger.log("wallet", 'getTransactionByAddress exception:', e);
        throw e;
      }
    } while (!this.masterWallet.account.SingleAddress);

    // Logger.log('Wallet', 'TX:', this.masterWallet.id, ' ChainID:', this.id, ' ', txListTotal)
    return txListTotal;
  }

  async getTransactionDetails(txid:string): Promise<TransactionDetail> {
    let details = await this.jsonRPCService.getrawtransaction(this.id as StandardCoinName, txid);
    return details;
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
          // Logger.warn('wallet', 'txDetail:', txDetail);
          let realtxid = Util.reversetxid(txDetail.payload.sidechaintransactionhashes[0]);
          // Logger.warn('wallet', 'realtxid:', realtxid);

          if (txDetail.payload.genesisblockaddress === Config.ETHSC_ADDRESS) {
            let result = await this.jsonRPCService.getETHSCTransactionByHash(this.id as StandardCoinName, realtxid);
            if (result && result.from) {
              targetAddress = result.from;
            }
          } else if (txDetail.payload.genesisblockaddress === Config.IDCHAIN_ADDRESS) {
            // TODO: get the real address.
          } else if (txDetail.payload.genesisblockaddress === Config.ETHDID_ADDRESS) {
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

  async getVotingUtxoByRPC() {
    this.votingUtxoArray = await this.getAllUtxoByType(UtxoType.Vote);
    let votingAmountEla = 0;
    if (this.votingUtxoArray) {
      Logger.warn('wallet', 'getVotingUtxoByRPC:', this.votingUtxoArray)
      for (let i = 0, len = this.votingUtxoArray.length ; i < len; i++) {
        let amount = parseFloat(this.votingUtxoArray[i].amount);
        votingAmountEla += amount;
      }
      this.votingAmountSELA = this.accMul(votingAmountEla, Config.SELA);
    } else {
      this.votingAmountSELA = 0;
    }
  }

  async getAllUtxoByAddress(internalAddress: boolean, type:UtxoType): Promise<Utxo[]> {
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
      startIndex += addressArray.Addresses.length;

      try {
        let utxos = await this.jsonRPCService.getAllUtxoByAddress(this.id as StandardCoinName, addressArray.Addresses, type);
        if (utxos && utxos.length > 0) {
          utxoArray ? utxoArray.push.apply(utxoArray, utxos) : utxoArray = utxos;
        }
      } catch (e) {
        Logger.log("wallet", 'jsonRPCService.getAllUtxoByAddress exception:', e);
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
    this.txArrayToDisplay.txhistory.sort(function (A, B) {
      return B.height - A.height;
    });
  }

  mergeTransactionList(txList: AllTransactionsHistory[]) {
    Logger.log('wallet', 'mergeTransactionList timestamp:[', this.timestampStart, ', ', this.timestampEnd, ']');

    let transactionHistory: TransactionHistory[] = [];
    // Get the txhistory between the timestampStart and timestampEnd.
    for (let i = 0, len = txList.length ; i < len; i++) {
      for (const txhistory of txList[i].txhistory) {
        if ((txhistory.time >= this.timestampStart) && (txhistory.time <= this.timestampEnd)) {
          transactionHistory.push(txhistory);
        }
      }
    }

    // TODO to improve : "+ 100": just mean we don't load all the transactions.
    this.needtoLoadMoreAddresses.length === 0 ? this.txArrayToDisplay.totalcount = transactionHistory.length :
    this.txArrayToDisplay.totalcount = transactionHistory.length + 100;

    let allSentTx = transactionHistory.filter((tx)=> {
      return tx.type === 'sent'
    })

    let sendtxidArray = [];
    let len = allSentTx.length;
    for (let i = 0; i < len; i++) {
      let isMatch = sendtxidArray.some((tx)=>{return tx.txid === allSentTx[i].txid})
      if (!isMatch) {
        sendtxidArray.push({height:allSentTx[i].height, txid:allSentTx[i].txid});
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
    this.txArrayToDisplay.totalcount -= totalMergeTxCount;
    this.txArrayToDisplay.txhistory.push.apply(this.txArrayToDisplay.txhistory, transactionHistory);
  }

  /**
   *
   * @param transactionsArray
   */
   mergeTransactionsWithSameTxid(transactionsArray) {
    // update value, inputs, type
    let sendTx = [], recvTx = [], sentInputs = [], sentOutputs = [], recvAddress = [];
    let isMoveTransaction = true;
    let sentValue : number = 0, recvValue : number = 0;

    if (transactionsArray.length == 1) {
      isMoveTransaction = true;
      // If all the outputs address belong to this wallet, then this transactions is move transaction.
      for (let i = 0; i < transactionsArray[0].outputs.length; i++) {
        if (transactionsArray[0].inputs.indexOf(transactionsArray[0].outputs[i]) < 0) {
            isMoveTransaction = false;
            break;
        }
      }

      let value, type ='sent';
      if (isMoveTransaction) {
        value = '0', type = 'moved';
      } else {
        value = transactionsArray[0].value;
      }

      return {value, type, inputs:transactionsArray[0].inputs, outputs:transactionsArray[0].outputs}
    }

    for (let i = 0, len = transactionsArray.length ; i < len; i++) {
      if (transactionsArray[i].type === 'sent') {
        sendTx.push(transactionsArray[i]);
      } else {
        recvTx.push(transactionsArray[i]);
      }
    }

    // Move transaction : sent outputs same as the received address.
    for (let i = 0, len = recvTx.length ; i < len; i++) {
      recvValue += parseFloat(recvTx[i].value);
      recvAddress.push(recvTx[i].address);
    }

    // update value
    for (let i = 0, len = sendTx.length ; i < len; i++) {
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
        sentOutputs.splice(i);
      }
    }

    // TODO: Need to update sent outputs, remove the received address.


    let value, type ='sent';
    if (isMoveTransaction) {
      value = '0', type = 'moved';
    } else {
      value = (sentValue - recvValue).toFixed(8).toString();
    }

    return {value, type, inputs:sentInputs, outputs:sentOutputs}
  }

  accMul(arg1, arg2) {
    let m = 0, s1 = arg1.toString(), s2 = arg2.toString();
    try { m += s1.split(".")[1].length } catch (e) { }
    try { m += s2.split(".")[1].length } catch (e) { }
    return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m)
  }
}
