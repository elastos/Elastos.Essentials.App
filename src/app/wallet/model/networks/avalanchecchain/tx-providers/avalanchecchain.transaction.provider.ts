import { AnyMainCoinEVMSubWallet } from "../../evms/subwallets/evm.subwallet";
import { CovalentEvmSubWalletProvider } from "../../evms/tx-providers/covalent.evm.subwallet.provider";
import { EVMSubWalletProvider } from "../../evms/tx-providers/evm.subwallet.provider";
import { EVMTransactionProvider } from "../../evms/tx-providers/evm.transaction.provider";
import { EVMSubWalletTokenProvider } from "../../evms/tx-providers/token.subwallet.provider";
import { AvalancheCChainTokenSubWalletProvider } from "./token.subwallet.provider";

export class AvalancheCChainTransactionProvider extends EVMTransactionProvider {
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<AnyMainCoinEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyMainCoinEVMSubWallet;
    return new CovalentEvmSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<AnyMainCoinEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyMainCoinEVMSubWallet;
    return new AvalancheCChainTokenSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }
}