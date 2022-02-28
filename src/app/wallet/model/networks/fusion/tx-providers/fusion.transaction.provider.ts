import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { EVMSubWalletProvider } from "../../evms/tx-providers/evm.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../../evms/tx-providers/token.subwallet.provider";
import { FusionEvmSubWalletProvider } from "./evm.subwallet.provider";
import { FusionTokenSubWalletProvider } from "./token.subwallet.provider";

export class FusionTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<AnyMainCoinEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyMainCoinEVMSubWallet;
    return new FusionEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<AnyMainCoinEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyMainCoinEVMSubWallet;
    return new FusionTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}