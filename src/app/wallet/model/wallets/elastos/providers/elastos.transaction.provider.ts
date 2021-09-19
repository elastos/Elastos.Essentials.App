import { StandardCoinName } from "../../../coin";
import { AnySubWalletTransactionProvider } from "../../../providers/subwallet.provider";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { ElastosTransaction } from "../../../providers/transaction.types";
import { AnySubWallet } from "../../subwallet";
import { EidSubWallet } from "../eid.evm.subwallet";
import { ElastosERC20SubWallet } from "../elastos.erc20.subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";
import { IDChainSubWallet } from "../idchain.subwallet";
import { MainchainSubWallet } from "../mainchain.subwallet";
import { ElastosEidSubWalletProvider } from "./eid.subwallet.provider";
import { ElastosEscSubWalletProvider } from "./esc.subwallet.provider";
import { ElastosMainAndOldIDChainSubWalletProvider } from "./mainandidchain.subwallet.provider";
import { ElastosTokenSubWalletProvider } from "./token.subwallet.provider";

export class ElastosTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaSubWallet: MainchainSubWallet;
  private oldIdSubWallet: IDChainSubWallet;
  private escSubWallet: EscSubWallet;
  private eidSubWallet: EidSubWallet;

  private mainChainProvider: ElastosMainAndOldIDChainSubWalletProvider<MainchainSubWallet>;
  private oldIdChainProvider: ElastosMainAndOldIDChainSubWalletProvider<IDChainSubWallet>;
  private escProvider: ElastosEscSubWalletProvider;
  private eidProvider: ElastosEscSubWalletProvider;
  private tokenProvider: ElastosTokenSubWalletProvider;

  public async start(): Promise<void> {
    this.elaSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
    this.oldIdSubWallet = this.networkWallet.getSubWallet(StandardCoinName.IDChain) as IDChainSubWallet;
    this.escSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHSC) as EscSubWallet;
    this.eidSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHDID) as EidSubWallet;

    this.mainChainProvider = new ElastosMainAndOldIDChainSubWalletProvider(this, this.elaSubWallet);
    await this.mainChainProvider.initialize();

    this.oldIdChainProvider = new ElastosMainAndOldIDChainSubWalletProvider(this, this.oldIdSubWallet);
    await this.oldIdChainProvider.initialize();

    this.escProvider = new ElastosEscSubWalletProvider(this, this.escSubWallet);
    await this.escProvider.initialize();

    this.eidProvider = new ElastosEidSubWalletProvider(this, this.eidSubWallet);
    await this.eidProvider.initialize();

    this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.escSubWallet);
    await this.tokenProvider.initialize();

    // Discover new transactions globally for all tokens at once, in order to notify user
    // of NEW tokens received, and NEW payments received for existing tokens.
    this.refreshEvery(() => this.tokenProvider.discoverTokens(), 30000);
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainchainSubWallet)
      return this.mainChainProvider;
    if (subWallet instanceof IDChainSubWallet)
      return this.oldIdChainProvider;
    else if (subWallet instanceof EscSubWallet)
      return this.escProvider;
    else if (subWallet instanceof EidSubWallet)
      return this.eidProvider;
    else if (subWallet instanceof ElastosERC20SubWallet)
      return this.tokenProvider;
    else
      throw new Error("Elastos transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!");
  }
}