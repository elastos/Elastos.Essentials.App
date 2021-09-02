import { StandardCoinName, } from "../../../Coin";
import { ElastosTransaction, GenericTransaction } from "../../../providers/transaction.types";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { NetworkWallet } from "../../networkwallet";
import { AnySubWallet, SubWallet } from "../../subwallet";
import { EidSubWallet } from "../eid.evm.subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";
import { IDChainSubWallet } from "../idchain.subwallet";
import { MainchainSubWallet } from "../mainchain.subwallet";
import { ElastosERC20SubWallet } from "../elastos.erc20.subwallet";
import { ElastosMainchainSubWalletProvider } from "./mainchain.subwallet.provider";
import { ElastosEscSubWalletProvider } from "./esc.subwallet.provider";
import { ElastosTokenSubWalletProvider } from "./token.subwallet.provider";
import { ElastosEidSubWalletProvider } from "./eid.subwallet.provider";
import { AnySubWalletTransactionProvider } from "../../../providers/subwallet.provider";

export class ElastosTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaSubWallet: MainchainSubWallet;
  private oldIdSubWallet: IDChainSubWallet;
  private escSubWallet: EscSubWallet;
  private eidSubWallet: EidSubWallet;

  private mainChainProvider: ElastosMainchainSubWalletProvider;
  private escProvider: ElastosEscSubWalletProvider;
  private eidProvider: ElastosEscSubWalletProvider;
  private tokenProvider: ElastosTokenSubWalletProvider;

  public async start(): Promise<void> {
    this.elaSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
    this.oldIdSubWallet = this.networkWallet.getSubWallet(StandardCoinName.IDChain) as IDChainSubWallet;
    this.escSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHSC) as EscSubWallet;
    this.eidSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHDID) as EidSubWallet;

    this.mainChainProvider = new ElastosMainchainSubWalletProvider(this, this.elaSubWallet);
    await this.mainChainProvider.initialize();

    this.escProvider = new ElastosEscSubWalletProvider(this, this.escSubWallet);
    await this.escProvider.initialize();

    this.eidProvider = new ElastosEidSubWalletProvider(this, this.eidSubWallet);
    await this.eidProvider.initialize();

    this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.escSubWallet);
    await this.tokenProvider.initialize();

    //this.refreshEvery(() => this.mainChainProvider.fetchTransactions(), 30000);
    // TODO this.idChainProvider.fetchTransactions(),
    //this.refreshEvery(() => this.escProvider.fetchTransactions(), 30000);
    //this.refreshEvery(() => this.eidProvider.fetchTransactions(), 30000);
    //this.refreshEvery(() => this.tokenProvider.fetchTransactions(), 30000);
  }

  public stop(): Promise<void> {
    // TODO
    return;
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainchainSubWallet)
      return this.mainChainProvider;
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