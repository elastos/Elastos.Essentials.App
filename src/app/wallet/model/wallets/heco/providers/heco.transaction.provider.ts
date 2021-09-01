import { Subject } from "rxjs";
import { StandardCoinName, TokenAddress } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { NewToken, NewTransaction, TransactionProvider } from "../../../transaction.provider";
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

  public prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getTransactions(subWallet: SubWallet<EthTransaction>, startIndex?: number): EthTransaction[] {
    throw new Error("Method not implemented.");
  }

  public canFetchMoreTransactions(subWallet: SubWallet<EthTransaction>): boolean {
    throw new Error("Method not implemented.");
  }

  public forcedFetchTransactions(subWallet: SubWallet<EthTransaction>, afterTransaction?: EthTransaction) {
    throw new Error("Method not implemented.");
  }
}