import { EthTransaction } from "../../../evm.types";
import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { AnySubWallet } from "../../subwallet";

const MAX_RESULTS_PER_FETCH = 30;

type telosTransaction = {
  // TODO
}

export class TelosEvmSubWalletProvider extends EVMSubWalletProvider<StandardEVMSubWallet> {
  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return false; // TODO
  }

  public async fetchTransactions(subWallet: AnySubWallet, afterTransaction?: EthTransaction): Promise<void> {
    const accountAddress = await this.subWallet.createAddress();

    if (afterTransaction)
      throw new Error("Fusion EVM provider: afterTransaction not yet supported");

    // TODO: not available API to get transactions yet

    return null;
  }
}