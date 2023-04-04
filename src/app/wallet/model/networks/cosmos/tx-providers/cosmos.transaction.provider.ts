import { CosmosTransaction } from "../../../cosmos.types";
import { AnySubWalletTransactionProvider, SubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { CosmosNetworkWallet } from "../networkwallets/cosmos.networkwallet";
import { AnyMainCoinCosmosSubWallet, MainCoinCosmosSubWallet } from "../subwallets/cosmos.subwallet";
import { CosmosSubWalletProvider } from "./cosmos.subwallet.provider";

/**
 * Base transaction provider for regular cosmos networks.
 */
export class CosmosTransactionProvider extends TransactionProvider<CosmosTransaction> {
  protected mainProvider: SubWalletTransactionProvider<MainCoinCosmosSubWallet<any>, CosmosTransaction> = null;

  constructor(protected networkWallet: CosmosNetworkWallet<any, any>) {
    super(networkWallet);
  }

  public async start() {
    super.start()

    let subWallet = this.networkWallet.getSubWallet(this.networkWallet.network.key) as AnyMainCoinCosmosSubWallet;

    this.createCosmosSubWalletProvider(subWallet);
    if (this.mainProvider)
      await this.mainProvider.initialize();
  }

  /**
   * Creates the Cosmos subwallet provider (main token).
   * this.mainProvider must be initialized after that.
   */
  protected createCosmosSubWalletProvider(subWallet: AnyMainCoinCosmosSubWallet) {
    this.mainProvider = new CosmosSubWalletProvider(this, subWallet);
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainCoinCosmosSubWallet)
      return this.mainProvider;
    else
      throw new Error("Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}