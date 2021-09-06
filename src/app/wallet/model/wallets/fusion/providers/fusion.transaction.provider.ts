import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { EVMTransactionProvider } from "../../../providers/evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { FusionEvmSubWalletProvider } from "./evm.subwallet.provider";
import { FusionTokenSubWalletProvider } from "./token.subwallet.provider";

export class FusionTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new FusionEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new FusionTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}