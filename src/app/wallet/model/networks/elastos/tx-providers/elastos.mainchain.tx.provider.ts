import { StandardCoinName } from "../../../coin";
import { AnySubWalletTransactionProvider } from "../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../tx-providers/transaction.provider";
import { ElastosTransaction } from "../../../tx-providers/transaction.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { MainChainSubWallet } from "../subwallets/mainchain.subwallet";
import { ElastosMainAndOldIDChainSubWalletProvider } from "./mainandidchain.subwallet.provider";

export class ElastosMainChainTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaSubWallet: MainChainSubWallet;

  private mainChainProvider: ElastosMainAndOldIDChainSubWalletProvider<MainChainSubWallet>;

  public async start(): Promise<void> {
    this.elaSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as MainChainSubWallet;

    this.mainChainProvider = new ElastosMainAndOldIDChainSubWalletProvider(this, this.elaSubWallet);
    await this.mainChainProvider.initialize();
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainChainSubWallet)
      return this.mainChainProvider;
    else
      throw new Error("Elastos main chain transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}