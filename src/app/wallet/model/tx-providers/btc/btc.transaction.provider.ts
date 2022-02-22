import { BTCTransaction } from "../../btc.types";
import { StandardCoinName } from "../../coin";
import { BTCSubWallet } from "../../wallets/btc/standard/btc.subwallet";
import { AnySubWallet } from "../../wallets/subwallet";
import { AnySubWalletTransactionProvider } from "../subwallet.provider";
import { TransactionProvider } from "../transaction.provider";
import { BTCSubWalletProvider } from "./btc.subwallet.provider";

export class BTCTransactionProvider extends TransactionProvider<BTCTransaction> {
  private mainProvider: BTCSubWalletProvider<BTCSubWallet>;
  //   private tokenProvider: ElastosTokenSubWalletProvider;

  public async start(): Promise<void> {
    this.mainProvider = this.createBTCSubWalletProvider();
    await this.mainProvider.initialize();

    // this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.escSubWallet);
    // await this.tokenProvider.initialize();

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    // this.refreshEvery(() => this.tokenProvider.discoverTokens(), 30000);
  }

  /**
   * Creates the EVM subwallet provider (main token) - can be overriden if needed, but usually the
   * standard EVM subwallet provider is enough.
   */
  protected createBTCSubWalletProvider(): BTCSubWalletProvider<BTCSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(StandardCoinName.BTC) as BTCSubWallet;
    return new BTCSubWalletProvider(this, subwallet, this.networkWallet.network.getMainEvmRpcApiUrl());
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return this.mainProvider;
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}