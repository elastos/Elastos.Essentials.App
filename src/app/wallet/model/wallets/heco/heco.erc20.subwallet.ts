import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { CoinID, StandardCoinName } from "../../Coin";
import { EthTransaction } from "../../evm.types";
import { ERC20SubWallet } from "../erc20.subwallet";
import { NetworkWallet } from "../networkwallet";
import { HecoAPI, HecoApiType } from "./heco.api";

/**
 * Subwallet for HRC20 tokens.
 */
export class HecoERC20SubWallet extends ERC20SubWallet {
  constructor(networkWallet: NetworkWallet, coinID: CoinID) {
    super(networkWallet, coinID, HecoAPI.getApiUrl(HecoApiType.RPC));

    this.elastosChainCode = StandardCoinName.ETHHECO;
  }

  public getMainIcon(): string {
    return "assets/wallet/networks/hecochain.png";
  }

  public getSecondaryIcon(): string {
    return "assets/wallet/coins/eth-purple.svg";
  }

  public getDisplayableERC20TokenInfo(): string {
    return "HRC20 Token";
  }

  protected async getTransactionsByRpc() {
    let transactionList = await this.getHECOTransactions();
    if (transactionList) {
      this.transactions = {totalcount:transactionList.length, txhistory:transactionList};
      await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
    }
  }

  //TODO: use page and offset.
  private async getHECOTransactions(page = 1, offset = 100): Promise<EthTransaction[]> {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    if (rpcApiUrl === null) {
      return null;
    }
    const contractAddress = this.coin.getContractAddress().toLowerCase();
    const tokenAccountAddress = await this.getTokenAccountAddress();
    let hecoTxlistUrl = rpcApiUrl + '/api?module=account&action=tokentx&contractaddress=' + contractAddress
            + '&address=' + tokenAccountAddress + '&sort=desc';// + '&page=' + page + '&offset=' + offset;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(hecoTxlistUrl);
      return result.result as EthTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getHECOTransactions error:', e)
    }
    return null;
  }
}
