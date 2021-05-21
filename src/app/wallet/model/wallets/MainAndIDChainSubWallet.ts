import { StandardSubWallet } from './StandardSubWallet';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { AllTransactionsHistory, Transaction, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType, Utxo, UtxoForSDK, UtxoType } from '../Transaction';
import { TranslateService } from '@ngx-translate/core';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { JsonRPCService } from '../../services/jsonrpc.service';
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
  private txArray: AllTransactionsHistory = {totalcount:0, txhistory:[]};

  constructor(masterWallet: MasterWallet, id: StandardCoinName) {
    super(masterWallet, id);
  }

  public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
    // For performance
    let newTxList:AllTransactionsHistory = {
        totalcount: this.txArray.totalcount,
        txhistory :this.txArray.txhistory.slice(startIndex, startIndex + 20),
    }
    return newTxList;
    // return this.txArray; // It is slow to return all.
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
    // transactionInfo.confirmStatus = transaction.ConfirmStatus;

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

  /**
   * Get balance by RPC if the last block time of spvsdk is one day ago.
   */
  async getBalanceByRPC() {
    const currentTimestamp = moment().valueOf();
    const onedayago = moment().add(-1, 'days').valueOf();
    const oneHourago = moment().add(-10, 'minutes').valueOf();
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
    this.timestampRPC = currentTimestamp;

    Logger.test("wallet", 'TIMETEST getBalanceByRPC ', this.id, ' end');
    Logger.log("wallet", 'getBalanceByRPC totalBalance:', totalBalance.toString());
    Logger.log("wallet", this.masterWallet.id, ' ', this.id, ' timestampRPC:', this.timestampRPC);
    return true;
  }

  async getBalanceByAddress(internalAddress: boolean) {
    // If the balance of 5 consecutive request is 0, then stop the query.(100 addresses)
    const maxRequestTimesOfGetEmptyBalance = 5;
    let requestTimesOfGetEmptyBalance = 0;
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

        if (balance.lte(0)) {
          requestTimesOfGetEmptyBalance++;
          if (requestTimesOfGetEmptyBalance >= maxRequestTimesOfGetEmptyBalance) {
            requestAddressCount = startIndex;
            break;
          }
        } else {
          requestTimesOfGetEmptyBalance = 0;
        }
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
   *
   * @param jsonRPCService
   * @param timestamp get the transactions after the timestamp
   * @returns
   */
  async getTransactionByRPC(timestamp: number = 0) {
    Logger.test("wallet", 'TIMETEST getTransactionByRPC start:', this.id);
    const currentTimestamp = moment().valueOf();

    const externalTxList = await this.getTransactionByAddress(false, timestamp);

    this.txArray.totalcount = externalTxList.totalcount;
    this.txArray.txhistory = externalTxList.txhistory;


    // The Single Address Wallet should use the external address.
    if (!this.masterWallet.account.SingleAddress) {
      let txListInterna = await this.getTransactionByAddress(true, timestamp);
      if (txListInterna && txListInterna.txhistory.length > 0) {
        this.txArray.totalcount += txListInterna.totalcount;
        this.txArray.txhistory.push.apply(this.txArray.txhistory, txListInterna.txhistory);
      }
    }

    this.mergeTransactionListAndSort();

    // this.timestampRPC = currentTimestamp;
    Logger.test("wallet", 'TIMETEST getTransactionByRPC ', this.id, ' end');
    Logger.log("wallet", 'getTransactionByRPC end, total tx:', this.txArray);
    Logger.log("wallet", this.masterWallet.id, ' ', this.id, ' timestampRPC:', currentTimestamp);
    return true;
  }

  async getTransactionByAddress(internalAddress: boolean, timestamp: number = 0) {
    let requestAddressCount = 1;
    let startIndex = 0;
    let txListTotal:AllTransactionsHistory = {totalcount:0, txhistory:[]};

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
        requestAddressCount = startIndex;
        break;
      }
      startIndex += addressArray.Addresses.length;

      try {
        const txRawList = await this.jsonRPCService.getTransactionsByAddress(this.id as StandardCoinName, addressArray.Addresses, 50, timestamp);
        if (txRawList && txRawList.length > 0) {
          for (const result of txRawList) {
            txListTotal.totalcount += result.result.totalcount;
            txListTotal.txhistory.push.apply(txListTotal.txhistory, result.result.txhistory);
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

  async getTransactionDetails(txid:string) {
    // let details = await this.jsonRPCService.getrawtransaction(this.id as StandardCoinName, "3a9aff92bf1a1ef67c249b3763d72ea6c70cac1fc781acffebd03f55d0c8318a");
    let details = await this.jsonRPCService.getrawtransaction(this.id as StandardCoinName, txid);
    Logger.warn('wallet', 'test detail:', details)
    return details;
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

    // temp for test
    this.utxoArrayForSDK = [];
    for (const result of this.utxoArray) {
      let utxoForSDK: UtxoForSDK = {
          Address: result.address,
          Amount: (Math.round(parseFloat(result.amount) * Config.SELA)).toString(),
          Index: result.vout,
          TxHash: result.txid
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
    this.txArray.txhistory.sort(function (A, B) {
      return B.height - A.height;
    });
  }

  mergeTransactionList() {
    let allSentTx = this.txArray.txhistory.filter((tx)=> {
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
      let txWithSameTxId = this.txArray.txhistory.filter((tx) => {
        return tx.txid === sendtxidArray[i].txid;
      })

      let updateInfo = this.mergeTransactionsWithSameTxid(txWithSameTxId);

      let updateArray = false;
      for (let j = this.txArray.txhistory.length - 1; j >= 0; j--) {
        if ((this.txArray.txhistory[j].height == sendtxidArray[i].height)
          && (this.txArray.txhistory[j].txid == sendtxidArray[i].txid)) {
          if (!updateArray) {
            this.txArray.txhistory[j].value = updateInfo.value;
            this.txArray.txhistory[j].type = updateInfo.type as TransactionDirection;
            this.txArray.txhistory[j].inputs = updateInfo.inputs;
            updateArray = true;
          } else {
            this.txArray.txhistory.splice(j, 1);
            totalMergeTxCount++;
          }
        }
      }
    }
    this.txArray.totalcount -= totalMergeTxCount;
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

    for (let i = 0, len = sentOutputs.length ; i < len; i++) {
      if (recvAddress.indexOf(sentOutputs[i]) < 0) {
        isMoveTransaction = false;
        break;
      }
    }

    let value, type ='sent';
    if (isMoveTransaction) {
      value = '0', type = 'moved';
    } else {
      value = (sentValue - recvValue).toString();
    }

    return {value, type, inputs:sentInputs}
  }
}
