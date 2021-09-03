import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { BscAPI, BscApiType } from "../bsc.api";
import { BscChainSubWallet } from "../bsc.subwallet";

export class BscTokenSubWalletProvider extends EVMSubWalletTokenProvider<BscChainSubWallet> {
  constructor(provider: TransactionProvider<any>, subWallet: BscChainSubWallet) {
    const rpcApiUrl = BscAPI.getApiUrl(BscApiType.ACCOUNT_RPC);
    super(provider, subWallet, rpcApiUrl);
  }

  public fetchAllTokensTransactions(): Promise<void> {
    // TOOD: fetch the api that gets all tokens transactions
    return;
  }
}