import { Logger } from "src/app/logger";
import { StandardCoinName } from "../../../../../coin";
import { LedgerMasterWallet } from "../../../../../masterwallets/ledger.masterwallet";
import { TransactionProvider } from "../../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../../base/networkwallets/networkwallet";
import { AnyNetwork } from "../../../../network";
import { ElastosEVMSubWallet } from "../../../evms/subwallets/standard/elastos.evm.subwallet";
import { ElastosLedgerNetworkWallet } from "../../../networkwallets/ledger/elastos.networkwallet";
import { MainChainLedgerSafe } from "../../safes/ledger/mainchain.ledger.safe";
import { MainChainSubWallet } from "../../subwallets/mainchain.subwallet";
import { ElastosMainChainTransactionProvider } from "../../tx-providers/elastos.mainchain.tx.provider";

export class ElastosMainChainLedgerNetworkWallet extends ElastosLedgerNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: AnyNetwork) {
    super(
      masterWallet,
      network,
      new MainChainLedgerSafe(),
      "ELA"
    );
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosMainChainTransactionProvider(this);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    try {
      this.subWallets[StandardCoinName.ELA] = new MainChainSubWallet(this);
      await this.subWallets[StandardCoinName.ELA].initialize();
    }
    catch (err) {
      Logger.error("wallet", "Can not create Elastos main chain ledger subwallet", err);
    }
  }

  public getAddresses(): Promise<WalletAddressInfo[]> {
    let addresses = Promise.resolve([]);

    // TODO: get addresses from ledger

    return addresses;
  }

  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return null;
  }

  public getAverageBlocktime(): number {
    return 120;
  }
}
