import { StandardSubWallet } from '../standard.subwallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, TransactionDirection, TransactionHistory, TransactionInfo, TransactionStatus, TransactionType } from '../../transaction.types';
import { StandardCoinName } from '../../Coin';
import { MasterWallet } from '../masterwallet';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { ERC20SubWallet } from '../erc20.subwallet';
import { CoinService } from 'src/app/wallet/services/coin.service';
import { NetworkWallet } from '../networkwallet';
import { ERC20TokenInfo, EthTransaction, ERC20TokenTransactionInfo, ETHSCTransferType, EthTokenTransaction } from '../../evm.types';
import { StandardEVMSubWallet } from '../evm.subwallet';
import { ElastosAPI } from './elastos.api';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';

/**
 * Specialized standard sub wallet for the ETH sidechain.
 */
export class ElastosEVMSubWallet extends StandardEVMSubWallet {
  constructor(networkWallet: NetworkWallet, id: StandardCoinName) {
    let rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(id);
    super(networkWallet, id, rpcApiUrl);

    void this.initialize();
  }

  public getMainIcon(): string {
    switch (this.id) {
      case StandardCoinName.IDChain:
      case StandardCoinName.ETHDID:
        return "assets/wallet/coins/ela-turquoise.svg";
      case StandardCoinName.ETHSC:
        return "assets/wallet/coins/ela-gray.svg";
      default:
        return null;
    }
  }

  public getSecondaryIcon(): string {
    return null;
  }

  public getFriendlyName(): string {
    if (this.id === StandardCoinName.ETHSC)
      return "Smart Chain";
    else if (this.id === StandardCoinName.ETHDID)
      return "Identity Chain";
    else
      return "";
  }

  public getDisplayTokenName(): string {
    if (this.id === StandardCoinName.ETHSC)
      return "ELA";
    else if (this.id === StandardCoinName.ETHDID)
      return "ELA";
    else
      return "";
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

  protected async getTransactionsByRpc() {
    Logger.log('wallet', 'getTransactionByRPC (elastos):', this.masterWallet.id, ' ', this.id)
    const address = await this.getTokenAddress();
    let result = await this.getETHSCTransactions(this.id as StandardCoinName, address);
    if (result) {
      if (this.transactions == null) {
        // init
        this.transactions = { totalcount: 0, txhistory: [] };
      }
      if ((result.length > 0) && (this.transactions.totalcount !== result.length)) {
        // Has new transactions.
        this.transactions.totalcount = result.length;
        this.transactions.txhistory = result.reverse();
        await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
      } else {
        // Notify the page to show the right time of the transactions even no new transaction.
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.transactions.txhistory.length)
      }
    }
  }

  public async getETHSCTransactions(elastosChainCode: StandardCoinName, address: string, begBlockNumber = 0, endBlockNumber = 0): Promise<EthTransaction[]> {
    let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(elastosChainCode);
    const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
    console.log("rpcApiUrl", rpcApiUrl);
    if (rpcApiUrl === null) {
        return null;
    }
    let ethscgethistoryurl = null;
    // Misc api
    // const ethscgethistoryurl = miscApiUrl + '/api/1/eth/history?address=' + address '&begBlockNumber=' + begBlockNumber
    // + '&endBlockNumber=' + endBlockNumber + '&sort=desc';
    ethscgethistoryurl = rpcApiUrl + '/api/1/eth/history?address=' + address;
    try {
        let result = await GlobalJsonRPCService.instance.httpGet(ethscgethistoryurl);
        return result.result as EthTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getETHSCTransactions error:', e)
    }
    return null;
  }

  public async getTransactionDetails(txid: string): Promise<EthTransaction> {
    let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(
      GlobalElastosAPIService.instance.getApiUrlForChainCode(this.id as StandardCoinName),
      txid);
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

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string, gasPriceArg: string, gasLimitArg: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contractAbi = require("../../../../../assets/wallet/ethereum/ETHSCWithdrawABI.json");
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
    const gasPrice = await this.getGasPrice();
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
    Logger.log('wallet', 'createIDTransaction gasPrice:', gasPrice.toString(), ' nonce:', nonce, ' ContractAddress:', Config.ETHDID_CONTRACT_ADDRESS);
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
}
