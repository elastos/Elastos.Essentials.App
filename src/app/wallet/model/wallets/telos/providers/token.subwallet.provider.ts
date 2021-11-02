import { Logger } from "src/app/logger";
import { EthTransaction } from "../../../evm.types";
import { ProviderTransactionInfo } from "../../../providers/providertransactioninfo";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { TransactionDirection } from "../../../providers/transaction.types";
import { ERC20SubWallet } from "../../erc20.subwallet";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { AnySubWallet } from "../../subwallet";

export class TelosTokenSubWalletProvider extends EVMSubWalletTokenProvider<StandardEVMSubWallet> {
  protected getProviderTransactionInfo(transaction: { blockHash: string; blockNumber: string; confirmations: string; contractAddress: string; cumulativeGasUsed: string; from: string; gas: string; gasPrice: string; gasUsed: string; hash: string; input: string; isError: string; nonce: string; timeStamp: string; to: string; transactionIndex: string; txreceipt_status: string; value: string; Direction: TransactionDirection; isERC20TokenTransfer: boolean; }): ProviderTransactionInfo {
    throw new Error("Telos - getProviderTransactionInfo(): Method not implemented.");
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false;
  }

  public fetchTransactions(erc20SubWallet: ERC20SubWallet, afterTransaction?: EthTransaction): Promise<void> {
    Logger.log("wallet", "Telos: fetchTransactions() not implemented");
    return;
  }

  public fetchAllTokensTransactions(): Promise<void> {
    Logger.log("wallet", "Telos: fetchAllTokensTransactions() not implemented");
    return;
  }
}