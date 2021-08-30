import { Config } from '../../../config/Config';
import { StandardCoinName } from '../../Coin';
import { Logger } from 'src/app/logger';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { NetworkWallet } from '../networkwallet';
import { EthTransaction } from '../../evm.types';
import { StandardEVMSubWallet } from '../evm.subwallet';
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
    let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForMisc(elastosChainCode);
    const rpcApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);
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
}
