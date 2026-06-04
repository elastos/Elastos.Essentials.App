import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider";
import { EtherscanEVMSubWalletProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.provider";
import { EtherscanEVMSubWalletTokenProvider, FetchMode } from "../../evms/tx-providers/etherscan.token.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { CustomNetwork } from "../network/custom.network";

export class CustomTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    if ((mainCoinSubWallet.networkWallet.network as CustomNetwork).hasAccountRPC()) {
      this.mainProvider = new EtherscanEVMSubWalletProvider(this, mainCoinSubWallet);
    } else {
      this.mainProvider = null;
    }
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    if ((mainCoinSubWallet.networkWallet.network as CustomNetwork).hasAccountRPC()) {
      this.tokenProvider = new EtherscanEVMSubWalletTokenProvider(this, mainCoinSubWallet, FetchMode.Compatibility1);
    } else {
      this.tokenProvider = null;
    }
  }

  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    if ((mainCoinSubWallet.networkWallet.network as CustomNetwork).hasAccountRPC()) {
      this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, mainCoinSubWallet);
    } else {
      this.internalTXProvider = null;
    }
  }
}