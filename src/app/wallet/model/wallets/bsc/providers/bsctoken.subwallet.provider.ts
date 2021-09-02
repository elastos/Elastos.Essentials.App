import { EthTransaction } from "../../../evm.types";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { AnySubWallet } from "../../subwallet";
import { BscAPI, BscApiType } from "../bsc.api";
import { BscERC20SubWallet } from "../bsc.erc20.subwallet";
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

  public forcedFetchTransactions(subWallet: BscERC20SubWallet, afterTransaction?: EthTransaction) {
    // TODO: fetch ERC20 token transactions of the given BscERC20SubWallet subWallet
  }
}