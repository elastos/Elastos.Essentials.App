import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { StandardCoinName } from "../../coin";
import { Network } from "../../networks/network";
import { TransactionProvider } from "../../providers/transaction.provider";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { MasterWallet } from "../masterwallet";
import { NetworkWallet, WalletAddressInfo } from "../networkwallet";
import { EidSubWallet } from "./eid.evm.subwallet";
import { ElastosEVMSubWallet } from "./elastos.evm.subwallet";
import { EscSubWallet } from "./esc.evm.subwallet";
import { IDChainSubWallet } from "./idchain.subwallet";
import { MainchainSubWallet } from "./mainchain.subwallet";
import { ElastosTransactionProvider } from "./providers/elastos.transaction.provider";
import { WalletHelper } from "./wallet.helper";

export class ElastosNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: ElastosEVMSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new EscSubWallet(this);

    // Logger.log("wallet", "Registering Elastos standard subwallets to the SPVSDK");
    try {
        await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ELA);
        await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.IDChain);
        // Logger.log("wallet", "Creating Elastos standard subwallets");
        this.subWallets[StandardCoinName.ELA] = new MainchainSubWallet(this);
        this.subWallets[StandardCoinName.IDChain] = new IDChainSubWallet(this);
        await this.subWallets[StandardCoinName.ELA].initialize();
        await this.subWallets[StandardCoinName.IDChain].initialize();
    }
    catch (err) {
        Logger.error("wallet", "Can not Create Elastos standard subwallets ", err);
    }

    try {
        // await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHSC);
        await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHDID);

        // this.subWallets[StandardCoinName.ETHSC] = this.mainTokenSubWallet;
        this.subWallets[StandardCoinName.ETHDID] = new EidSubWallet(this);

        await this.mainTokenSubWallet.initialize();
        await this.subWallets[StandardCoinName.ETHDID].initialize();

        // TODO: No ETHSC in LRW
        // Remove it if there is ETHSC in LRW.
        let networkConfig: SPVNetworkConfig = {};
        this.network.updateSPVNetworkConfig(networkConfig, GlobalNetworksService.instance.getActiveNetworkTemplate())
        if (networkConfig['ETHSC']) {
          await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHSC);
          this.subWallets[StandardCoinName.ETHSC] = this.mainTokenSubWallet;
        } else {
            this.mainTokenSubWallet = this.subWallets[StandardCoinName.ETHDID] as ElastosEVMSubWallet;
        }

        // Logger.log("wallet", "Elastos standard subwallets preparation completed");
    }
    catch (err) {
        Logger.error("wallet", "Can not Create Elastos EVM subwallets ", err);
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

    // No ETHSC in LRW.
    if (this.subWallets[StandardCoinName.ETHSC]) {
        addresses.push({
            title: this.subWallets[StandardCoinName.ETHSC].getFriendlyName(),
            address: await this.subWallets[StandardCoinName.ETHSC].createAddress()
        });
    }

    return addresses;
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet {
    return this.mainTokenSubWallet;
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
}