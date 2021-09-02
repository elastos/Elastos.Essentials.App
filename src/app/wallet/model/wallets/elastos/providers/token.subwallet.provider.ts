import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { AnySubWallet } from "../../subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";

export class ElastosTokenSubWalletProvider extends SubWalletTransactionProvider<EscSubWallet, EthTransaction> {
  protected getProviderTransactionInfo(transaction: EthTransaction): ProviderTransactionInfo {
    return {
      cacheKey: this.subWallet.masterWallet.id + "-" + this.subWallet.networkWallet.network.key + "-" + transaction.contractAddress + "-transactions",
      cacheEntryKey: transaction.hash,
      cacheTimeValue: parseInt(transaction.timeStamp),
      subjectKey: transaction.contractAddress
    };
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    throw new Error("canFetchMoreTransactions(): Method not implemented.");
  }

  // All ERC20 transactions fetched at once
  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    if (afterTransaction)
      throw new Error("fetchTransactions() with afterTransaction: NOT YET IMPLEMENTED");

    await this.prepareTransactions(this.subWallet);

    const tokenAccountAddress = await this.subWallet.createAddress();

    let ethTokenTransactions = await GlobalElastosAPIService.instance.getERC20TokenTransactions(StandardCoinName.ETHSC, tokenAccountAddress);
    if (ethTokenTransactions) {
      await this.saveTransactions(ethTokenTransactions);
    }
  }
}