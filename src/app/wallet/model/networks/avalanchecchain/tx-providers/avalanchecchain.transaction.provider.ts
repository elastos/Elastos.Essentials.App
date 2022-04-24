import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { CovalentEvmSubWalletProvider } from "../../evms/tx-providers/covalent.evm.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";

export class AvalancheCChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new CovalentEvmSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    // Not implemented
    this.tokenProvider = null;
  }

  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    // Not implemented
    this.internalTXProvider = null;
  }
}