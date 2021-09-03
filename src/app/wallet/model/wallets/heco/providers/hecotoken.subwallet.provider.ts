import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TokenType } from "../../../Coin";
import { ERCTokenInfo, EthTokenTransaction } from "../../../evm.types";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { HecoAPI, HecoApiType } from "../heco.api";
import { HECOChainSubWallet } from "../heco.subwallet";

export class HecoTokenSubWalletProvider extends EVMSubWalletTokenProvider<HECOChainSubWallet> {
  constructor(provider: TransactionProvider<any>, subWallet: HECOChainSubWallet) {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    super(provider, subWallet, rpcApiUrl);
  }

  public async fetchAllTokensTransactions(): Promise<void> {
    let tokenTransactions = await this.getHRC20TokenTransferEvents(0);
    let tokens = await this.getERCTokensFromTransferEvents(tokenTransactions);

    // Let the provider know what we have found
    this.provider.onTokenInfoFound(tokens);
  }

  /**
   * Can not get the token list directly, So get the token list by token transfer events.
   */
  private getERCTokensFromTransferEvents(transferEvents: EthTokenTransaction[]) {
    let ercTokens: ERCTokenInfo[] = [];
    let ercTokenSymbols = [];
    for (let i = 0, len = transferEvents.length; i < len; i++) {
      if (-1 === ercTokenSymbols.indexOf(transferEvents[i].tokenSymbol)) {
        ercTokenSymbols.push(transferEvents[i].tokenSymbol);
        let token: ERCTokenInfo = {
          balance: '',
          contractAddress: transferEvents[i].contractAddress,
          decimals: transferEvents[i].tokenDecimal,
          name: transferEvents[i].tokenName,
          symbol: transferEvents[i].tokenSymbol,
          type: TokenType.ERC_20,
        }
        ercTokens.push(token);
      }
    }
    Logger.log('wallet', ' HRC20 Tokens:', ercTokens)
    return ercTokens;
  }

  private async getHRC20TokenTransferEvents(startblock: number, endblock = 9999999999): Promise<EthTokenTransaction[]> {
    let tokenSubWallet = this.subWallet;
    const address = await tokenSubWallet.getTokenAddress();
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    if (rpcApiUrl === null) {
      return null;
    }
    let hecoTokensEventUrl = rpcApiUrl + '/api?module=account&action=tokentx&address=' + address
      + '&startblock=' + startblock + '&endblock=' + endblock;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(hecoTokensEventUrl);
      return result.result as EthTokenTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getHRC20TokenTransferEvents error:', e)
    }
  }
}