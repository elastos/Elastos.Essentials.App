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
    return "assets/wallet/coins/eth-purple.svg";
  }

  public getSecondaryIcon(): string {
    return "assets/wallet/networks/hecochain.png";
  }

  public getDisplayableERC20TokenInfo(): string {
    return "HRC20 Token";
  }

  protected async getTransactionsByRpc() {
    const contractAddress = this.coin.getContractAddress().toLowerCase();
    const tokenAccountAddress = await this.getTokenAccountAddress();
    let result = await this.getHECOTransactions(this.elastosChainCode, tokenAccountAddress);
    if (result) {
      let allTx = result.filter((tx)=> {
        return tx.to === contractAddress || tx.contractAddress === contractAddress
      })
      this.transactions = {totalcount:allTx.length, txhistory:allTx.reverse()};
      // TODO:Parse the input data.

      await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
    }
  }

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

}