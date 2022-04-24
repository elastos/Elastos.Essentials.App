import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";

export class CustomTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = null; // TODO: use a raw provider if any
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = null; // TODO: use a raw provider if any
  }
}