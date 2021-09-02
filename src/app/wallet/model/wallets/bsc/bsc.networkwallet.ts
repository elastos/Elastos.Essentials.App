import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../networkwallet";
import { StandardCoinName } from "../../Coin";
import { Network } from "../../networks/network";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { ERC20TokenInfo } from "../../evm.types";
import { BscChainSubWallet } from "./bsc.subwallet";
import { TransactionProvider } from "../../providers/transaction.provider";
import { GenericTransaction } from "../../providers/transaction.types";
import { BSCTransactionProvider } from "./providers/bsc.transaction.provider";

export class BscNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: BscChainSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network);

    this.transactionDiscoveryProvider = new BSCTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new BscChainSubWallet(this);
    this.subWallets[StandardCoinName.ETHBSC] = this.mainTokenSubWallet;
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHBSC);
  }

  public getDisplayTokenName(): string {
    return 'BNB';
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet {
    return this.mainTokenSubWallet;
  }

  public async getERCTokensList(): Promise<ERC20TokenInfo[]> {
    return await []; // Not yet implemented
  }
}