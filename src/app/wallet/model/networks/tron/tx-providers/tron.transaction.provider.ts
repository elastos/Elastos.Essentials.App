import { StandardCoinName } from "../../../coin";
import { TronTransaction } from "../../../tron.types";
import { AnySubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { TRC20SubWallet } from "../subwallets/trc20.subwallet";
import { TronSubWallet } from "../subwallets/tron.subwallet";
import { TronSubWalletProvider } from "./tron.subwallet.provider";
import { TronSubWalletTokenProvider } from "./tron.token.subwallet.provider";

export class TronTransactionProvider extends TransactionProvider<TronTransaction> {
  private mainProvider: TronSubWalletProvider<TronSubWallet>;
  protected tokenProvider: TronSubWalletTokenProvider<TronSubWallet>;

  public async start(): Promise<void> {
    super.start()

    let subwallet = this.networkWallet.getSubWallet(StandardCoinName.TRON) as TronSubWallet;

    this.mainProvider = this.createTronSubWalletProvider(subwallet);
    await this.mainProvider.initialize();

    this.tokenProvider = this.createTVMTokenSubWalletProvider(subwallet);
    await this.tokenProvider.initialize();
  }

  /**
   * Creates the TVM subwallet provider (main token) - can be overriden if needed, but usually the
   * standard TVM subwallet provider is enough.
   */
  protected createTronSubWalletProvider(mainCoinSubWallet: TronSubWallet): TronSubWalletProvider<TronSubWallet> {
    return new TronSubWalletProvider(this, mainCoinSubWallet, this.networkWallet.network.getRPCUrl());
  }

  protected createTVMTokenSubWalletProvider(mainCoinSubWallet: TronSubWallet) {
    return new TronSubWalletTokenProvider(this, mainCoinSubWallet, this.networkWallet.network.getRPCUrl());
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof TronSubWallet)
      return this.mainProvider;
    else if (subWallet instanceof TRC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}