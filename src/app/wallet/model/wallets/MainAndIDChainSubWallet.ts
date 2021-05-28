import { StandardSubWallet } from './StandardSubWallet';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { AllTransactionsHistory, TransactionDetail, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType, Utxo, UtxoForSDK, UtxoType } from '../Transaction';
import { TranslateService } from '@ngx-translate/core';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { Logger } from 'src/app/logger';
import { Config } from '../../config/Config';


/**
 * Specialized standard sub wallet that shares Mainchain (ELA) and ID chain code.
 * Most code between these 2 chains is common, while ETH is quite different. This is the reason why this
 * specialized class exists.
 */
export class MainAndIDChainSubWallet extends StandardSubWallet {
  private utxoArray: Utxo[] = null;
  private utxoArrayForSDK: UtxoForSDK[] = [];
  private rawTxArray: AllTransactionsHistory[] = [];
  private txArrayToDisplay: AllTransactionsHistory = {totalcount:0, txhistory:[]};
  private needtoLoadMoreAddresses: string[] = [];
  private TRANSACTION_LIMIT = 3;// for rpc
  // Maybe there are lots of transactions and we need to merge the transactions for multi address wallet,
  // for performance we only merge the transactions from timestampStart to timestampEnd.
  private timestampStart = 0;
  private timestampEnd = 0;
  private loadMoreTimes = 0;

  constructor(masterWallet: MasterWallet, id: StandardCoinName) {
    super(masterWallet, id);
  }

  public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
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

