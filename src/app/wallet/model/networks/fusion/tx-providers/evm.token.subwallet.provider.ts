import { Logger } from "src/app/logger";
import { TokenType } from "../../../coin";
import { ERCTokenInfo, EthTokenTransaction, EthTransaction } from "../../evms/evm.types";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletTokenProvider } from "../../evms/tx-providers/etherscan.token.subwallet.provider";
import { FusionHelper, FusionTokenType } from "./fusion.helper";

const MAX_RESULTS_PER_FETCH = 30;

// TODO: we need call fetchAllTokenTransactions for each token type
let tokenTypeMapList = [{fusionTokenType : FusionTokenType.ERC20, ercTokenType : TokenType.ERC_20},
                    {fusionTokenType : FusionTokenType.FRC758, ercTokenType : TokenType.ERC_20},
                    {fusionTokenType : FusionTokenType.FRC759, ercTokenType : TokenType.ERC_20},
                    {fusionTokenType : FusionTokenType.ERC721, ercTokenType : TokenType.ERC_721},
                    {fusionTokenType : FusionTokenType.ERC1155, ercTokenType : TokenType.ERC_1155},];


export class FusionEvmTokenSubWalletProvider extends EtherscanEVMSubWalletTokenProvider<AnyMainCoinEVMSubWallet> {
  // https://github.com/FUSIONFoundation/web3-fusion-extend/tree/master/examples/blockexplorerapi
  // NOTE: Currently fusion explorer api is quite weak our outdated. We are not able to easily get transactions
  // or maybe only the "FROM" transactions. To be tested more.
  public async fetchTransactions(erc20SubWallet: ERC20SubWallet, afterTransaction?: EthTransaction): Promise<void> {
    const accountAddress = await this.subWallet.getCurrentReceiverAddress();
    const contractAddress = erc20SubWallet.coin.getContractAddress().toLowerCase();

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

    try {
      let { transactions, canFetchMore } = await FusionHelper.fetchTokenTransactions(
        this.subWallet,
        contractAddress,
        accountAddress,
        page,
        MAX_RESULTS_PER_FETCH);

      this.canFetchMore = canFetchMore;

      await this.saveTransactions(transactions);
    } catch (e) {
      Logger.error('wallet', 'FusionEvmTokenSubWalletProvider fetchTransactions error:', e)
    }
    return null;
  }

  // eslint-disable-next-line require-await
  public async fetchAllTokensTransactions(): Promise<void> {
    Logger.warn('wallet', ' FusionEvmTokenSubWalletProvider fetchAllTokensTransactions')
    const accountAddress = await this.subWallet.getCurrentReceiverAddress();

    for (let i =0; i < tokenTypeMapList.length; i++) {
      let result = await FusionHelper.fetchAllTokenTransactions(
        this.subWallet,
        accountAddress,
        tokenTypeMapList[i].fusionTokenType,
        1,
        100);
      if (result.transactions && result.transactions.length >0) {
        let tokens = await this.getERCTokensFromTransactions(result.transactions, tokenTypeMapList[i].ercTokenType);
        if (tokens.length > 0) {
          await this.provider.onTokenInfoFound(tokens);
        }
      }
    }
  }

  /**
   * Can not get the token list directly, So get the token list by token transactions.
   */
   private async getERCTokensFromTransactions(transactions: EthTokenTransaction[], tokenType: TokenType) {
    let ercTokens: ERCTokenInfo[] = [];
    let ercTokenContractAddresss = [];
    let ercTokenHasOutgoTxContractAddresss = [];

    const accountAddress = await this.subWallet.getTokenAddress();
    for (let i = 0, len = transactions.length; i < len; i++) {
      if (-1 === ercTokenContractAddresss.indexOf(transactions[i].contractAddress)) {
        let hasOutgoTx = false;
        if (transactions[i].from) {
          hasOutgoTx = accountAddress === transactions[i].from.toLowerCase();
        }
        if (hasOutgoTx) {
          ercTokenHasOutgoTxContractAddresss.push(transactions[i].contractAddress);
        }
        ercTokenContractAddresss.push(transactions[i].contractAddress);
        let token: ERCTokenInfo = {
          balance: '',
          contractAddress: transactions[i].contractAddress,
          decimals: transactions[i].tokenDecimal,
          name: transactions[i].tokenName,
          symbol: transactions[i].tokenSymbol,
          type: tokenType,
          hasOutgoTx: hasOutgoTx,
        }
        ercTokens.push(token);
      } else {
        let hasOutgoTx = false;
        if (transactions[i].from) {
          hasOutgoTx = accountAddress === transactions[i].from.toLowerCase();
        }
        if (hasOutgoTx && (-1 === ercTokenHasOutgoTxContractAddresss.indexOf(transactions[i].contractAddress))) {
          ercTokenHasOutgoTxContractAddresss.push(transactions[i].contractAddress);
          const index = ercTokens.findIndex(token => token.contractAddress == transactions[i].contractAddress);
          ercTokens[index].hasOutgoTx = true;
        }
      }
    }
    return ercTokens;
  }
}
