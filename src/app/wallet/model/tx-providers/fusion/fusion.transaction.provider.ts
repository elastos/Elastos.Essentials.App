import { AnyStandardEVMSubWallet } from "../../wallets/evm.subwallet";
import { EVMSubWalletProvider } from "../evm.subwallet.provider";
import { EVMTransactionProvider } from "../evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../token.subwallet.provider";
import { FusionEvmSubWalletProvider } from "./evm.subwallet.provider";
import { FusionTokenSubWalletProvider } from "./token.subwallet.provider";

export class FusionTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<AnyStandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyStandardEVMSubWallet;
    return new FusionEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<AnyStandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyStandardEVMSubWallet;
    return new FusionTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}