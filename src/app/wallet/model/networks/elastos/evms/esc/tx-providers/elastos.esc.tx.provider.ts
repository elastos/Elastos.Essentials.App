import { StandardCoinName } from "../../../../../coin";
import { AnySubWalletTransactionProvider } from "../../../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../../../tx-providers/transaction.provider";
import { ElastosTransaction } from "../../../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../../../base/subwallets/subwallet";
import { AnyMainCoinEVMSubWallet } from "../../../../evms/subwallets/evm.subwallet";
import { EtherscanEVMSubWalletInternalTransactionProvider } from "../../../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider";
import { ElastosERC20SubWallet } from "../subwallets/elastos.erc20.subwallet";
import { EscSubWallet } from "../subwallets/esc.evm.subwallet";
import { ElastosEscSubWalletProvider } from "./esc.subwallet.provider";
import { ElastosTokenSubWalletProvider } from "./token.subwallet.provider";

export class ElastosSmartChainTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private escSubWallet: EscSubWallet;

  private escProvider: ElastosEscSubWalletProvider;
  private tokenProvider: ElastosTokenSubWalletProvider;

  // Only for ESC
  private internalTXProvider: EtherscanEVMSubWalletInternalTransactionProvider<AnyMainCoinEVMSubWallet> = null;

  public async start(): Promise<void> {
    this.escSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHSC) as EscSubWallet;

    // TODO: No ETHSC in LRW
    if (this.escSubWallet) {
      this.escProvider = new ElastosEscSubWalletProvider(this, this.escSubWallet);
      await this.escProvider.initialize();

      this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.escSubWallet);
      await this.tokenProvider.initialize();

      this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, this.escSubWallet, this.networkWallet.network.getMainEvmRpcApiUrl(), this.networkWallet.network.getMainEvmAccountApiUrl());
      await this.internalTXProvider.initialize();

      // Discover new transactions globally for all tokens at once, in order to notify user
      // of NEW tokens received, and NEW payments received for existing tokens.
      this.refreshEvery(() => this.tokenProvider.discoverTokens(), 30000);
    }
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof EscSubWallet)
      return this.escProvider;
    else if (subWallet instanceof ElastosERC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: EscSubWallet): AnySubWalletTransactionProvider {
    return this.internalTXProvider;
  }
}