import { TokenType } from '../../../coin';
import { AddressUsage } from '../../../safes/addressusage';
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { ERCTokenInfo, EthTransaction } from "../evm.types";
import { ERC20SubWallet } from "../subwallets/erc20.subwallet";
import { MainCoinEVMSubWallet } from "../subwallets/evm.subwallet";
import { CovalentHelper } from './covalent.helper';

const MAX_RESULTS_PER_FETCH = 30;

/**
 * Covalent token provider that uses covalenthq service to discover new tokens and fetch tokens
 * transactions.
 */
export class CovalentSubWalletTokenProvider<SubWalletType extends MainCoinEVMSubWallet<any>> extends SubWalletTransactionProvider<SubWalletType, EthTransaction> {
  private canFetchMore = true;

  constructor(provider: TransactionProvider<any>, subWallet: SubWalletType) {
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
    const accountAddress = await this.subWallet.getCurrentReceiverAddress();

    let page = 0; // Start with 0;
    // Compute the page to fetch from the api, based on the current position of "afterTransaction" in the list
    if (afterTransaction) {
      let afterTransactionIndex = (await this.getTransactions(erc20SubWallet)).findIndex(t => t.hash === afterTransaction.hash);
      if (afterTransactionIndex) { // Just in case, should always be true but...
        // Ex: if tx index in current list of transactions is 18 and we use 8 results per page
        // then the page to fetch is 2: Math.floor(18 / 8) + 1 - API page index starts at 1
        page = 0 + Math.floor((afterTransactionIndex + 1) / MAX_RESULTS_PER_FETCH);
      }
    }

    let { transactions, canFetchMore } = await CovalentHelper.fetchERC20Transfers(
      this.subWallet,
      this.subWallet.networkWallet.network.getMainChainID(),
      accountAddress,
      erc20SubWallet.coin.getContractAddress(),
      page,
      MAX_RESULTS_PER_FETCH);

    this.canFetchMore = canFetchMore;

    await this.saveTransactions(transactions);
  }

  public async fetchAllTokensTransactions(): Promise<void> {
    let address = await this.subWallet.getCurrentReceiverAddress(AddressUsage.EVM_CALL);
    let chainId = this.subWallet.networkWallet.network.getMainChainID();
    let tokenBalances = await CovalentHelper.fetchTokenBalances(this.subWallet, address, chainId);

    // Convert covalent token balances to ERCTokenInfo types so we can let user know
    // about new tokens found.
    if (tokenBalances) {
      let foundTokenInfo: ERCTokenInfo[] = [];

      tokenBalances.forEach(tb => {
        // For nft: the supports_erc = ['erc20', 'erc721'].
        if (tb.supports_erc && (tb.supports_erc.indexOf("erc20") >= 0)) {
            let tokenInfo = foundTokenInfo.find(t => t.contractAddress === tb.contract_address);
            if (!tokenInfo) {
                let type = TokenType.ERC_20
                // Nft
                if (tb.type === 'nft') {
                    if (tb.supports_erc.indexOf('erc721') >= 0) {
                        type = TokenType.ERC_721;
                    } else if (tb.supports_erc.indexOf('erc1155') >= 0) {
                        type = TokenType.ERC_1155;
                    }
                }
                // If the token contract was not handled yet, save its info to our local list of all contracts
                tokenInfo = {
                    type: type,
                    symbol: tb.contract_ticker_symbol,
                    name: tb.contract_name,
                    decimals: `${tb.contract_decimals}`,
                    contractAddress: tb.contract_address,
                    balance: tb.balance,
                    hasOutgoTx: false // ??
                };

                foundTokenInfo.push(tokenInfo);
            }

            // Append NFT token ID if needed
            if (tb.nft_data) {
              if (!tokenInfo.tokenIDs)
                tokenInfo.tokenIDs = [];

                tb.nft_data.forEach( nft => {
                    if (!tokenInfo.tokenIDs.includes(nft.token_id)) {
                        tokenInfo.tokenIDs.push(nft.token_id);
                    }
                })
            }
        }
      });

      await this.provider.onTokenInfoFound(foundTokenInfo);
    }
  }
}