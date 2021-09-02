import { EthTransaction } from "../../../evm.types";
import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { AnySubWallet } from "../../subwallet";
import { BscAPI, BscApiType } from "../bsc.api";
import { BscChainSubWallet } from "../bsc.subwallet";

export class BSCSubWalletProvider extends EVMSubWalletProvider<BscChainSubWallet> {
  constructor(provider: TransactionProvider<any>, subWallet: BscChainSubWallet) {
    const rpcApiUrl = BscAPI.getApiUrl(BscApiType.ACCOUNT_RPC);
    super(provider, subWallet, rpcApiUrl);
  }

  public forcedFetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction) {
    // TODO 
  }
}