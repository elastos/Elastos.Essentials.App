import { EthTransaction } from "../evm.types";
import { ERC20SubWallet } from "../wallets/erc20.subwallet";
import { EVMNetworkWallet } from "../wallets/evm.networkwallet";
import { StandardEVMSubWallet } from "../wallets/evm.subwallet";
import { AnySubWallet } from "../wallets/subwallet";
import { EVMSubWalletInternalTransactionProvider } from "./evm.subwallet.internalTransaction.provider";
import { EVMSubWalletProvider } from "./evm.subwallet.provider";
import { AnySubWalletTransactionProvider } from "./subwallet.provider";
import { EVMSubWalletTokenProvider } from "./token.subwallet.provider";
import { TransactionProvider } from "./transaction.provider";

/**
 * STandard transaction provider for regular EVM networks.
 */
export class EVMTransactionProvider extends TransactionProvider<EthTransaction> {
  private mainProvider: EVMSubWalletProvider<StandardEVMSubWallet> = null;
  private tokenProvider: EVMSubWalletTokenProvider<StandardEVMSubWallet> = null;
  private internalTXProvider: EVMSubWalletInternalTransactionProvider<StandardEVMSubWallet> = null;

  constructor(protected networkWallet: EVMNetworkWallet) {
    super(networkWallet);
  }

  public async start() {
    this.mainProvider = this.createEVMSubWalletProvider();
    await this.mainProvider.initialize();

    this.tokenProvider = this.createEVMTokenSubWalletProvider();
    await this.tokenProvider.initialize();

    this.internalTXProvider = this.createEVMSubWalletInternalTransactionProvider();
    await this.internalTXProvider.initialize();

    this.isRunning = true;

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    this.refreshEvery(() => this.tokenProvider.fetchAllTokensTransactions(), 30000);
  }

  /**
   * Creates the EVM subwallet provider (main token) - can be overriden if needed, but usually the
   * standard EVM subwallet provider is enough.
   */
  protected createEVMSubWalletProvider(): EVMSubWalletProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new EVMSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  /**
   * Creates the token subwallet provider - can be overriden if needed, but usually the
   * standard token subwallet provider is enough.
   */
  protected createEVMTokenSubWalletProvider(): EVMSubWalletTokenProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new EVMSubWalletTokenProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected createEVMSubWalletInternalTransactionProvider(): EVMSubWalletInternalTransactionProvider<StandardEVMSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(this.networkWallet.network.getEVMSPVConfigName()) as StandardEVMSubWallet;
    return new EVMSubWalletInternalTransactionProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof StandardEVMSubWallet)
      return this.mainProvider;
    else if (subWallet instanceof ERC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof StandardEVMSubWallet)
      return this.internalTXProvider;
    else
      return null;
  }
}