import { StandardCoinName } from "../../../../../coin";
import { AnySubWalletTransactionProvider } from "../../../../../tx-providers/subwallet.provider";
import { TransactionProvider } from "../../../../../tx-providers/transaction.provider";
import { ElastosTransaction } from "../../../../../tx-providers/transaction.types";
import { EidSubWallet } from "../subwallets/standard/eid.evm.subwallet";
import { ElastosEidSubWalletProvider } from "./eid.subwallet.provider";

export class ElastosIdentityTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private eidSubWallet: EidSubWallet;

  private eidProvider: ElastosEidSubWalletProvider;

  public async start(): Promise<void> {
    super.start()

    this.eidSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHDID) as EidSubWallet;

    this.eidProvider = new ElastosEidSubWalletProvider(this, this.eidSubWallet);
    await this.eidProvider.initialize();
  }

  protected getSubWalletTransactionProvider(subWallet: EidSubWallet): AnySubWalletTransactionProvider {
    return this.eidProvider;
  }

  protected getSubWalletInternalTransactionProvider(subWallet: EidSubWallet): AnySubWalletTransactionProvider {
    return null;
  }
}