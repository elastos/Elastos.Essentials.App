import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { FusionEvmSubWalletProvider } from "./evm.subwallet.provider";

export class FusionTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new FusionEvmSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = null;
  }
}