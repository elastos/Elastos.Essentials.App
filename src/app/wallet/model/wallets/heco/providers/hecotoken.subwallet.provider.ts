import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardCoinName } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { ProviderTransactionInfo, SubWalletTransactionProvider, TransactionProvider } from "../../../providers/transaction.provider";
import { AnySubWallet } from "../../subwallet";
import { HecoAPI, HecoApiType } from "../heco.api";
import { HecoERC20SubWallet } from "../heco.erc20.subwallet";
import { HECOChainSubWallet } from "../heco.subwallet";

export class HecoTokenSubWalletProvider extends EVMSubWalletTokenProvider<HECOChainSubWallet> {
  constructor(provider: TransactionProvider<any>, subWallet: HECOChainSubWallet) {
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    super(provider, subWallet, rpcApiUrl);
  }

  public fetchAllTokensTransactions(): Promise<void> {
    // TOOD: fetch the api that gets all tokens transactions
    return;
  }

  public forcedFetchTransactions(subWallet: HecoERC20SubWallet, afterTransaction?: EthTransaction) {
    // TODO
  }
}