import { AnyStandardEVMSubWallet } from "../../wallets/evm.subwallet";
import { CovalentEvmSubWalletProvider } from "../covalent.evm.subwallet.provider";
import { EVMSubWalletProvider } from "../evm.subwallet.provider";
import { EVMTransactionProvider } from "../evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../token.subwallet.provider";
import { AvalancheCChainTokenSubWalletProvider } from "./token.subwallet.provider";

export class AvalancheCChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<AnyStandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyStandardEVMSubWallet;
    return new CovalentEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<AnyStandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyStandardEVMSubWallet;
    return new AvalancheCChainTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}