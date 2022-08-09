import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { TokenType } from "../../../coin";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { ERCTokenInfo, EthTokenTransaction, EthTransaction } from "../evm.types";
import { ERC20SubWallet } from "../subwallets/erc20.subwallet";
import { MainCoinEVMSubWallet } from "../subwallets/evm.subwallet";
import { EtherscanHelper } from "./etherscan.helper";

const MAX_RESULTS_PER_FETCH = 30

export  enum FetchMode {
  FetchMode_TokenTx = 0, // Account api only support tokentx action.
  FetchMode_TokenTx_NftTx = 1, // Account api support tokentx and tokennfttx actions.
  FetchMode_TokenTx_NftTx_1155Tx = 2 // Account api support tokentx, tokennfttx and token1155tx actions.
}

enum AcountAction {
  ERC20 = 'tokentx',
  ERC721 = 'tokennfttx',
  ERC1152 = 'token1155tx'
}

export class EtherscanEVMSubWalletTokenProvider<SubWalletType extends MainCoinEVMSubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
  protected canFetchMore = true;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, private fetchMode: FetchMode = FetchMode.FetchMode_TokenTx, private apiKey?: string) {
    super(provider, subWallet);

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    provider.refreshEvery(() => this.fetchAllTokensTransactions(), 30000);
  }

  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress.toLowerCase() + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: transaction.contractAddress
    };
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.canFetchMore;
  }

  public async fetchTransactions(erc20SubWallet: ERC20SubWallet, afterTransaction?: EthTransaction): Promise<void> {
    let page = 1;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      let afterTransactionIndex = (await this.getTransactions(erc20SubWallet)).findIndex(t => t.hash === afterTransaction.hash);
      if (afterTransactionIndex) { // Just in case, should always be true but...
        // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
        // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
        page = 1 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
      }
    }

    const accountAddress = (await this.subWallet.getCurrentReceiverAddress()).toLowerCase();
    const contractAddress = erc20SubWallet.coin.getContractAddress().toLowerCase();

    let { transactions, canFetchMore } = await EtherscanHelper.fetchTokenTransactions(
      this.subWallet,
      this.subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN),
      accountAddress,
      contractAddress,
      page,
      MAX_RESULTS_PER_FETCH);

    this.canFetchMore = canFetchMore;
    await this.saveTransactions(transactions);
  }

  public async fetchAllTokensTransactions(): Promise<void> {
    let tokenSubWallet = this.subWallet;
    const address = await tokenSubWallet.getTokenAddress();
    let totalTokens = [];

    let tokenTransactions = await this.getTokenTransferEventsByAction(address, AcountAction.ERC20, 0);
    if (tokenTransactions) {
      let tokens = await this.getERCTokensFromTransferEvents(tokenTransactions, TokenType.ERC_20);
      totalTokens = [...totalTokens, ...tokens];
    }

    if (this.fetchMode > FetchMode.FetchMode_TokenTx) {
      tokenTransactions = await this.getTokenTransferEventsByAction(address, AcountAction.ERC721, 0);
      if (tokenTransactions) {
        let tokens = await this.getERCTokensFromTransferEvents(tokenTransactions, TokenType.ERC_721);
        totalTokens = [...totalTokens, ...tokens];
      }
    }

    if (this.fetchMode > FetchMode.FetchMode_TokenTx_NftTx) {
      tokenTransactions = await this.getTokenTransferEventsByAction(address, AcountAction.ERC1152, 0);
      if (tokenTransactions) {
        let tokens = await this.getERCTokensFromTransferEvents(tokenTransactions, TokenType.ERC_1155);
        totalTokens = [...totalTokens, ...tokens];
      }
    }

    // Let the provider know what we have found
    await this.provider.onTokenInfoFound(totalTokens);
  }

  /**
   * Can not get the token list directly, So get the token list by token transfer events.
   */
  private async getERCTokensFromTransferEvents(transferEvents: EthTokenTransaction[], tokenType: TokenType) {
    let ercTokens: ERCTokenInfo[] = [];
    let ercTokenContractAddresss = [];
    let ercTokenHasOutgoTxContractAddresss = [];

    const accountAddress = await this.subWallet.getTokenAddress();
    for (let i = 0, len = transferEvents.length; i < len; i++) {
      if (-1 === ercTokenContractAddresss.indexOf(transferEvents[i].contractAddress)) {
        let hasOutgoTx = false;
        if (transferEvents[i].from) {
          hasOutgoTx = accountAddress === transferEvents[i].from.toLowerCase();
        }
        if (hasOutgoTx) {
          ercTokenHasOutgoTxContractAddresss.push(transferEvents[i].contractAddress);
        }
        ercTokenContractAddresss.push(transferEvents[i].contractAddress);
        let token: ERCTokenInfo = {
          balance: '',
          contractAddress: transferEvents[i].contractAddress,
          decimals: transferEvents[i].tokenDecimal,
          name: transferEvents[i].tokenName,
          symbol: transferEvents[i].tokenSymbol,
          type: tokenType,
          hasOutgoTx: hasOutgoTx,
        }
        ercTokens.push(token);
      } else {
        let hasOutgoTx = false;
        if (transferEvents[i].from) {
          hasOutgoTx = accountAddress === transferEvents[i].from.toLowerCase();
        }
        if (hasOutgoTx && (-1 === ercTokenHasOutgoTxContractAddresss.indexOf(transferEvents[i].contractAddress))) {
          ercTokenHasOutgoTxContractAddresss.push(transferEvents[i].contractAddress);
          const index = ercTokens.findIndex(token => token.contractAddress == transferEvents[i].contractAddress);
          ercTokens[index].hasOutgoTx = true;
        }
      }
    }
    //Logger.log('wallet', ' ERC20 Tokens:', ercTokens)
    return ercTokens;
  }

  private async getTokenTransferEventsByAction(address: string, action : AcountAction, startblock: number, endblock = 9999999999): Promise<EthTokenTransaction[]> {
    let tokensEventUrl = this.subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN)
       + '?module=account&action=' + action + '&address=' + address
      + '&startblock=' + startblock + '&endblock=' + endblock;

    if (this.apiKey)
      tokensEventUrl += '&apikey=' + this.apiKey;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(tokensEventUrl, this.subWallet.networkWallet.network.key);
      return result.result as EthTokenTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getTokenTransferEventsByAction error:', e)
      return [];
    }
  }
}