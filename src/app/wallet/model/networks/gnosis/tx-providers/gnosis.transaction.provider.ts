import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider";
import { EtherscanEVMSubWalletProvider } from "../../evms/tx-providers/etherscan.evm.subwallet.provider";
import { EtherscanEVMSubWalletTokenProvider, FetchMode } from "../../evms/tx-providers/etherscan.token.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";

const Gnosis_SCAN_API_KEY = "VNREBDAN9UG8C84PVM8NT6VJKQICYD62II";
export class GnosisTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.mainProvider = new EtherscanEVMSubWalletProvider(this, mainCoinSubWallet, Gnosis_SCAN_API_KEY);
  }

  protected createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.tokenProvider = new EtherscanEVMSubWalletTokenProvider(this, mainCoinSubWallet, FetchMode.Compatibility2, Gnosis_SCAN_API_KEY);
  }

  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, mainCoinSubWallet, Gnosis_SCAN_API_KEY);
  }
}