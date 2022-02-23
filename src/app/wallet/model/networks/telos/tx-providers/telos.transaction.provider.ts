import { AnyStandardEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EVMSubWalletProvider } from "../../evms/tx-providers/evm.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../../evms/tx-providers/token.subwallet.provider";
import { TelosEvmSubWalletProvider } from "./evm.subwallet.provider";
import { TelosTokenSubWalletProvider } from "./token.subwallet.provider";

export class TelosTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<AnyStandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyStandardEVMSubWallet;
    return new TelosEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<AnyStandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyStandardEVMSubWallet;
    return new TelosTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}