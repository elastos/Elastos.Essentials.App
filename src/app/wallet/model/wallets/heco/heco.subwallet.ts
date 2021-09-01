import { StandardSubWallet } from '../standard.subwallet';
import BigNumber from 'bignumber.js';
import { Config } from '../../../config/Config';
import Web3 from 'web3';
import { ElastosPaginatedTransactions, TransactionDirection, ElastosTransaction, TransactionInfo, TransactionStatus, TransactionType } from '../../transaction.types';
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
import { HecoAPI, HecoApiType } from './heco.api';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';

/**
 * Specialized standard sub wallet for the HECO sidechain.
 */
export class HECOChainSubWallet extends StandardEVMSubWallet {
  constructor(networkWallet: NetworkWallet) {
    super(networkWallet, StandardCoinName.ETHHECO, HecoAPI.getApiUrl(HecoApiType.RPC));

    void this.initialize();
  }

  protected async initialize() {
    await super.initialize();
  }

  public getMainIcon(): string {
    return "assets/wallet/networks/hecochain.png";
  }

  public getSecondaryIcon(): string {
    return null
  }

  public getFriendlyName(): string {
    return "Huobi Token";
  }

  public getDisplayTokenName(): string {
    return "HT";
  }

  /* protected async getTransactionsByRpc() {
    Logger.log('wallet', 'getTransactionByRPC (Heco):', this.masterWallet.id, ' ', this.id)
    const address = await this.getTokenAddress();
    let result = await this.getHECOTransactions(this.id as StandardCoinName, address);
    if (result) {
      if (this.paginatedTransactions == null) {
        // init
        this.paginatedTransactions = { totalcount: 0, txhistory: [] };
      }
      if ((result.length > 0) && (this.paginatedTransactions.totalcount !== result.length)) {
        // Has new transactions.
        this.paginatedTransactions.totalcount = result.length;
        this.paginatedTransactions.txhistory = result.reverse();
        await this.saveTransactions(this.paginatedTransactions.txhistory as EthTransaction[]);
      } else {
        // Notify the page to show the right time of the transactions even no new transaction.
        this.masterWallet.walletManager.subwalletTransactionStatus.set(this.subwalletTransactionStatusID, this.paginatedTransactions.txhistory.length)
      }
    }
  } */

  private async getHECOTransactions(chainID: StandardCoinName, address: string, begBlockNumber = 0, endBlockNumber = 0): Promise<EthTransaction[]> {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
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
  }

  public async getTransactionDetails(txid: string): Promise<EthTransaction> {
    let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(HecoAPI.getApiUrl(HecoApiType.RPC), txid);
    if (!result) {
      // Remove error transaction.
      // TODO await this.removeInvalidTransaction(txid);
    }
    return result;
  }

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
    return await '';
  }
}
