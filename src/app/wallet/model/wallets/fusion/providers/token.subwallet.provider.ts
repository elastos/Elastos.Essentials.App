import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { SubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { GenericTransaction, TransactionDirection } from "../../../providers/transaction.types";
import { EscSubWallet } from "../../elastos/esc.evm.subwallet";
import { AnySubWallet } from "../../subwallet";

export class FusionTokenSubWalletProvider extends SubWalletTransactionProvider<EscSubWallet, EthTransaction> {
  protected getProviderTransactionInfo(transaction: { blockHash: string; blockNumber: string; confirmations: string; contractAddress: string; cumulativeGasUsed: string; from: string; gas: string; gasPrice: string; gasUsed: string; hash: string; input: string; isError: string; nonce: string; timeStamp: string; to: string; transactionIndex: string; txreceipt_status: string; value: string; Direction: TransactionDirection; isERC20TokenTransfer: boolean; }): ProviderTransactionInfo {
    throw new Error("Method not implemented.");
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    throw new Error("Method not implemented.");
  }

  public fetchTransactions(subWallet: AnySubWallet, afterTransaction?: GenericTransaction) {
    throw new Error("Method not implemented.");
  }
}