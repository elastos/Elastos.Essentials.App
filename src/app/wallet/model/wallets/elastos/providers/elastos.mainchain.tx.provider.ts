import { StandardCoinName } from "../../../coin";
import { AnySubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { ElastosTransaction } from "../../../providers/transaction.types";
import { AnySubWallet } from "../../subwallet";
import { IDChainSubWallet } from "../idchain.subwallet";
import { MainchainSubWallet } from "../mainchain.subwallet";
import { ElastosMainAndOldIDChainSubWalletProvider } from "./mainandidchain.subwallet.provider";

export class ElastosMainChainTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaSubWallet: MainchainSubWallet;
  private oldIdSubWallet: IDChainSubWallet;

  private mainChainProvider: ElastosMainAndOldIDChainSubWalletProvider<MainchainSubWallet>;
  private oldIdChainProvider: ElastosMainAndOldIDChainSubWalletProvider<IDChainSubWallet>;

  public async start(): Promise<void> {
    this.elaSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
    this.oldIdSubWallet = this.networkWallet.getSubWallet(StandardCoinName.IDChain) as IDChainSubWallet;

    this.mainChainProvider = new ElastosMainAndOldIDChainSubWalletProvider(this, this.elaSubWallet);
    await this.mainChainProvider.initialize();

    this.oldIdChainProvider = new ElastosMainAndOldIDChainSubWalletProvider(this, this.oldIdSubWallet);
    await this.oldIdChainProvider.initialize();
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainchainSubWallet)
      return this.mainChainProvider;
    else if (subWallet instanceof IDChainSubWallet)
      return this.oldIdChainProvider;
    else
      throw new Error("Elastos main chain transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }

  protected getSubWalletInternalTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}