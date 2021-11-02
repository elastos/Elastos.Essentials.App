import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { EVMTransactionProvider } from "../../../providers/evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { TelosEvmSubWalletProvider } from "./evm.subwallet.provider";
import { TelosTokenSubWalletProvider } from "./token.subwallet.provider";

export class TelosTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new TelosEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new TelosTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}