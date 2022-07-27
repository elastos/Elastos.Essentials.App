import { BTCTransaction } from "../../../btc.types";
import { StandardCoinName } from "../../../coin";
import { AnySubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { BTCSubWallet } from "../subwallets/btc.subwallet";
import { BTCSubWalletProvider } from "./btc.subwallet.provider";

export class BTCTransactionProvider extends TransactionProvider<BTCTransaction> {
  private mainProvider: BTCSubWalletProvider<BTCSubWallet>;

  public async start(): Promise<void> {
    super.start()

    this.mainProvider = this.createBTCSubWalletProvider();
    await this.mainProvider.initialize();
  }

  /**
   * Creates the EVM subwallet provider (main token) - can be overriden if needed, but usually the
   * standard EVM subwallet provider is enough.
   */
  protected createBTCSubWalletProvider(): BTCSubWalletProvider<BTCSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(StandardCoinName.BTC) as BTCSubWallet;
    return new BTCSubWalletProvider(this, subwallet, this.networkWallet.network.getRPCUrl());
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return this.mainProvider;
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}