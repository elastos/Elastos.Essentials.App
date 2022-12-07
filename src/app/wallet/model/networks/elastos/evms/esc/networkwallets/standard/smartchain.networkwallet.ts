import type { ConfigInfo } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { GlobalNetworksService } from "src/app/services/global.networks.service";
import { AnySubWallet } from "src/app/wallet/model/networks/base/subwallets/subwallet";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { StandardCoinName } from "../../../../../../coin";
import { StandardMasterWallet } from "../../../../../../masterwallets/masterwallet";
import { TransactionProvider } from "../../../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../../../base/networkwallets/networkwallet";
import { ElastosStandardEVMNetworkWallet } from "../../../networkwallets/standard/standard.evm.networkwallet";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";
import { EscSubWallet } from "../../subwallets/esc.evm.subwallet";
import { ElastosSmartChainTransactionProvider } from "../../tx-providers/elastos.esc.tx.provider";

export class ElastosSmartChainStandardNetworkWallet extends ElastosStandardEVMNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: EVMNetwork) {
    super(
      masterWallet,
      network,
      "ELA",
      "Elastos Smart Chain"
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
      let networkConfig: ConfigInfo = {};
      this.network.updateSPVNetworkConfig(networkConfig, GlobalNetworksService.instance.getActiveNetworkTemplate())
      if (networkConfig['ETHSC']) {
        this.subWallets[StandardCoinName.ETHSC] = this.mainTokenSubWallet;
      }
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos EVM subwallets ", err);
    }
    return Promise.resolve();
  }

  public getAddresses(): WalletAddressInfo[] {
    let addresses = [];

    // No ETHSC in LRW.
    if (this.subWallets[StandardCoinName.ETHSC]) {
      addresses.push({
        title: this.subWallets[StandardCoinName.ETHSC].getFriendlyName(),
        address: this.subWallets[StandardCoinName.ETHSC].getCurrentReceiverAddress()
      });
    }

    return addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return this.mainTokenSubWallet as ElastosEVMSubWallet;
  }

  public getMainTokenSubWallet(): AnySubWallet {
    return this.mainTokenSubWallet;
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}