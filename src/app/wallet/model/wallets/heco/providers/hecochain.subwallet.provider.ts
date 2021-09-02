import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { ProviderTransactionInfo, SubWalletTransactionProvider, TransactionProvider } from "../../../providers/transaction.provider";
import { GenericTransaction } from "../../../providers/transaction.types";
import { AnySubWallet } from "../../subwallet";
import { HecoAPI, HecoApiType } from "../heco.api";
import { HECOChainSubWallet } from "../heco.subwallet";

export class HecoChainSubWalletProvider extends EVMSubWalletProvider<HECOChainSubWallet> {
  constructor(provider: TransactionProvider<any>, subWallet: HECOChainSubWallet) {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    super(provider, subWallet, rpcApiUrl);
  }

  public forcedFetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction) {
    // If afterTransaction is not passed, we do nothing because the main provider is already
    // refreshing the latest transactions regularly.
    if (!afterTransaction)
      return;

    // TODO: afterTransaction
    void this.fetchTransactions();
  }
}