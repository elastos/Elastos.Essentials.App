import { StandardSubWallet } from '../standard.subwallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../../config/Config';
import Web3 from 'web3';
import { AllTransactionsHistory, TransactionDirection, TransactionHistory, TransactionInfo, TransactionStatus, TransactionType } from '../../transaction.types';
import { StandardCoinName } from '../../Coin';
import { TranslateService } from '@ngx-translate/core';
import { EssentialsWeb3Provider } from "../../../../model/essentialsweb3provider";
import { Logger } from 'src/app/logger';
import moment from 'moment';
import { ElastosApiUrlType } from 'src/app/services/global.elastosapi.service';
import { ERC20SubWallet } from '../erc20.subwallet';
import { NetworkWallet } from '../networkwallet';
import { ERC20TokenInfo, EthTransaction, ERC20TokenTransactionInfo, ETHSCTransferType, EthTokenTransaction, SignedETHSCTransaction } from '../../evm.types';
import { StandardEVMSubWallet } from '../evm.subwallet';
import { GlobalNetworksService, MAINNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { BscAPI, BscApiType } from './bsc.api';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';

/**
 * Specialized standard sub wallet for the Binance chain.
 */
export class BscChainSubWallet extends StandardEVMSubWallet {
  constructor(networkWallet: NetworkWallet) {
    super(networkWallet, StandardCoinName.ETHBSC, BscAPI.getApiUrl(BscApiType.RPC));

    void this.initialize();
  }

  protected async initialize() {
    await super.initialize();
  }

  public getMainIcon(): string {
    return "assets/wallet/networks/bscchain.png";
  }

  public getSecondaryIcon(): string {
    return null
  }

  public getFriendlyName(): string {
    return "Binance Token";
  }

  public getDisplayTokenName(): string {
    return "BNB";
  }

  protected async getTransactionsByRpc() {
    /* TODO Logger.log('wallet', 'getTransactionByRPC (Bsc):', this.masterWallet.id, ' ', this.id)
    const address = await this.getTokenAddress();
    let result = await this.getHECOTransactions(this.id as StandardCoinName, address);
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
    } */
  }

  /* private async getHECOTransactions(chainID: StandardCoinName, address: string, begBlockNumber = 0, endBlockNumber = 0): Promise<EthTransaction[]> {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.RPC);
    if (rpcApiUrl === null) {
      return null;
    }
    let hecoTxlistUrl = rpcApiUrl + '/api?module=account&action=txlist&address=' + address;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(hecoTxlistUrl);
      return result.result as EthTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getHECOTransactions error:', e)
    }
    return null;
  } */

  public async getTransactionDetails(txid: string): Promise<EthTransaction> {
    let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(BscAPI.getApiUrl(BscApiType.RPC), txid);
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

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
    return await '';
  }
}
