import { StandardSubWallet } from './StandardSubWallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, ERC20TokenInfo, EthTransaction, SignedETHSCTransaction, TransactionDirection, TransactionHistory, TransactionInfo, TransactionStatus, TransactionType } from '../Transaction';
import { StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ETHChainSubWallet extends StandardSubWallet {
    private ethscAddress: string = null;
    private withdrawContractAddress: string = null;
    private publishdidContractAddress: string = null;
    private web3 = null;
    // private erc20ABI: any;

    private tokenList: ERC20TokenInfo[] = null;

    constructor(masterWallet: MasterWallet, id: StandardCoinName) {
        super(masterWallet, id);

        this.initialize();
    }

    private async initialize() {

        this.initWeb3();
        // this.erc20ABI = require( "../../../../assets/wallet/ethereum/StandardErc20ABI.json");
        await this.loadTransactionsFromCache();

        switch (this.id) {
          case StandardCoinName.ETHSC:
            this.withdrawContractAddress = Config.ETHSC_WITHDRAW_ADDRESS.toLowerCase();
          break;
          case StandardCoinName.ETHDID:
            this.withdrawContractAddress = Config.ETHDID_WITHDRAW_ADDRESS.toLowerCase();
            this.publishdidContractAddress = Config.ETHDID_CONTRACT_ADDRESS.toLowerCase();
          break;
          default:
            Logger.warn('wallet', 'The ', this.id, ' does not set the contract address!');
          break;
        }

        setTimeout(async () => {
          this.updateBalance();
        }, 3000);
    }

    public async getTokenAddress(): Promise<string> {
        if (!this.ethscAddress) {
            this.ethscAddress = (await this.createAddress()).toLowerCase();
        }
        return this.ethscAddress;
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
      if (this.transactions == null) {
        await this.getTransactionsByRpc();
        this.loadTxDataFromCache = false;
      } else {
        this.loadTxDataFromCache = true;
      }

      if (this.transactions) {
        // For performance, only return 20 transactions.
        let newTxList:AllTransactionsHistory = {
            totalcount: this.transactions.totalcount,
            txhistory :this.transactions.txhistory.slice(startIndex, startIndex + 20),
        }
        if (startIndex == 0 && this.transactionsInPool.length > 0) {
            let newTxhistory = this.transactionsInPool.concat(newTxList.txhistory);
            newTxList.txhistory = newTxhistory;
            newTxList.totalcount += this.transactionsInPool.length;
        }
        return newTxList;
      }
      else {
        return null;
      }
    }

    public async getTransactionsByRpc() {
      Logger.log('wallet', 'getTransactionByRPC:', this.masterWallet.id, ' ', this.id)
      const address = await this.getTokenAddress();
      let result = await this.jsonRPCService.getETHSCTransactions(this.id as StandardCoinName, address);
      if (result) {
        if (this.transactions == null) {
          // init
          this.transactions = {totalcount:0, txhistory:[]};
        }
        if (result.length > 0) {
          // Has new transactions.
          if (this.transactions.totalcount !== result.length) {
            this.transactions.totalcount = result.length;
            this.transactions.txhistory = result.reverse();
            this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
          }
        }
      }
    }

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
      let result = await this.jsonRPCService.eth_getTransactionByHash(this.id as StandardCoinName, txid);
      return result;
    }

    /**
     * Use smartcontract to Send ELA from ETHSC to mainchain.
     */
    public getWithdrawContractAddress() {
        return this.withdrawContractAddress;
    }

    public async getTransactionInfo(transaction: EthTransaction, translate: TranslateService): Promise<TransactionInfo> {
        if (transaction.isError && transaction.isError != '0') {
          return null;
        }

        const timestamp = parseInt(transaction.timeStamp) * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(new Date(timestamp)).startOf('minutes').fromNow();

        const direction = await this.getETHSCTransactionDirection(transaction.to);
        transaction.Direction = direction;

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(-1), // Defined by inherited classes
            confirmStatus: parseInt(transaction.confirmations), // Defined by inherited classes
            datetime,
            direction: direction,
            fee: '0',
            height: parseInt(transaction.blockNumber),
            memo: '',
            name: await this.getTransactionName(transaction, translate),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: transaction.Status,
            statusName: this.getTransactionStatusName(transaction.Status, translate),
            symbol: '', // Defined by inherited classes
            timestamp,
            txid: transaction.hash, // Defined by inherited classes
            type: null, // Defined by inherited classes
        };

        transactionInfo.amount = new BigNumber(transaction.value).dividedBy(Config.WEI);
        transactionInfo.fee = new BigNumber(transaction.gas).multipliedBy(new BigNumber(transaction.gasPrice)).dividedBy(Config.WEI).toString();

        if (transactionInfo.confirmStatus !== 0) {
            transactionInfo.status = TransactionStatus.CONFIRMED;
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-confirmed");
        } else {
            transactionInfo.status = TransactionStatus.PENDING;
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-pending");
        }

        // MESSY again - No "Direction" field in ETH transactions (contrary to other chains). Calling a private method to determine this.
        if (direction === TransactionDirection.RECEIVED) {
            transactionInfo.type = TransactionType.RECEIVED;
            transactionInfo.symbol = '+';
        } else if (direction === TransactionDirection.SENT) {
            transactionInfo.type = TransactionType.SENT;
            transactionInfo.symbol = '-';
        } else if (direction === TransactionDirection.MOVED) {
            transactionInfo.type = TransactionType.TRANSFER;
            transactionInfo.symbol = '';
        }

        return transactionInfo;
    }

    protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getETHSCTransactionDirection(transaction.to);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                return "wallet.coin-op-received-token";
            case TransactionDirection.SENT:
                return this.getETHSCTransactionContractType(transaction, translate);
        }
        return null;
    }

    protected async getTransactionIconPath(transaction: EthTransaction): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getETHSCTransactionDirection(transaction.to);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                return './assets/wallet/buttons/receive.png';
            case TransactionDirection.SENT:
                return './assets/wallet/buttons/send.png';
        }
    }

    private async getETHSCTransactionDirection(targetAddress: string): Promise<TransactionDirection> {
        const address = await this.getTokenAddress();
        if (address === targetAddress.toLowerCase()) {
            return TransactionDirection.RECEIVED;
        } else {
            return TransactionDirection.SENT;
        }
    }

    private isERC20TokenTransfer(toAddress: string) {
      if (this.tokenList == null) return false;

      for (let i = 0, len = this.tokenList.length; i < len; i++) {
        if (this.tokenList[i].contractAddress.toLowerCase() === toAddress) {
          return true;
        }
      }
      return false;
    }

    private getETHSCTransactionContractType(transaction: EthTransaction, translate: TranslateService): string {
        let toAddressLowerCase = transaction.to.toLowerCase();
        if (this.isERC20TokenTransfer(toAddressLowerCase)) {
            return "wallet.coin-op-contract-token-transfer";
        } else if (toAddressLowerCase === this.withdrawContractAddress) {
            // withdraw to MainChain
            return "wallet.coin-dir-to-mainchain";
        } else if ((this.id === StandardCoinName.ETHDID) && (toAddressLowerCase === this.publishdidContractAddress)) {
            // publish did
            return "wallet.coin-op-identity";
        } else if (toAddressLowerCase === '') {
            return "wallet.coin-op-contract-create";
        } else if (toAddressLowerCase === '0x0000000000000000000000000000000000000000') {
          return "wallet.coin-op-contract-destroy";
        } else if (transaction.value !== '0') {
            return "wallet.coin-op-sent-token";
        } else {
            return "wallet.coin-op-contract-call";
        }
    }

    private async initWeb3() {
        let urlType;
        if (this.id === StandardCoinName.ETHDID) {
          urlType = ElastosApiUrlType.EID_RPC;
        } else {
          urlType = ElastosApiUrlType.ETHSC_RPC;
        }
        const trinityWeb3Provider = new EssentialsWeb3Provider(urlType);
        this.web3 = new Web3(trinityWeb3Provider);
    }

    private async getBalanceByWeb3(): Promise<BigNumber> {
        const address = await this.getTokenAddress();
        try {
          const balanceString = await this.web3.eth.getBalance(address);
          return new BigNumber(balanceString).dividedBy(10000000000); // WEI to SELA;
        }
        catch (e) {
          Logger.error('wallet', 'getBalanceByWeb3 exception:', e);
          return new BigNumber(NaN);
        }
    }

    public async update() {
      await this.updateBalance();
      await this.getTransactionsByRpc();
    }

    public async updateBalance(): Promise<void> {
        // this.balance = await this.getBalanceByWeb3();
        const address = await this.getTokenAddress();
        const balance = await this.jsonRPCService.eth_getBalance(this.id as StandardCoinName, address);
        if (balance) {
          this.balance = balance;
          this.saveBalanceToCache();
        }
    }

    public async getERC20TokenList(): Promise<ERC20TokenInfo[]> {
        const address = await this.getTokenAddress();
        this.tokenList = await this.jsonRPCService.getERC20TokenList(this.id as StandardCoinName, address);
        return this.tokenList;
    }

    /**
     * Check whether the available balance is enough.
     * @param amount
     */
    public async isAvailableBalanceEnough(amount: BigNumber) {
      return this.balance.gt(amount);
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<string> {
      let nonce = await this.getNonce();
      Logger.log('wallet', 'createPaymentTransaction amount:', amount, ' nonce:', nonce)
      return this.masterWallet.walletManager.spvBridge.createTransfer(
            this.masterWallet.id,
            this.id,
            toAddress,
            amount.toString(),
            6, // ETHER_ETHER
            nonce
        );
    }

    /*
    //Use createTransferGeneric for createPaymentTransaction
    public async createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<any> {
      const tokenAccountAddress = await this.getTokenAddress();
      const withdrawContractAddress = this.withdrawContractAddress;
      const erc20Contract = new this.web3.eth.Contract(this.erc20ABI, withdrawContractAddress, { from: tokenAccountAddress });
      const gasPrice = await this.web3.eth.getGasPrice();

      Logger.warn('wallet', 'createPaymentTransaction toAddress:', toAddress, ' amount:', amount, 'gasPrice:', gasPrice);

      // Convert the Token amount (ex: 20 TTECH) to contract amount (=token amount (20) * 10^decimals)
      // const amountWithDecimals = new BigNumber(amount).multipliedBy(this.tokenAmountMulipleTimes);
      const amountWithDecimals = this.web3.utils.toWei(amount.toString());

      // Incompatibility between our bignumber lib and web3's BN lib. So we must convert by using intermediate strings
      const web3BigNumber = this.web3.utils.toBN(amountWithDecimals.toString(10));
      const method = erc20Contract.methods.transfer(toAddress, web3BigNumber);

      let gasLimit = 100000;
      try {
          // Estimate gas cost
          gasLimit = await method.estimateGas();
      } catch (error) {
          Logger.log('wallet', 'estimateGas error:', error);
      }

      let nonce = await this.getNonce();
      Logger.warn('wallet', 'createPaymentTransaction nonce:', nonce);
      const rawTx =
      await this.masterWallet.walletManager.spvBridge.createTransferGeneric(
          this.masterWallet.id,
          this.id,
          withdrawContractAddress,
          '0',
          0, // WEI
          gasPrice,
          0, // WEI
          gasLimit.toString(),
          method.encodeABI(),
          nonce
      );

      Logger.warn ('wallet', 'createPaymentTransaction transaction:', rawTx);

      return rawTx;
    }
    */

    public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
        const contractAbi = require("../../../../assets/wallet/ethereum/ETHSCWithdrawABI.json");
        const ethscWithdrawContract = new this.web3.eth.Contract(contractAbi, this.withdrawContractAddress);
        const gasPrice = await this.web3.eth.getGasPrice();
        // const gasPrice = '1000000000';
        const toAmountSend = this.web3.utils.toWei(toAmount.toString());

        const method = ethscWithdrawContract.methods.receivePayload(toAddress, toAmountSend, Config.ETHSC_WITHDRAW_GASPRICE);
        const gasLimit = 100000;
        // TODO: The value from estimateGas is too small sometimes (eg 22384) for withdraw transaction.
        // Maybe it is the bug of node?
        // try {
        //     // Estimate gas cost
        //     gasLimit = await method.estimateGas();
        // } catch (error) {
        //     Logger.log('wallet', 'estimateGas error:', error);
        // }
        const data = method.encodeABI();
        let nonce = await this.getNonce();
        Logger.log('wallet', 'createWithdrawTransaction gasPrice:', gasPrice.toString(), ' toAmountSend:', toAmountSend, ' nonce:', nonce, ' withdrawContractAddress:', this.withdrawContractAddress);

        return this.masterWallet.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            this.id,
            this.withdrawContractAddress,
            toAmountSend,
            0, // WEI
            gasPrice,
            0, // WEI
            gasLimit.toString(),
            data,
            nonce
        );
    }

    public async createIDTransaction(payload: string): Promise<string> {
      const contractAbi = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "data",
              "type": "string"
            }
          ],
          "name": "publishDidTransaction",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];

      const publishDIDContract = new this.web3.eth.Contract(contractAbi, Config.ETHDID_CONTRACT_ADDRESS);
      const gasPrice = await this.web3.eth.getGasPrice();
      const method = publishDIDContract.methods.publishDidTransaction(payload);
      let gasLimit = 200000;
      try {
          // Estimate gas cost
          gasLimit = await method.estimateGas();
          Logger.log('wallet', 'estimateGas :', gasLimit);
      } catch (error) {
          Logger.warn('wallet', 'estimateGas error:', error);
      }
      const data = method.encodeABI();
      let nonce = await this.getNonce();
      Logger.log('wallet', 'createIDTransaction gasPrice:', gasPrice.toString(), ' nonce:', nonce, ' withdrawContractAddress:', Config.ETHDID_CONTRACT_ADDRESS);
      return this.masterWallet.walletManager.spvBridge.createTransferGeneric(
          this.masterWallet.id,
          this.id,
          Config.ETHDID_CONTRACT_ADDRESS,
          '0',
          0, // WEI
          gasPrice,
          0, // WEI
          gasLimit.toString(),
          data,
          nonce
      );
  }

    public async publishTransaction(transaction: string): Promise<string> {
      let obj = JSON.parse(transaction) as SignedETHSCTransaction;
      let txid = await this.jsonRPCService.eth_sendRawTransaction(this.id as StandardCoinName, obj.TxSigned);
      return txid;
    }

    /**
     * Returns the current gas price on chain.
     */
    public getGasPrice(): Promise<BigNumber> {
        return this.web3.eth.getGasPrice();
    }

    public async getNonce() {
      const address = await this.getTokenAddress();
      try {
        return this.jsonRPCService.getETHSCNonce(this.id as StandardCoinName, address);
      }
      catch (err) {
        Logger.error('wallet', 'getNonce failed, ', this.id, ' error:', err);
      }
      return -1;
    }

    public saveTransactions(transactionsList: EthTransaction[]) {
      for (let i = 0, len = transactionsList.length; i < len; i++) {
        this.transactionsCache.set(transactionsList[i].hash, transactionsList[i], parseInt(transactionsList[i].timeStamp));
      }
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
      this.transactionsCache.save();
    }
}
