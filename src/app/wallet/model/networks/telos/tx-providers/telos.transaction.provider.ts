import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { TelosEvmSubWalletProvider } from "./evm.subwallet.provider";

export class TelosTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new TelosEvmSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = null;
  }
}