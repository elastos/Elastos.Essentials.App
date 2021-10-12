import { CovalentEvmSubWalletProvider } from "../../../providers/covalent.evm.subwallet.provider";
import { EVMSubWalletProvider } from "../../../providers/evm.subwallet.provider";
import { EVMTransactionProvider } from "../../../providers/evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../../../providers/token.subwallet.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { AvalancheCChainTokenSubWalletProvider } from "./token.subwallet.provider";

export class AvalancheCChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new CovalentEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new AvalancheCChainTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}