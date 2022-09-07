import { AnyMainCoinEVMSubWallet } from "../subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "./etherscan.evm.subwallet.internaltx.provider";
import { EtherscanEVMSubWalletProvider } from "./etherscan.evm.subwallet.provider";
import { EtherscanEVMSubWalletTokenProvider, FetchMode } from "./etherscan.token.subwallet.provider";
import { EVMTransactionProvider } from "./evm.transaction.provider";

/**
 * Default etherscan transaction provider that implements the 3 sub providers with etherscan
 * calls.
 */
export class EtherscanTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new EtherscanEVMSubWalletProvider(this, mainCoinSubWallet);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = new EtherscanEVMSubWalletTokenProvider(this, mainCoinSubWallet, FetchMode.Compatibility3);
  }

  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, mainCoinSubWallet);
  }
}