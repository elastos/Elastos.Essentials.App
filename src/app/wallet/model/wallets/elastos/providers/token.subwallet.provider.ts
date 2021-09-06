import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { AnySubWallet } from "../../subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";

export class ElastosTokenSubWalletProvider extends SubWalletTransactionProvider<EscSubWallet, EthTransaction> {
  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress + "-transactions",
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
    let tokenList = await GlobalElastosAPIService.instance.getERC20TokenList(StandardCoinName.ETHSC, address);

    // Let the provider know what we have found
    this.provider.onTokenInfoFound(tokenList);
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return true; // TODO
  }

  // All ERC20 transactions fetched at once
  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    if (afterTransaction)
      throw new Error("fetchTransactions() with afterTransaction: NOT YET IMPLEMENTED");

    const tokenAccountAddress = await this.subWallet.createAddress();

    let ethTokenTransactions = await GlobalElastosAPIService.instance.getERC20TokenTransactions(StandardCoinName.ETHSC, tokenAccountAddress);
    if (ethTokenTransactions) {
      await this.saveTransactions(ethTokenTransactions);
    }
  }
}