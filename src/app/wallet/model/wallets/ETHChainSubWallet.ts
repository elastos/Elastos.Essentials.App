import { StandardSubWallet } from './StandardSubWallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, EthTransaction, SignedETHSCTransaction, TransactionDirection, TransactionHistory, TransactionInfo, TransactionType } from '../Transaction';
import { CoinID, StandardCoinName } from '../Coin';
import { MasterWallet } from './MasterWallet';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';

declare let walletManager: WalletPlugin.WalletManager;

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ETHChainSubWallet extends StandardSubWallet {
    private ethscAddress: string = null;
    private web3 = null;

    private txArrayToDisplay: AllTransactionsHistory = null;
    private tokenList: WalletPlugin.ERC20TokenInfo[] = null;

    private loadTxDataFromCache = false;

    constructor(masterWallet: MasterWallet, id: StandardCoinName) {
        super(masterWallet, id);

        this.initWeb3();
        this.updateBalance();
    }

    public async getTokenAddress(): Promise<string> {
        if (!this.ethscAddress) {
            this.ethscAddress = (await this.createAddress()).toLowerCase();
        }
        return this.ethscAddress;
    }

    public async getTransactions(startIndex: number): Promise<AllTransactionsHistory> {
      if (this.txArrayToDisplay == null) {
        await this.getTransactionsByRpc();
        this.loadTxDataFromCache = false;
      } else {
        this.loadTxDataFromCache = true;
      }

      // For performance, only return 20 transactions.
      let newTxList:AllTransactionsHistory = {
          totalcount: this.txArrayToDisplay.totalcount,
          txhistory :this.txArrayToDisplay.txhistory.slice(startIndex, startIndex + 20),
      }
      return newTxList;
    }

    public isLoadTxDataFromCache() {
      return this.loadTxDataFromCache;
    }

    public async getTransactionsByRpc() {
      Logger.log('wallet', 'getTransactionByRPC:', this.masterWallet.id, ' ', this.id)
      const address = await this.getTokenAddress();
      let result = await this.jsonRPCService.getETHSCTransactions(this.id as StandardCoinName, address);
      if (result) {
        if (this.txArrayToDisplay == null) {
          // init
          this.txArrayToDisplay = {totalcount:0, txhistory:[]};
        }
        if (result.length > 0) {
          this.txArrayToDisplay.totalcount = result.length;
          this.txArrayToDisplay.txhistory = result.reverse();
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
        return Config.ETHSC_CONTRACT_ADDRESS;
    }

    public async getTransactionInfo(transaction: EthTransaction, translate: TranslateService): Promise<TransactionInfo> {
        if (transaction.isError != '0') {
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
            transactionInfo.status = 'Confirmed';
            transactionInfo.statusName = translate.instant("wallet.coin-transaction-status-confirmed");
        } else {
            transactionInfo.status = 'Pending';
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
        } else if (toAddressLowerCase === Config.ETHSC_CONTRACT_ADDRESS.toLowerCase()) {
            // withdraw to MainChain
            return "wallet.coin-dir-to-mainchain";
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
        const trinityWeb3Provider = new EssentialsWeb3Provider();
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
        this.balance = await this.jsonRPCService.eth_getBalance(this.id as StandardCoinName, address);
    }

    public async getERC20TokenList(): Promise<WalletPlugin.ERC20TokenInfo[]> {
        const address = await this.getTokenAddress();
        this.tokenList = await walletManager.getERC20TokenList(address);
        Logger.log('wallet', 'getERC20TokenList:', this.tokenList);
        return this.tokenList;
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string): Promise<string> {
      let nonce = await this.getNonce();
      return this.masterWallet.walletManager.spvBridge.createTransfer(
            this.masterWallet.id,
            toAddress,
            amount.toString(),
            6, // ETHER_ETHER
            nonce
        );
    }

    public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
        const provider = new EssentialsWeb3Provider();
        const web3 = new Web3(provider);

        const contractAbi = require("../../../../assets/wallet/ethereum/ETHSCWithdrawABI.json");
        const contractAddress = Config.ETHSC_CONTRACT_ADDRESS;
        const ethscWithdrawContract = new web3.eth.Contract(contractAbi, contractAddress);
        const gasPrice = await web3.eth.getGasPrice();
        const toAmountSend = web3.utils.toWei(toAmount.toString());

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
        return this.masterWallet.walletManager.spvBridge.createTransferGeneric(
            this.masterWallet.id,
            contractAddress,
            toAmountSend,
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
}
