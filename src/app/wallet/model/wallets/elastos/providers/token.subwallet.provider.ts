import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { StandardCoinName } from "../../../coin";
import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { ERC20SubWallet } from "../../erc20.subwallet";
import { AnySubWallet } from "../../subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";

const MAX_RESULTS_PER_FETCH = 30

export class ElastosTokenSubWalletProvider extends SubWalletTransactionProvider<EscSubWallet, EthTransaction> {
  private canFetchMore = true;

  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress.toLowerCase() + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: transaction.contractAddress
    };
  }

  /**
   * For now, the elastos network gets tokens only from the ESC chain, not from EID.
   */
  public async discoverTokens(): Promise<void> {
    let tokenSubWallet = this.subWallet;
    const address = await tokenSubWallet.getTokenAddress();

    try {
      let tokenList = await GlobalElastosAPIService.instance.getERC20TokenList(StandardCoinName.ETHSC, address);

      // Let the provider know what we have found
      await this.provider.onTokenInfoFound(tokenList);
    }
    catch (e) {
      // Potential network error
      Logger.warn("wallet", "Elastos token discovery failed", e);
    }
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

    let apiurltype = GlobalElastosAPIService.instance.getApiUrlTypeForBrowser(this.subWallet.id);
    const accountApiUrl = GlobalElastosAPIService.instance.getApiUrl(apiurltype);

    const contractAddress = erc20SubWallet.coin.getContractAddress().toLowerCase();
    const accountAddress = await this.subWallet.createAddress();
    let txListUrl = accountApiUrl + '?module=account';
    txListUrl += '&action=tokentx';
    txListUrl += '&page=' + page;
    txListUrl += '&offset=' + MAX_RESULTS_PER_FETCH;
    txListUrl += '&sort=desc';
    txListUrl += '&contractaddress=' + contractAddress;
    txListUrl += '&address=' + accountAddress;

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(txListUrl);
      let transactions = result.result as EthTransaction[];

      if (transactions.length < MAX_RESULTS_PER_FETCH) {
        // Got less results than expected: we are at the end of what we can fetch. remember this
        // (in memory only)
        this.canFetchMore = false;
      } else {
        this.canFetchMore = true;
      }

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'ElastosTokenSubWalletProvider fetchTransactions error:', e)
    }
  }
}