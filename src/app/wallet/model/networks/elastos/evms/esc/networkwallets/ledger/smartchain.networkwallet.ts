import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { EVMSafe } from "src/app/wallet/model/networks/evms/safes/evm.safe";
import { SPVNetworkConfig } from "src/app/wallet/services/wallet.service";
import { StandardCoinName } from "../../../../../../coin";
import { TransactionProvider } from "../../../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../../../base/networkwallets/networkwallet";
import { AnyNetwork } from "../../../../../network";
import { ElastosLedgerNetworkWallet } from "../../../../networkwallets/ledger/elastos.networkwallet";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";
import { EscSubWallet } from "../../subwallets/esc.evm.subwallet";
import { ElastosSmartChainTransactionProvider } from "../../tx-providers/elastos.esc.tx.provider";

export class ElastosSmartChainLedgerNetworkWallet extends ElastosLedgerNetworkWallet {
  private mainTokenSubWallet: ElastosEVMSubWallet = null;

  constructor(masterWallet: LedgerMasterWallet, network: AnyNetwork) {
    super(
      masterWallet,
      network,
      new EVMSafe(masterWallet),
      "ELA"
    );
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosSmartChainTransactionProvider(this);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new EscSubWallet(this);

    try {
      // TODO: No ETHSC in LRW
      // Remove it if there is ETHSC in LRW.
      let networkConfig: SPVNetworkConfig = {};
      this.network.updateSPVNetworkConfig(networkConfig, GlobalNetworksService.instance.getActiveNetworkTemplate())
      if (networkConfig['ETHSC']) {
        this.subWallets[StandardCoinName.ETHSC] = this.mainTokenSubWallet;
        // await this.subWallets[StandardCoinName.ETHSC].initialize();
      } else {
        this.mainTokenSubWallet = this.subWallets[StandardCoinName.ETHDID] as ElastosEVMSubWallet;
      }

      // Logger.log("wallet", "Elastos standard subwallets preparation completed");
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos EVM subwallets ", err);
    }

    return;
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
    Logger.warn("wallet", "ElastosSmartChainLedgerNetworkWallet getAddresses ", addresses);
    return addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return this.mainTokenSubWallet;
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}