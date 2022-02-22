import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { jsToSpvWalletId, SPVService } from "src/app/wallet/services/spv.service";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { StandardCoinName } from "../../../../coin";
import { Network } from "../../../../networks/network";
import { ElastosSmartChainTransactionProvider } from "../../../../tx-providers/elastos/elastos.smartchain.tx.provider";
import { TransactionProvider } from "../../../../tx-providers/transaction.provider";
import { StandardMasterWallet } from "../../../masterwallet";
import { WalletAddressInfo } from "../../../networkwallet";
import { ElastosEVMSubWallet } from "../subwallets/elastos.evm.subwallet";
import { EscSubWallet } from "../subwallets/esc.evm.subwallet";
import { ElastosStandardNetworkWallet } from "./elastos.networkwallet";

export class ElastosSmartChainStandardNetworkWallet extends ElastosStandardNetworkWallet {
  private mainTokenSubWallet: ElastosEVMSubWallet = null;

  constructor(masterWallet: StandardMasterWallet, network: Network) {
    super(masterWallet, network, "ELA");
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosSmartChainTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new EscSubWallet(this);

    try {
      // TODO: No ETHSC in LRW
      // Remove it if there is ETHSC in LRW.
      let networkConfig: SPVNetworkConfig = {};
      this.network.updateSPVNetworkConfig(networkConfig, GlobalNetworksService.instance.getActiveNetworkTemplate())
      if (networkConfig['ETHSC']) {
        await SPVService.instance.createSubWallet(jsToSpvWalletId(this.masterWallet.id), StandardCoinName.ETHSC);
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

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return this.mainTokenSubWallet;
  }

  public getDisplayTokenName(): string {
    return 'ELA';
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}