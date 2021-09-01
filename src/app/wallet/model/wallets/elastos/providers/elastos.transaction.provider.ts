import { Subject } from "rxjs";
import { Logger } from "src/app/logger";
import { JSONObject } from "src/app/model/json";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { StandardCoinName, TokenAddress } from "../../../Coin";
import { EthTransaction } from "../../../evm.types";
import { TimeBasedPersistentCache } from "../../../timebasedpersistentcache";
import { ElastosPaginatedTransactions, ElastosTransaction, GenericTransaction, PaginatedTransactions, TransactionDirection, TransactionStatus } from "../../../transaction.types";
import { NewToken, NewTransaction, TransactionProvider, SubWalletTransactionProvider, AnySubWalletTransactionProvider } from "../../../transaction.provider";
import { NetworkWallet } from "../../networkwallet";
import { AnySubWallet, SubWallet } from "../../subwallet";
import { EidSubWallet } from "../eid.evm.subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";
import { IDChainSubWallet } from "../idchain.subwallet";
import { MainchainSubWallet } from "../mainchain.subwallet";
import { StandardSubWallet } from "../../standard.subwallet";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { ElastosAPI } from "../elastos.api";
import { ElastosERC20SubWallet } from "../elastos.erc20.subwallet";
import { WalletHelper } from "../wallet.helper";
import { MainchainProvider } from "./mainchain.transaction.provider";
import { EscProvider } from "./esc.transaction.provider";
import { TokenProvider } from "./token.transaction.provider";
import { EidProvider } from "./eid.transaction.provider";

export class ElastosTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaSubWallet: MainchainSubWallet;
  private oldIdSubWallet: IDChainSubWallet;
  private escSubWallet: EscSubWallet;
  private eidSubWallet: EidSubWallet;

  private mainChainProvider: MainchainProvider;
  private escProvider: EscProvider;
  private eidProvider: EscProvider;
  private tokenProvider: TokenProvider;

  constructor(private networkWallet: NetworkWallet) {
    super();
  }

  public async start(): Promise<void> {
    this.elaSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ELA) as MainchainSubWallet;
    this.oldIdSubWallet = this.networkWallet.getSubWallet(StandardCoinName.IDChain) as IDChainSubWallet;
    this.escSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHSC) as EscSubWallet;
    this.eidSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHDID) as EidSubWallet;

    this.mainChainProvider = new MainchainProvider(this, this.elaSubWallet);
    await this.mainChainProvider.initialize();

    this.escProvider = new EscProvider(this, this.escSubWallet);
    await this.escProvider.initialize();

    this.eidProvider = new EidProvider(this, this.eidSubWallet);
    await this.eidProvider.initialize();

    this.tokenProvider = new TokenProvider(this, this.escSubWallet);
    await this.tokenProvider.initialize();

    void this.refreshAll();
  }

  private rearmRefreshTimeout() {
    setTimeout(() => {
      void this.refreshAll();
    }, 30000); // 30s
  }

  private async refreshAll(): Promise<void> {
    await Promise.all([
      this.mainChainProvider.fetchTransactions(),
      // TODO this.idChainProvider.fetchTransactions(),
      this.escProvider.fetchTransactions(),
      this.eidProvider.fetchTransactions(),
      this.tokenProvider.fetchTransactions(),
    ]);

    // Only restart a timer after all current operations are complete. We don't want to use an internal
    // that would create many slow updates in parrallel.
    this.rearmRefreshTimeout();
  }

  public stop(): Promise<void> {
    // TODO
    return;
  }

  public getTransactions(subWallet: SubWallet<GenericTransaction>, startIndex = 0): ElastosTransaction[] {
    return this.getSubWalletTransactionProvider(subWallet).getTransactions(subWallet, startIndex);
  }

  public canFetchMoreTransactions(subWallet: AnySubWallet): boolean {
    return this.getSubWalletTransactionProvider(subWallet).canFetchMoreTransactions(subWallet);
  }

  public forcedFetchTransactions(subWallet: AnySubWallet, afterTransaction?: GenericTransaction) {
    return this.getSubWalletTransactionProvider(subWallet).forcedFetchTransactions(subWallet, afterTransaction);
  }

  public prepareTransactions(subWallet: AnySubWallet): Promise<void> {
    return this.getSubWalletTransactionProvider(subWallet).prepareTransactions(subWallet);
  }

  private getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof MainchainSubWallet) return this.mainChainProvider;
    else if (subWallet instanceof EscSubWallet) return this.escProvider;
    else if (subWallet instanceof EidSubWallet) return this.eidProvider;
    else if (subWallet instanceof ElastosERC20SubWallet) return this.tokenProvider;
    else
      throw new Error("getTransactions for UNKNOWN SUBWALLET: NOT IMPLEMENTED");
  }
}