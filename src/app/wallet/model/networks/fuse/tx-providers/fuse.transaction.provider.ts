import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider";
import { EtherscanEVMSubWalletProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.provider";
import { EtherscanEVMSubWalletTokenProvider, FetchMode } from "../../evms/tx-providers/etherscan.token.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";

export class FuseTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new EtherscanEVMSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = new EtherscanEVMSubWalletTokenProvider(this, mainCoinSubWallet, FetchMode.FetchMode_TokenTx);
  }

  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, mainCoinSubWallet);
  }
}