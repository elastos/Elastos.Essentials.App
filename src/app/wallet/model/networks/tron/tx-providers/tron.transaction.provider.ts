import { StandardCoinName } from "../../../coin";
import { TronTransaction } from "../../../tron.types";
import { AnySubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { TronSubWallet } from "../subwallets/tron.subwallet";
import { TronSubWalletProvider } from "./tron.subwallet.provider";

export class TronTransactionProvider extends TransactionProvider<TronTransaction> {
  private mainProvider: TronSubWalletProvider<TronSubWallet>;

  public async start(): Promise<void> {
    super.start()

    this.mainProvider = this.createTronSubWalletProvider();
    await this.mainProvider.initialize();
  }

  /**
   * Creates the EVM subwallet provider (main token) - can be overriden if needed, but usually the
   * standard EVM subwallet provider is enough.
   */
  protected createTronSubWalletProvider(): TronSubWalletProvider<TronSubWallet> {
    let subwallet = this.networkWallet.getSubWallet(StandardCoinName.TRON) as TronSubWallet;
    return new TronSubWalletProvider(this, subwallet, this.networkWallet.network.getRPCUrl());
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return this.mainProvider;
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}