import { Logger } from "src/app/logger";
import { LedgerMasterWallet } from "src/app/wallet/model/masterwallets/ledger.masterwallet";
import { AnySubWallet } from "src/app/wallet/model/networks/base/subwallets/subwallet";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { StandardCoinName } from "../../../../../../coin";
import { TransactionProvider } from "../../../../../../tx-providers/transaction.provider";
import { WalletAddressInfo } from "../../../../../base/networkwallets/networkwallet";
import { ElastosLedgerEVMNetworkWallet } from "../../../networkwallets/ledger/ledger.evm.networkwallet";
import { ElastosEVMSubWallet } from "../../../subwallets/standard/elastos.evm.subwallet";
import { PGPSubWallet } from "../../subwallets/pgp.evm.subwallet";
import { ElastosPGPChainTransactionProvider } from "../../tx-providers/elastos.pgp.tx.provider";

export class ElastosPGPLedgerNetworkWallet extends ElastosLedgerEVMNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: EVMNetwork) {
    super(masterWallet, network, 'PGA', 'PGP Chain', StandardCoinName.ETHECOPGP);
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosPGPChainTransactionProvider(this);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    try {
      this.mainTokenSubWallet = new PGPSubWallet(this);
      this.subWallets[StandardCoinName.ETHECOPGP] = this.mainTokenSubWallet;
    }
    catch (err) {
      Logger.error("wallet", "Can not Create PGP subwallets ", err);
    }

    return;
  }
}