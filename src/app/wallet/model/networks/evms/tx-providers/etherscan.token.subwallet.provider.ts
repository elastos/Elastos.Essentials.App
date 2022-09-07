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

export enum FetchMode {
  /**
   * Account api only support tokentx action but we can't know the tokens types (20, 721?) from it.
   * But the scan API has a "tokenlist" action though, and we use this one.
   * Newer scan APIs do NOT have 'tokenlist'.
   */
  Compatibility1 = 0,
  /**
   * Account api supports tokentx and tokennfttx actions, but not token1155tx.
   */
  Compatibility2 = 1,
  /**
   * Account api support tokentx, tokennfttx and token1155tx actions.
   */
  Compatibility3 = 2
}

enum AccountAction {
  TOKENTX = 'tokentx',
  TOKEN_NFT_TX = 'tokennfttx',
  TOKEN_1155_TX = 'token1155tx'
}

export class EtherscanEVMSubWalletTokenProvider<SubWalletType extends MainCoinEVMSubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
  protected canFetchMore = true;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType, private fetchMode: FetchMode = FetchMode.Compatibility1, private apiKey?: string) {
    super(provider, subWallet);

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    provider.refreshEvery(() => this.discoverTokens(), 30000);
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

  public async discoverTokens(): Promise<void> {
    let tokenSubWallet = this.subWallet;
    const address = await tokenSubWallet.getAccountAddress();
    let totalTokens: ERCTokenInfo[] = [];

    if (this.fetchMode === FetchMode.Compatibility1) {
      // Mode 1: use 'tokenlist' and nothing else. All tokens are mixed.
      const tokenListUrl = this.subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN) +
        '?module=account&action=tokenlist&address=' + address;

      try {
        let result = await GlobalJsonRPCService.instance.httpGet(tokenListUrl);
        let rawResults: ERCTokenInfo[] = result.result;

        // From here, we got a list of contract address / type / balance (erc 20, 721, 1155) but NO token IDs for NFTs,,,
        // In order to not force the NFT services to call getPastEvents() to discover token IDs (as there are limitations in blocks
        // count such as max 50k or 10k at a time), we call tokentx here for each contract, to retrieve more details about the NFTs,
        // including the token IDs. Token IDs will be stored and NFT display can then be fast later.

        for (let rawResult of rawResults) {
          if (rawResult.type === TokenType.ERC_20) {
            // ERC20, nothing more to do, just add it directly to the list
            totalTokens.push(rawResult);
          }
          else {
            // NFTs - call tokentx with contract address then call getTokensInfoFromTransferEvents() then append to the list
            let tokenTransactions = await this.getTokenTransferEventsByContractAddress(address, rawResult.contractAddress, AccountAction.TOKENTX, 0);
            if (tokenTransactions) {
              let tokens = await this.getTokensInfoFromTransferEvents(tokenTransactions, rawResult.type);
              totalTokens = [...totalTokens, ...tokens];
            }
          }
        }
      } catch (e) {
        Logger.warn("wallet", "discoverTokens() tokenlist exception", e);
        return;
      }
    }
    else {
      // More recent modes - scan apis have partial or full split of all kinds of ERC tokens.

      let tokenTransactions = await this.getTokenTransferEventsByAction(address, AccountAction.TOKENTX, 0);
      if (tokenTransactions) {
        let tokens = await this.getTokensInfoFromTransferEvents(tokenTransactions, TokenType.ERC_20);
        totalTokens = [...totalTokens, ...tokens];
      }

      if (this.fetchMode > FetchMode.Compatibility1) {
        tokenTransactions = await this.getTokenTransferEventsByAction(address, AccountAction.TOKEN_NFT_TX, 0);
        if (tokenTransactions) {
          let tokens = await this.getTokensInfoFromTransferEvents(tokenTransactions, TokenType.ERC_721);
          totalTokens = [...totalTokens, ...tokens];
        }
      }

      if (this.fetchMode > FetchMode.Compatibility2) {
        tokenTransactions = await this.getTokenTransferEventsByAction(address, AccountAction.TOKEN_1155_TX, 0);
        if (tokenTransactions) {
          let tokens = await this.getTokensInfoFromTransferEvents(tokenTransactions, TokenType.ERC_1155);
          totalTokens = [...totalTokens, ...tokens];
        }
      }
    }

    // Let the provider know what we have found
    await this.provider.onTokenInfoFound(totalTokens);
  }

  /**
   * Can not get the token list directly, So get the token list by token transfer events that were found
   * in transactions.
   *
   * Output for NFTs: ONE ERCTokenInfo entry per NFT contract.
   */
  private async getTokensInfoFromTransferEvents(transferEvents: EthTokenTransaction[], tokenType: TokenType): Promise<ERCTokenInfo[]> {
    let ercTokens: ERCTokenInfo[] = [];
    let tokenWithOutgoingTxContractAddresses = [];

    const accountAddress = await this.subWallet.getAccountAddress();

    // Check every transfer
    for (let i = 0, len = transferEvents.length; i < len; i++) {
      // Check if this transfer is a outgoing transfer from user's wallet
      let hasOutgoingTx = false;
      if (transferEvents[i].to && transferEvents[i].to.toLowerCase() !== accountAddress)
        hasOutgoingTx = true;

      // If this is a outgoing transfer and the outgoing contract address is not added yet, save it to our temporary outgoing tokens list
      if (-1 === tokenWithOutgoingTxContractAddresses.indexOf(transferEvents[i].contractAddress) && hasOutgoingTx)
        tokenWithOutgoingTxContractAddresses.push(transferEvents[i].contractAddress);

      let tokenInfo = ercTokens.find(t => t.contractAddress === transferEvents[i].contractAddress);
      if (!tokenInfo) {
        // If the token contract was not handled yet, save its info to our local list of all contracts
        tokenInfo = {
          balance: '',
          contractAddress: transferEvents[i].contractAddress,
          decimals: transferEvents[i].tokenDecimal,
          name: transferEvents[i].tokenName,
          symbol: transferEvents[i].tokenSymbol,
          type: tokenType,
          hasOutgoTx: hasOutgoingTx,
        }

        ercTokens.push(tokenInfo);
      }

      // Append NFT token ID if needed
      if (transferEvents[i].tokenID) {
        if (!tokenInfo.tokenIDs)
          tokenInfo.tokenIDs = [];

        if (hasOutgoingTx) {
          // User account as sender? Remove the token from the list
          let index = tokenInfo.tokenIDs.findIndex(tID => tID == transferEvents[i].tokenID)
          tokenInfo.tokenIDs.splice(index, 1);
        } else {
          // User account as received? Add the token to the list
          if (!tokenInfo.tokenIDs.includes(transferEvents[i].tokenID)) {
            tokenInfo.tokenIDs.push(transferEvents[i].tokenID);
          }
        }
      }
    }

    // Mark all tokens with outgoing transfers
    ercTokens.forEach(t => {
      if (tokenWithOutgoingTxContractAddresses.includes(t.contractAddress))
        t.hasOutgoTx = true;
    })

    return ercTokens;
  }

  private async getTokenTransferEventsByAction(address: string, action: AccountAction, startblock: number, endblock = 9999999999): Promise<EthTokenTransaction[]> {
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

  private async getTokenTransferEventsByContractAddress(address: string, contractAddress: string, action: AccountAction, startblock: number, endblock = 9999999999): Promise<EthTokenTransaction[]> {
    let tokensEventUrl = this.subWallet.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.ETHERSCAN)
      + '?module=account&action=' + action + '&address=' + address
      + '&contractaddress=' + contractAddress
      + '&startblock=' + startblock + '&endblock=' + endblock;

    if (this.apiKey)
      tokensEventUrl += '&apikey=' + this.apiKey;

    //console.log(tokensEventUrl)

    try {
      let result = await GlobalJsonRPCService.instance.httpGet(tokensEventUrl, this.subWallet.networkWallet.network.key);
      return result.result as EthTokenTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getTokenTransferEventsByContractAddress error:', e)
      return [];
    }
  }
}