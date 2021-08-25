import BigNumber from 'bignumber.js';
import { Config } from '../../config/Config';
import Web3 from 'web3';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { ERC20SubWallet } from './erc20.subwallet';
import { CoinService } from 'src/app/wallet/services/coin.service';
import { NetworkWallet } from './networkwallet';
import { StandardSubWallet } from './standard.subwallet';
import { StandardCoinName } from '../coin';
import { ERC20TokenInfo, EthTransaction, ERC20TokenTransactionInfo, ETHSCTransferType, EthTokenTransaction, SignedETHSCTransaction } from '../evm.types';
import { AllTransactionsHistory, TransactionInfo, TransactionStatus, TransactionDirection, TransactionType } from '../transaction.types';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';

/**
 * Specialized standard sub wallet for EVM compatible chains (elastos EID, elastos ESC, heco, etc)
 */
export abstract class StandardEVMSubWallet extends StandardSubWallet {
    protected ethscAddress: string = null;
    protected withdrawContractAddress: string = null;
    protected publishdidContractAddress: string = null;
    protected web3 = null;
    // private erc20ABI: any;

    protected tokenList: ERC20TokenInfo[] = null;

    constructor(protected networkWallet: NetworkWallet, id: StandardCoinName, public rpcApiUrl: string) {
        super(networkWallet.masterWallet, id);

        void this.initialize();
    }

    protected async initialize() {
        this.initWeb3();
        // this.erc20ABI = require( "../../../../assets/wallet/ethereum/StandardErc20ABI.json");
        await this.loadTransactionsFromCache();

        setTimeout(() => {
          void this.updateBalance();
        }, 2000);
    }
/*
    // Get txpool information.
    private gettxpoolinfo() {
      this.web3.eth.extend({
        property: 'txpool',
        methods: [{
          name: 'content',
          call: 'txpool_content'
        },{
          name: 'inspect',
          call: 'txpool_inspect'
        },{
          name: 'status',
          call: 'txpool_status'
        }]
      });
      this.web3.eth.txpool.status().then( (result) => {
        Logger.log('wallet', 'txpool status:', this.id, result)
      })
      .catch( (error) => {
        Logger.error('wallet', 'txpool status error:', error)
      })

      this.web3.eth.txpool.content().then( (result) => {
        Logger.log('wallet', 'txpool content:', this.id, result)
      })
      .catch( (error) => {
        Logger.error('wallet', 'txpool content error:', error)
      })
    }
*/
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

    public async getTransactionDetails(txid: string): Promise<EthTransaction> {
      let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(this.rpcApiUrl, txid);
      if (!result) {
        // Remove error transaction.
        await this.removeInvalidTransaction(txid);
      }
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

    protected async getETHSCTransactionDirection(targetAddress: string): Promise<TransactionDirection> {
        const address = await this.getTokenAddress();
        if (address === targetAddress) {
            return TransactionDirection.RECEIVED;
        } else {
            return TransactionDirection.SENT;
        }
    }

    protected isERC20TokenTransfer(toAddress: string) {
      if (this.tokenList == null) return false;

      for (let i = 0, len = this.tokenList.length; i < len; i++) {
        if (this.tokenList[i].contractAddress.toLowerCase() === toAddress) {
          return true;
        }
      }
      return false;
    }

    protected getERC20TokenTransactionInfo(transaction: EthTransaction): ERC20TokenTransactionInfo {
        let contractAddress = transaction.to;
        let toAddress = null, erc20TokenSymbol = null, erc20TokenValue = null;
        const erc20Coin = CoinService.instance.getERC20CoinByContractAddress(contractAddress);
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

    protected getETHSCTransactionContractType(transaction: EthTransaction, translate: TranslateService): string {
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

    protected initWeb3() {
        const trinityWeb3Provider = new EssentialsWeb3Provider(this.rpcApiUrl);
        this.web3 = new Web3(trinityWeb3Provider);
    }

    protected async getBalanceByWeb3(): Promise<BigNumber> {
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
        const balance = await GlobalEthereumRPCService.instance.eth_getBalance(this.rpcApiUrl, address);
        if (balance) {
          this.balance = balance;
          await this.saveBalanceToCache();
        }
    }

    /**
     * Check whether the available balance is enough.
     * @param amount
     */
    public isAvailableBalanceEnough(amount: BigNumber) {
      return this.balance.gt(amount);
    }

    public async createPaymentTransaction(toAddress: string, amount: number, memo: string, gasPrice: string = null, gasLimit:string = null): Promise<string> {
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

    public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string, gasPriceArg: string, gasLimitArg: string): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const contractAbi = require("../../../../assets/wallet/ethereum/ETHSCWithdrawABI.json");
        const ethscWithdrawContract = new this.web3.eth.Contract(contractAbi, this.withdrawContractAddress);
        let gasPrice = gasPriceArg;
        if (gasPrice === null) {
          gasPrice = await this.getGasPrice();
        }
        // const gasPrice = '1000000000';
        const toAmountSend = this.web3.utils.toWei(toAmount.toString());

        const method = ethscWithdrawContract.methods.receivePayload(toAddress, toAmountSend, Config.ETHSC_WITHDRAW_GASPRICE);

        let gasLimit = gasLimitArg;
        if (gasLimit === null) {
          gasLimit = '100000';
        }
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
            gasLimit,
            data,
            nonce
        );
    }

    public async publishTransaction(transaction: string): Promise<string> {
      let obj = JSON.parse(transaction) as SignedETHSCTransaction;
      let txid = await GlobalEthereumRPCService.instance.eth_sendRawTransaction(this.rpcApiUrl, obj.TxSigned);
      return txid;
    }

    /**
     * Returns the current gas price on chain.
     */
    public async getGasPrice(): Promise<string> {
      const gasPrice = await this.web3.eth.getGasPrice();
      //Logger.log('wallet', "GAS PRICE: ", gasPrice)
      return gasPrice;
    }

    public async getNonce() {
      const address = await this.getTokenAddress();
      try {
        return GlobalEthereumRPCService.instance.getETHSCNonce(this.rpcApiUrl, address);
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
      this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
      await this.transactionsCache.save();
    }

    protected async removeInvalidTransaction(hash: string) {
      let existingIndex = (this.transactions.txhistory as EthTransaction[]).findIndex(i => i.hash == hash);
      if (existingIndex >= 0) {
        Logger.warn('wallet', 'Find invalid transaction, remove it ', hash);
        this.transactions.txhistory.splice(existingIndex, 1);
        this.transactions.totalcount--;

        this.transactionsCache.remove(hash);
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
        await this.transactionsCache.save();
      }
    }
}
