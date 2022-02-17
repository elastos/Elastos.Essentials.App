import { Logger } from "src/app/logger";
import { StandardCoinName } from "../../../coin";
import { Network } from "../../../networks/network";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { MasterWallet } from "../../masterwallet";
import { NetworkWallet, WalletAddressInfo } from "../../networkwallet";
import { IDChainSubWallet } from "../idchain.subwallet";
import { MainchainSubWallet } from "../mainchain.subwallet";
import { ElastosMainChainTransactionProvider } from "../providers/elastos.mainchain.tx.provider";
import { WalletHelper } from "../wallet.helper";

export class ElastosMainChainNetworkWallet extends NetworkWallet {
  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosMainChainTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ELA);
      await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.IDChain);

      this.subWallets[StandardCoinName.ELA] = new MainchainSubWallet(this);
      this.subWallets[StandardCoinName.IDChain] = new IDChainSubWallet(this);

      await this.subWallets[StandardCoinName.ELA].initialize();
      await this.subWallets[StandardCoinName.IDChain].initialize();
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos main chain standard subwallets ", err);
    }
  }

  public async getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = [];

    // No ELA when imported by private key.
    if (this.subWallets[StandardCoinName.ELA]) {
      addresses.push({
        title: this.subWallets[StandardCoinName.ELA].getFriendlyName(),
        address: await this.subWallets[StandardCoinName.ELA].createAddress()
      });
    }

    return addresses;
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet {
    return null;
  }

  /**
   * Tells whether this wallet currently has many addresses in use or not.
   */
  public async multipleAddressesInUse(): Promise<boolean> {
    let mainchainSubwallet: MainchainSubWallet = this.subWallets[StandardCoinName.ELA] as MainchainSubWallet;
    let txListsInternal = await WalletHelper.getTransactionByAddress(mainchainSubwallet, true, 2);
    if (txListsInternal.length > 1) {
      return true;
    }
    let txListsExternal = await WalletHelper.getTransactionByAddress(mainchainSubwallet, false, 2);
    if (txListsExternal.length > 1) {
      return true;
    }

    return false;
  }

  public getDisplayTokenName(): string {
    return 'ELA';
  }

  public getAverageBlocktime(): number {
    return 120;
  }

  public supportsERC20Coins() {
    return false;
  }

  public supportsERCNFTs() {
    return false;
  }
}