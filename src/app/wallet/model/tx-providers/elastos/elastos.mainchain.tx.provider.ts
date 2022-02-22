import { StandardCoinName } from "../../coin";
import { MainChainSubWallet } from "../../wallets/elastos/standard/subwallets/mainchain.subwallet";
import { AnySubWallet } from "../../wallets/subwallet";
import { AnySubWalletTransactionProvider } from "../subwallet.provider";
import { TransactionProvider } from "../transaction.provider";
import { ElastosTransaction } from "../transaction.types";
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