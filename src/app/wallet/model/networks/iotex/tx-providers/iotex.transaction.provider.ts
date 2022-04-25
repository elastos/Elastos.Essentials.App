import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { CovalentEvmSubWalletProvider } from "../../evms/tx-providers/covalent.evm.subwallet.provider";
import { CovalentSubWalletTokenProvider } from "../../evms/tx-providers/covalent.token.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";

export class IoTeXChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new CovalentEvmSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = new CovalentSubWalletTokenProvider(this, mainCoinSubWallet);
  }
}