import { StandardSubWallet } from '../standard.subwallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, ERC20TokenInfo, ERC20TokenTransactionInfo, ETHSCTransferType, EthTokenTransaction, EthTransaction, SignedETHSCTransaction, TransactionDirection, TransactionHistory, TransactionInfo, TransactionStatus, TransactionType } from '../../Transaction';
import { StandardCoinName } from '../../Coin';
import { MasterWallet } from '../masterwallet';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';
import { ERC20SubWallet } from '../erc20.subwallet';
import { NetworkWallet } from '../NetworkWallet';

/**
 * Specialized standard sub wallet for the HECO sidechain.
 */
export class HECOChainSubWallet extends StandardSubWallet {
    private ethscAddress: string = null;
    private withdrawContractAddress: string = null;
    private publishdidContractAddress: string = null;
    private web3 = null;
    // private erc20ABI: any;

    private tokenList: ERC20TokenInfo[] = null;

    constructor(networkWallet: NetworkWallet, id: StandardCoinName) {
        super(networkWallet, id);

        void this.initialize();
    }

    private async initialize() {
        await this.initWeb3();
        // this.erc20ABI = require( "../../../../assets/wallet/ethereum/StandardErc20ABI.json");
        await this.loadTransactionsFromCache();

        // TODO
        // switch (this.id) {
        //   case StandardCoinName.ETHSC:
        //     this.withdrawContractAddress = Config.ETHSC_WITHDRAW_ADDRESS.toLowerCase();
        //   break;
        //   case StandardCoinName.ETHDID:
        //     this.withdrawContractAddress = Config.ETHDID_WITHDRAW_ADDRESS.toLowerCase();
        //     this.publishdidContractAddress = Config.ETHDID_CONTRACT_ADDRESS.toLowerCase();
        //   break;
        //   default:
        //     Logger.warn('wallet', 'The ', this.id, ' does not set the contract address!');
        //   break;
        // }

        setTimeout(() => {
          void this.updateBalance();
        }, 2000);
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
        return newTxList;
      }
      else {
        return null;
      }
    }

    public async getTransactionsByRpc() {
      Logger.log('wallet', 'getTransactionByRPC:', this.networkWallet.masterWallet.id, ' ', this.id)
      const address = await this.getTokenAddress();
      let result = await this.jsonRPCService.getHECOTransactions(this.id as StandardCoinName, address);
      if (result) {
        if (this.transactions == null) {
          // init
          this.transactions = {totalcount:0, txhistory:[]};
        }
        if ((result.length > 0) && (this.transactions.totalcount !== result.length)) {
            // Has new transactions.
            this.transactions.totalcount = result.length;
            this.transactions.txhistory = result.reverse();
            await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
        } else {
          // Notify the page to show the right time of the transactions even no new transaction.
          this.networkWallet.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
        }
      }
    }

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
      let result = await this.jsonRPCService.eth_getTransactionByHash(this.id as StandardCoinName, txid);
      if (!result) {
        // Remove error transaction.
        await this.removeInvalidTransaction(txid);
      }
      return result;
    }

    /**
     * Use smartcontract to Send ELA from ETHSC to mainchain.
     */
    // public getWithdrawContractAddress() {
    //     return this.withdrawContractAddress;
    // }

    public async getTransactionInfo(transaction: EthTransaction, translate: TranslateService): Promise<TransactionInfo> {
        if (transaction.isError && transaction.isError != '0') {
          return null;
        }

        transaction.to = transaction.to.toLowerCase();

        const timestamp = parseInt(transaction.timeStamp) * 1000; // Convert seconds to use milliseconds
        const datetime = timestamp === 0 ? translate.instant('wallet.coin-transaction-status-pending') : moment(new Date(timestamp)).startOf('minutes').fromNow();

        const direction = await this.getETHSCTransactionDirection(transaction.to);
        transaction.Direction = direction;

        const isERC20TokenTransfer = await this.isERC20TokenTransfer(transaction.to);
        transaction.isERC20TokenTransfer = isERC20TokenTransfer;
        let erc20TokenTransactionInfo: ERC20TokenTransactionInfo = null;
        if (isERC20TokenTransfer) {
          erc20TokenTransactionInfo = this.getERC20TokenTransactionInfo(transaction)
        }

        const transactionInfo: TransactionInfo = {
            amount: new BigNumber(-1),
            confirmStatus: parseInt(transaction.confirmations),
            datetime,
            direction: direction,
            fee: '0',
            height: parseInt(transaction.blockNumber),
            memo: '',
            name: await this.getTransactionName(transaction, translate),
            payStatusIcon: await this.getTransactionIconPath(transaction),
            status: transaction.Status,
            statusName: this.getTransactionStatusName(transaction.Status, translate),
            symbol: '',
            from: transaction.from,
            to: isERC20TokenTransfer ? erc20TokenTransactionInfo.to : transaction.to,
            timestamp,
            txid: transaction.hash,
            type: null,
            isCrossChain: false,
            erc20TokenSymbol: isERC20TokenTransfer ? erc20TokenTransactionInfo.tokenSymbol : null,
            erc20TokenValue: isERC20TokenTransfer ? erc20TokenTransactionInfo.tokenValue : null,
            erc20TokenContractAddress: isERC20TokenTransfer ? erc20TokenTransactionInfo.tokenContractAddress : null,
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

        // TODO improve it
        if ((transaction.transferType === ETHSCTransferType.DEPOSIT) || (transactionInfo.name === "wallet.coin-dir-to-mainchain")) {
          transactionInfo.isCrossChain = true;
        }

        return transactionInfo;
    }

    protected async getTransactionName(transaction: EthTransaction, translate: TranslateService): Promise<string> {
        const direction = transaction.Direction ? transaction.Direction : await this.getETHSCTransactionDirection(transaction.to);
        switch (direction) {
            case TransactionDirection.RECEIVED:
                if (transaction.transferType === ETHSCTransferType.DEPOSIT) {
                  return "wallet.coin-dir-from-mainchain";
                } else {
                  return "wallet.coin-op-received-token";
                }
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
        if (address === targetAddress) {
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

    private getERC20TokenTransactionInfo(transaction: EthTransaction): ERC20TokenTransactionInfo {
        let contractAddress = transaction.to;
        let toAddress = null, erc20TokenSymbol = null, erc20TokenValue = null;
        const erc20Coin = this.networkWallet.masterWallet.coinService.getERC20CoinByContracAddress(contractAddress);
        if (erc20Coin) {// erc20Coin is true normally.
          erc20TokenSymbol = erc20Coin.getName();
          // Get transaction from erc20 token subwallet.
          let erc20Subwallet : ERC20SubWallet = (this.networkWallet.getSubWallet(erc20Coin.getID()) as ERC20SubWallet);
          if (erc20Subwallet) {
            let erc20Tansaction: EthTokenTransaction = erc20Subwallet.getTransactionByHash(transaction.hash) as EthTokenTransaction;
            if (erc20Tansaction) {
              toAddress = erc20Tansaction.to;
              erc20TokenValue = erc20Subwallet.getDisplayValue(erc20Tansaction.value).toString();
            }
          }
        }

        if (!toAddress) {
          toAddress = transaction.to;
          contractAddress = null;
        }

        return {to: toAddress, tokenContractAddress: contractAddress, tokenSymbol: erc20TokenSymbol, tokenValue: erc20TokenValue}
    }

    private getETHSCTransactionContractType(transaction: EthTransaction, translate: TranslateService): string {
        let toAddressLowerCase = transaction.to.toLowerCase();

        if (transaction.isERC20TokenTransfer) {
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

    private initWeb3() {
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
          await this.saveBalanceToCache();
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
    public isAvailableBalanceEnough(amount: BigNumber) {
      return this.balance.gt(amount);
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<string> {
      let nonce = await this.getNonce();
      Logger.log('wallet', 'createPaymentTransaction amount:', amount, ' nonce:', nonce)
      return this.networkWallet.masterWallet.walletManager.spvBridge.createTransfer(
            this.networkWallet.masterWallet.id,
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
      return await '';
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
        Logger.log('wallet', "GAS PRICE: ", this.web3.eth.getGasPrice())
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

    public async saveTransactions(transactionsList: EthTransaction[]) {
      for (let i = 0, len = transactionsList.length; i < len; i++) {
        this.transactionsCache.set(transactionsList[i].hash, transactionsList[i], parseInt(transactionsList[i].timeStamp));
      }
      this.networkWallet.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
      await this.transactionsCache.save();
    }

    private async removeInvalidTransaction(hash: string) {
      let existingIndex = (this.transactions.txhistory as EthTransaction[]).findIndex(i => i.hash == hash);
      if (existingIndex >= 0) {
        Logger.warn('wallet', 'Find invalid transaction, remove it ', hash);
        this.transactions.txhistory.splice(existingIndex, 1);
        this.transactions.totalcount--;

        this.transactionsCache.remove(hash);
        this.networkWallet.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
        await this.transactionsCache.save();
      }
    }
}
