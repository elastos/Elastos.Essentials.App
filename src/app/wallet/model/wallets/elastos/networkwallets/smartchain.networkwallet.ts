import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { StandardCoinName } from "../../../coin";
import { Network } from "../../../networks/network";
import { TransactionProvider } from "../../../providers/transaction.provider";
import { StandardEVMSubWallet } from "../../evm.subwallet";
import { MasterWallet } from "../../masterwallet";
import { NetworkWallet, WalletAddressInfo } from "../../networkwallet";
import { ElastosEVMSubWallet } from "../elastos.evm.subwallet";
import { EscSubWallet } from "../esc.evm.subwallet";
import { ElastosTransactionProvider } from "../providers/elastos.transaction.provider";

export class ElastosSmartChainNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: ElastosEVMSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new EscSubWallet(this);

    try {
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

  public getDisplayTokenName(): string {
    return 'ELA';
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}