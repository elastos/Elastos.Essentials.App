import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { CovalentEvmSubWalletProvider } from "../../evms/tx-providers/covalent.evm.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { IoTeXChainTokenSubWalletProvider } from "./token.subwallet.provider";

export class IoTeXChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new CovalentEvmSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = new IoTeXChainTokenSubWalletProvider(this, mainCoinSubWallet);
  }
}