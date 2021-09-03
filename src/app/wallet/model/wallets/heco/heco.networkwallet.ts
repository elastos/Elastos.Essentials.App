import { StandardCoinName } from "../../Coin";
import { EthTransaction } from "../../evm.types";
import { Network } from "../../networks/network";
import { TransactionProvider } from "../../providers/transaction.provider";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../networkwallet";
import { HECOChainSubWallet } from "./heco.subwallet";
import { HecoTransactionProvider } from "./providers/heco.transaction.provider";

export class HecoNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: HECOChainSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network);

    this.transactionDiscoveryProvider = new HecoTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new HECOChainSubWallet(this);
    this.subWallets[StandardCoinName.ETHHECO] = this.mainTokenSubWallet;
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHHECO);
  }

  public getDisplayTokenName(): string {
    return 'HT';
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet<EthTransaction> {
    return this.mainTokenSubWallet;
  }

  public getTransactionDiscoveryProvider(): TransactionProvider<EthTransaction> {
    return this.transactionDiscoveryProvider;
  }
}