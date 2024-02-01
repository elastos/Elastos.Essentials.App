import { Logger } from "src/app/logger";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { StandardMasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";
import { WalletAddressInfo } from "src/app/wallet/model/networks/base/networkwallets/networkwallet";
import { AnySubWallet } from "src/app/wallet/model/networks/base/subwallets/subwallet";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { TransactionProvider } from "src/app/wallet/model/tx-providers/transaction.provider";
import { ElastosStandardEVMNetworkWallet } from "../../../networkwallets/standard/standard.evm.networkwallet";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";
import { EidSubWallet } from "../../subwallets/standard/eid.evm.subwallet";
import { ElastosIdentityTransactionProvider } from "../../tx-providers/elastos.eid.tx.provider";

export class ElastosIdentityChainStandardNetworkWallet extends ElastosStandardEVMNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: EVMNetwork) {
    super(
      masterWallet,
      network,
      "ELA",
      "Elastos ID Chain"
    );
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosIdentityTransactionProvider(this);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    try {
      this.subWallets[StandardCoinName.ETHDID] = new EidSubWallet(this);
    }
    catch (err) {
      Logger.error("wallet", "Can not Create Elastos EID subwallet", err);
    }
    return Promise.resolve();
  }

  public getAddresses(): WalletAddressInfo[] {
    let addresses = [];

    // No ETHDID in LRW.
    if (this.subWallets[StandardCoinName.ETHDID]) {
      addresses.push({
        // title: this.subWallets[StandardCoinName.ETHDID].getFriendlyName(),
        title: "EVM",
        address: this.subWallets[StandardCoinName.ETHDID].getCurrentReceiverAddress()
      });
    }

    return addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return null;
  }

  public getMainTokenSubWallet(): AnySubWallet {
    return this.subWallets[StandardCoinName.ETHDID];
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}