import { Logger } from "src/app/logger";
import { ProviderTransactionInfo } from "../../../tx-providers/providertransactioninfo";
import { TransactionDirection } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../../evms/evm.types";
import { ERC20SubWallet } from "../../evms/subwallets/erc20.subwallet";
import { AnyStandardEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EVMSubWalletTokenProvider } from "../../evms/tx-providers/token.subwallet.provider";

export class FusionTokenSubWalletProvider extends EVMSubWalletTokenProvider<AnyStandardEVMSubWallet> {
  protected getProviderTransactionInfo(transaction: { blockHash: string; blockNumber: string; confirmations: string; contractAddress: string; cumulativeGasUsed: string; from: string; gas: string; gasPrice: string; gasUsed: string; hash: string; input: string; isError: string; nonce: string; timeStamp: string; to: string; transactionIndex: string; txreceipt_status: string; value: string; Direction: TransactionDirection; isERC20TokenTransfer: boolean; }): ProviderTransactionInfo {
    throw new Error("Fusion - getProviderTransactionInfo(): Method not implemented.");
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false;
  }

  public fetchTransactions(erc20SubWallet: ERC20SubWallet, afterTransaction?: EthTransaction): Promise<void> {
    Logger.log("wallet", "Fusion: fetchTransactions() not implemented");
    return;
  }

  public fetchAllTokensTransactions(): Promise<void> {
    Logger.log("wallet", "Fusion: fetchAllTokensTransactions() not implemented");
    return;
  }
}