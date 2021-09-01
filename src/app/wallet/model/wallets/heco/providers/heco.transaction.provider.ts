import { Subject } from "rxjs";
import { StandardCoinName, TokenAddress } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { AnySubWalletTransactionProvider, NewToken, NewTransaction, TransactionProvider } from "../../../transaction.provider";
import { GenericTransaction, PaginatedTransactions } from "../../../transaction.types";
import { AnySubWallet, SubWallet } from "../../subwallet";

export class HecoTransactionProvider extends TransactionProvider<EthTransaction> {
  constructor() {
    super();
  }

  public start() {

  }

  public stop(): Promise<void> {
    return;
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null; // TODO
  }
}