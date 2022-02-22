import { AnyStandardEVMSubWallet } from "../../wallets/evm.subwallet";
import { EVMSubWalletProvider } from "../evm.subwallet.provider";
import { EVMTransactionProvider } from "../evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../token.subwallet.provider";
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