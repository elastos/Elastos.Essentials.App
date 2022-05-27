import { AnySubWalletTransactionProvider, SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EthTransaction } from "../evm.types";
import { EVMNetworkWallet } from "../networkwallets/evm.networkwallet";
import { ERC20SubWallet } from "../subwallets/erc20.subwallet";
import { AnyMainCoinEVMSubWallet, MainCoinEVMSubWallet } from "../subwallets/evm.subwallet";

/**
 * Base transaction provider for regular EVM networks.
 */
export abstract class EVMTransactionProvider extends TransactionProvider<EthTransaction> {
  protected mainProvider: SubWalletTransactionProvider<MainCoinEVMSubWallet<any>, EthTransaction> = null;
  protected tokenProvider: SubWalletTransactionProvider<MainCoinEVMSubWallet<any>, EthTransaction> = null;
  protected internalTXProvider: SubWalletTransactionProvider<MainCoinEVMSubWallet<any>, EthTransaction> = null;

  constructor(protected networkWallet: EVMNetworkWallet<any, any>) {
    super(networkWallet);
  }

  public async start() {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as AnyMainCoinEVMSubWallet;

    this.createEVMSubWalletProvider(subwallet);
    if (this.mainProvider)
      await this.mainProvider.initialize();

    this.createEVMTokenSubWalletProvider(subwallet);
    if (this.tokenProvider)
      await this.tokenProvider.initialize();

    this.createEVMSubWalletInternalTransactionProvider(subwallet);
    if (this.internalTXProvider)
      await this.internalTXProvider.initialize();

    this.isRunning = true;
  }

  /**
   * Creates the EVM subwallet provider (main token).
   * this.mainProvider must be initialized after that.
   */
  protected abstract createEVMSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet);
  /* protected createEVMSubWalletProvider(): EtherscanEVMSubWalletProvider<MainCoinEVMSubWallet<any>> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as MainCoinEVMSubWallet<any>;
    return new EtherscanEVMSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  } */

  /**
   * Creates the token subwallet provider.
   * this.tokenProvider must be initialized after that.
   */
  protected abstract createEVMTokenSubWalletProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet);
  /* protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<MainCoinEVMSubWallet<any>> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as MainCoinEVMSubWallet<any>;
    return new EVMSubWalletTokenProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  } */

  /**
   * Creates the EVM subwallet provider internal transaction.
   * TODO: REWORK THIS !
   * this.internalTXProvider must be initialized after that.
   */
  protected createEVMSubWalletInternalTransactionProvider(mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    this.internalTXProvider = null;
  }
  /* protected createEVMSubWalletInternalTransactionProvider(): EtherscanEVMSubWalletInternalTransactionProvider<MainCoinEVMSubWallet<any>> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as MainCoinEVMSubWallet<any>;
    return new EtherscanEVMSubWalletInternalTransactionProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  } */

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainCoinEVMSubWallet)
      return this.mainProvider;
    else if (subWallet instanceof ERC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainCoinEVMSubWallet)
      return this.internalTXProvider;
    else
      return null;
  }
}