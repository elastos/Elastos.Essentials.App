import { Logger } from "src/app/logger";
import { StandardCoinName } from "src/app/wallet/model/coin";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { WalletAddressInfo } from "src/app/wallet/model/networks/base/networkwallets/networkwallet";
import { AnySubWallet } from "src/app/wallet/model/networks/base/subwallets/subwallet";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { TransactionProvider } from "src/app/wallet/model/tx-providers/transaction.provider";
import { ElastosLedgerEVMNetworkWallet } from "../../../networkwallets/ledger/ledger.evm.networkwallet";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";
import { EidSubWallet } from "../../subwallets/standard/eid.evm.subwallet";
import { ElastosIdentityTransactionProvider } from "../../tx-providers/elastos.eid.tx.provider";

export class ElastosIdentityChainLedgerNetworkWallet extends ElastosLedgerEVMNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: EVMNetwork) {
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
    return;
  }

  public async getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = [];

    // No ETHDID in LRW.
    if (this.subWallets[StandardCoinName.ETHDID]) {
      addresses.push({
        title: this.subWallets[StandardCoinName.ETHDID].getFriendlyName(),
        address: await this.subWallets[StandardCoinName.ETHDID].getCurrentReceiverAddress()
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