  private getUtxo(amount: number) {
    // TODO: select the utxo
    // For now just return all.
    return this.utxoArrayForSDK;
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

  public async updateBalance() {
    // Logger.log("wallet", 'MainAndIDChainSubWallet updateBalance ', this.id,
    //             ' syncTimestamp:', this.syncTimestamp,
    //             ' timestampRPC:', this.timestampRPC,
    //             ' this.progress:', this.progress);

    // if the balance form spvsdk is newer, then use it.
    // if ((this.progress === 100) || (this.syncTimestamp > this.timestampRPC)) {
    //     // Get the current balance from the wallet plugin.
    //     const balanceStr = await this.masterWallet.walletManager.spvBridge.getBalance(this.masterWallet.id, this.id);
    //     // Balance in SELA
    //     this.balance = new BigNumber(balanceStr, 10);
    // } else {
    //     Logger.log("wallet", 'Do not get Balance from spvsdk. ', this.id);
    //     // TODO: update balance by rpc?
    // }
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
    // const jsonInfo = await this.masterWallet.walletManager.spvBridge.getBalanceInfo(this.masterWallet.id, this.id);
    // const balanceInfoArray = JSON.parse(jsonInfo);
    // let availableBalance = new BigNumber(0);
    // let hadPengdingTX = false;
    // // Send Max balance if amount < 0.
    // let sengMax = amount.isNegative() ? true : false;

    // for (const balanceInfo of balanceInfoArray) {
    //     if (balanceInfo.Summary.Balance !== '0') {
    //         let balanceOfasset = new BigNumber(balanceInfo.Summary.Balance);
    //         if (balanceInfo.Summary.SpendingBalance !== '0') {
    //             hadPengdingTX = true;
    //             balanceOfasset = balanceOfasset.minus(new BigNumber(balanceInfo.Summary.SpendingBalance));
    //         }
    //         if (balanceInfo.Summary.PendingBalance !== '0') {
    //             hadPengdingTX = true;
    //             balanceOfasset = balanceOfasset.minus(new BigNumber(balanceInfo.Summary.PendingBalance));
    //         }
    //         if (balanceInfo.Summary.LockedBalance !== '0') {
    //             hadPengdingTX = true;
    //             balanceOfasset = balanceOfasset.minus(new BigNumber(balanceInfo.Summary.LockedBalance));
    //         }
    //         // DepositBalance

    //         if (hadPengdingTX && sengMax) {
    //             return false;
    //         }
    //         availableBalance = availableBalance.plus(balanceOfasset);
    //         if (availableBalance.gt(amount)) {
    //             return true;
    //         }
    //     }
    // }
    // return false;
  }

  public async createPaymentTransaction(toAddress: string, amount: number, memo: string = ""): Promise<string> {
    let outputs = [{
      "Address": toAddress,
      "Amount": amount.toString()
    }]

    let utxo = this.getUtxo(amount);

    return this.masterWallet.walletManager.spvBridge.createTransaction(
      this.masterWallet.id,
      this.id, // From subwallet id
      JSON.stringify(utxo),
      JSON.stringify(outputs),
      '10000',
      memo // User input memo
    );
  }

  public async createDepositTransaction(sideChainID: StandardCoinName, toAddress: string, amount: number, memo: string = ""): Promise<string> {
    // TODO: select utxo
    let utxo = this.getUtxo(amount);

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
      amount.toString(),
      toAddress,
      lockAddres,
      '10000',
      memo // User input memo
    );
  }

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
    return this.masterWallet.walletManager.spvBridge.createWithdrawTransaction(
      this.masterWallet.id,
      this.id, // From subwallet id
      '',
      toAmount.toString(),
      toAddress,
      memo
    );
  }


  public async publishTransaction(transaction: string): Promise<string>{
    let rawTx = await this.masterWallet.walletManager.spvBridge.convertToRawTransaction(
      this.masterWallet.id,
      this.id,
      transaction,
    )

    let txid = await this.jsonRPCService.sendrawtransaction(this.id as StandardCoinName, rawTx);
    Logger.log("wallet", "sendrawtransaction txid:", txid);
    return txid;
  }

  /**
   * Get balance by RPC if the last block time of spvsdk is one day ago.
   */
  async getBalanceByRPC() {
    // const currentTimestamp = moment().valueOf();
    // const onedayago = moment().add(-1, 'days').valueOf();
    // const oneHourago = moment().add(-10, 'minutes').valueOf();
    Logger.test("wallet", 'TIMETEST getBalanceByRPC start:', this.id);

    // if (this.lastBlockTime
    //         && ((this.syncTimestamp > onedayago)
    //         || (this.timestampRPC > oneHourago))) {
    //     Logger.log("wallet", 'Do not need to get balance by rpc.',
    //         ' this.lastBlockTime:', this.lastBlockTime,
    //         ' this.syncTimestamp:', this.syncTimestamp,
    //         ' this.timestampRPC:', this.timestampRPC);
    //     return false;
    // }

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
    // this.timestampRPC = currentTimestamp;

    Logger.test("wallet", 'TIMETEST getBalanceByRPC ', this.id, ' end');
    Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    // Logger.log("wallet", this.masterWallet.id, ' ', this.id, ' timestampRPC:', this.timestampRPC);
    return true;
  }

  async getBalanceByAddress(internalAddress: boolean) {
    let requestAddressCount = 1;

    let startIndex = 0;
    let totalBalance = new BigNumber(0);

    if (internalAddress) {
      Logger.log("wallet", 'get Balance for internal Address');
    } else {
      Logger.log("wallet", 'get Balance for external Address');
    }

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

    Logger.log("wallet", 'request Address count:', requestAddressCount);
    Logger.log("wallet", 'balance:', totalBalance.toString());

    return totalBalance;
  }

  /**
   * Call this when import a new wallet or get the latest transactions.
   * @param timestamp get the transactions after the timestamp
   * @returns
   */
  async getTransactionByRPC(timestamp: number = 0) {
    Logger.test("wallet", 'TIMETEST getTransactionByRPC start:', this.id);
    const currentTimestamp = moment().valueOf();
    this.timestampEnd = Math.round(currentTimestamp / 1000);

    const externalTxList = await this.getTransactionByAddress(false, timestamp);

    if (timestamp === 0) {
      this.rawTxArray = externalTxList;
    } else {
      this.rawTxArray.push.apply(this.rawTxArray, externalTxList);
    }

    // The Single Address Wallet should use the external address.
    if (!this.masterWallet.account.SingleAddress) {
      let txListInterna = await this.getTransactionByAddress(true, timestamp);
      if (txListInterna && txListInterna.length > 0) {
        this.rawTxArray.push.apply(this.rawTxArray, txListInterna);
      }
    }

    // TODO: get the addreses that need to load more transactions.
    if (timestamp === 0) {
      this.needtoLoadMoreAddresses = []
      for (let i = 0, len = this.rawTxArray.length ; i < len; i++) {
        if (this.rawTxArray[i].totalcount > this.TRANSACTION_LIMIT) {
          let len = this.rawTxArray[i].txhistory.length;
          let timestamp = this.rawTxArray[i].txhistory[len - 1].time;
          if (this.timestampStart <= timestamp) {
            this.timestampStart = timestamp;
          }
          // There are lot of transactions in this address.
          this.needtoLoadMoreAddresses.push(this.rawTxArray[i].txhistory[0].address)
        }
      }
      Logger.warn("wallet", 'this.needtoLoadMoreAddresses:', this.needtoLoadMoreAddresses);
    }

    this.mergeTransactionListAndSort();

    Logger.test("wallet", 'TIMETEST getTransactionByRPC ', this.id, ' end');
    return true;
  }

  // Call this when load more transactions.
  //
  async getMoreTransactionByRPC(times: number) {
    if (this.needtoLoadMoreAddresses.length === 0) {
      Logger.warn('wallet', 'All Transactions are loaded...')
      return;
    }

    let skipTxCount = times * this.TRANSACTION_LIMIT;
    let nextLimit = skipTxCount + this.TRANSACTION_LIMIT;
    try {
      const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, this.needtoLoadMoreAddresses,
            this.TRANSACTION_LIMIT, skipTxCount, 0);

      this.needtoLoadMoreAddresses = [];
      this.timestampEnd = this.timestampStart;
      this.timestampStart = 0;
      if (txRawList && txRawList.length > 0) {
        for (let i = 0, len = txRawList.length ; i < len; i++) {
          this.rawTxArray.push(txRawList[i].result);
          if (txRawList[i].result.totalcount > nextLimit) {
            let len = this.rawTxArray[i].txhistory.length;
            let timestamp = this.rawTxArray[i].txhistory[len - 1].time;
            if (this.timestampStart <= timestamp) {
              this.timestampStart = timestamp;
            }
            this.needtoLoadMoreAddresses.push(txRawList[i].result.txhistory[0].address)
          }
        }
        Logger.warn("wallet", 'this.needtoLoadMoreAddresses:', this.needtoLoadMoreAddresses);
      }
    } catch (e) {
      Logger.log("wallet", 'getTransactionByAddress exception:', e);
      throw e;
    }

    this.mergeTransactionListAndSort();
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
        const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, addressArray.Addresses, this.TRANSACTION_LIMIT, timestamp);
        Logger.warn('wallet', 'rawList form rpc:', txRawList)
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

    Logger.log('Wallet', 'TX:', this.masterWallet.id, ' ChainID:', this.id, ' ', txListTotal)
    return txListTotal;
  }

  async getTransactionDetails(txid:string) {
    let details = await this.jsonRPCService.getrawtransaction(this.id as StandardCoinName, txid);
    return details;
  }


  async getRealAddressInCrosschainTx(txDetail: TransactionDetail) {

    // if ()
  }

  /**
   *
   */
  async getAllUtxoByRPC() {
    Logger.test("wallet", 'TIMETEST getAllUtxoByRPC start:', this.id);
    this.utxoArray = null;
    this.utxoArray = await this.getAllUtxoByAddress(false);

    // The Single Address Wallet should use the external address.
    if (!this.masterWallet.account.SingleAddress) {
      let utxos = await this.getAllUtxoByAddress(true);
      if (utxos && utxos.length > 0) {
        this.utxoArray ? this.utxoArray.push.apply(this.utxoArray, utxos) : this.utxoArray = utxos;
      }
    }

    // TODO: remove it, temp for test
    this.utxoArrayForSDK = [];
    for (let i = 0, len = this.utxoArray.length ; i < len; i++) {
      let utxoForSDK: UtxoForSDK = {
          Address: this.utxoArray[i].address,
          Amount: (Math.round(parseFloat(this.utxoArray[i].amount) * Config.SELA)).toString(),
          Index: this.utxoArray[i].vout,
          TxHash: this.utxoArray[i].txid
      }
      this.utxoArrayForSDK.push(utxoForSDK);
    }

    Logger.log('Wallet', 'Utxo:', this.masterWallet.id, ' ChainID:', this.id, ' ', this.utxoArray)
    Logger.test("wallet", 'TIMETEST getAllUtxoByRPC ', this.id, ' end');
    return true;
  }

  async getAllUtxoByAddress(internalAddress: boolean): Promise<Utxo[]> {
    let requestAddressCount = 1;

    let startIndex = 0;
    let utxoArray: Utxo[] = null;

    if (internalAddress) {
      Logger.log("wallet", 'get Utxo for internal Address');
    } else {
      Logger.log("wallet", 'get Utxo for external Address');
    }

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
        let utxos = await this.jsonRPCService.getAllUtxoByAddress(this.id as StandardCoinName, addressArray.Addresses, UtxoType.Mixed);
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


  private mergeTransactionListAndSort() {
    // When you send transaction, one of the output is the address of this wallet,
    // So we must merge these transactions.
    // For send transactions, every input and output has a transactions.
    // If all the output is the address of this wallet, then this transaction direction is 'MOVED'
    this.mergeTransactionList();

    // sort by block height
    this.txArrayToDisplay.txhistory.sort(function (A, B) {
      return B.height - A.height;
    });
  }


  mergeTransactionList() {
    Logger.warn('wallet', 'mergeTransactionList timestamp:[', this.timestampStart, ', ', this.timestampEnd, ']');
    // Get the txhistory between the timestampStart and timestampEnd.
    for (let i = 0, len = this.rawTxArray.length ; i < len; i++) {
      for (const txhistory of this.rawTxArray[i].txhistory) {
        if ((txhistory.time >= this.timestampStart) && (txhistory.time <= this.timestampEnd)) {
          this.txArrayToDisplay.txhistory.push(txhistory);
        }
      }
    }

    // TODO to improve : "+ 100": just mean we don't load all the transactions.
    this.needtoLoadMoreAddresses.length === 0 ? this.txArrayToDisplay.totalcount = this.txArrayToDisplay.txhistory.length :
    this.txArrayToDisplay.totalcount = this.txArrayToDisplay.txhistory.length + 100;

    let allSentTx = this.txArrayToDisplay.txhistory.filter((tx)=> {
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
      let txWithSameTxId = this.txArrayToDisplay.txhistory.filter((tx) => {
        return tx.txid === sendtxidArray[i].txid;
      })

      let updateInfo = this.mergeTransactionsWithSameTxid(txWithSameTxId);

      let updateArray = false;
      // update the first sent transaction and remove the others.
      for (let j = this.txArrayToDisplay.txhistory.length - 1; j >= 0; j--) {
        if ((this.txArrayToDisplay.txhistory[j].height == sendtxidArray[i].height)
          && (this.txArrayToDisplay.txhistory[j].txid == sendtxidArray[i].txid)) {
          if (!updateArray && (this.txArrayToDisplay.txhistory[j].type === 'sent')) {
            this.txArrayToDisplay.txhistory[j].value = updateInfo.value;
            this.txArrayToDisplay.txhistory[j].type = updateInfo.type as TransactionDirection;
            this.txArrayToDisplay.txhistory[j].inputs = updateInfo.inputs;
            this.txArrayToDisplay.txhistory[j].outputs = updateInfo.outputs;
            updateArray = true;
          } else {
            this.txArrayToDisplay.txhistory.splice(j, 1);
            totalMergeTxCount++;
          }
        }
      }
    }
    this.txArrayToDisplay.totalcount -= totalMergeTxCount;
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
}
