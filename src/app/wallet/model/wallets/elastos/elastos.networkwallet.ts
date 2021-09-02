import { StandardCoinName } from "../../Coin";
import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../networkwallet";
import { MainchainSubWallet } from "./mainchain.subwallet";
import { ElastosEVMSubWallet } from "./elastos.evm.subwallet";
import { Network } from "../../networks/network";
import { IDChainSubWallet } from "./idchain.subwallet";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { ERC20TokenInfo, EthTransaction } from "../../evm.types";
import { EscSubWallet } from "./esc.evm.subwallet";
import { EidSubWallet } from "./eid.evm.subwallet";
import { Logger } from "src/app/logger";
import { ElastosTransactionProvider } from "./providers/elastos.transaction.provider";
import { TransactionProvider } from "../../providers/transaction.provider";
import { WalletHelper } from "./wallet.helper";
import { ElastosTransaction } from "../../providers/transaction.types";

export class ElastosNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: ElastosEVMSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network);

    this.transactionDiscoveryProvider = new ElastosTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new EscSubWallet(this);

    Logger.log("wallet", "Registering Elastos standard subwallets to the SPVSDK");
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ELA);
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.IDChain);
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHSC);
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHDID);

    Logger.log("wallet", "Creating Elastos standard subwallets");
    this.subWallets[StandardCoinName.ELA] = new MainchainSubWallet(this);
    this.subWallets[StandardCoinName.ETHSC] = this.mainTokenSubWallet;
    this.subWallets[StandardCoinName.IDChain] = new IDChainSubWallet(this);
    this.subWallets[StandardCoinName.ETHDID] = new EidSubWallet(this);

    Logger.log("wallet", "Elastos standard subwallets preparation completed");
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet<EthTransaction> {
    return this.mainTokenSubWallet;
  }

  /**
   * Tells whether this wallet currently has many addresses in use or not.
   */
  public async multipleAddressesInUse(): Promise<boolean> {
    let mainchainSubwallet : MainchainSubWallet = this.subWallets[StandardCoinName.ELA] as MainchainSubWallet;
    let txListsInternal = await WalletHelper.getTransactionByAddress(mainchainSubwallet, true, 0);
    if (txListsInternal.length > 1) {
      return true;
    }
    let txListsExternal = await WalletHelper.getTransactionByAddress(mainchainSubwallet, false, 0);
    if (txListsExternal.length > 1) {
      return true;
    }

    return false;
  }

  public getDisplayTokenName(): string {
    return 'ELA';
  }

  /**
   * For now, the elastos network gets tokens only from the ESC chain, not from EID.
   */
  public async getERCTokensList(): Promise<ERC20TokenInfo[]> {
    let tokenSubWallet = this.getMainEvmSubWallet();
    const address = await tokenSubWallet.getTokenAddress();
    let tokenList = await GlobalElastosAPIService.instance.getERC20TokenList(StandardCoinName.ETHSC, address);
    return tokenList;
  }
}