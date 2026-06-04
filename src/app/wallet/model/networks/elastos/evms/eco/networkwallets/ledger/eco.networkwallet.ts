import { Logger } from 'src/app/logger';
import { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { StandardCoinName } from '../../../../../../coin';
import { TransactionProvider } from '../../../../../../tx-providers/transaction.provider';
import { ElastosLedgerEVMNetworkWallet } from '../../../networkwallets/ledger/ledger.evm.networkwallet';
import { EcoSubWallet } from '../../subwallets/eco.evm.subwallet';
import { ElastosECOChainTransactionProvider } from '../../tx-providers/elastos.eco.tx.provider';

export class ElastosECOLedgerNetworkWallet extends ElastosLedgerEVMNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: EVMNetwork) {
    super(masterWallet, network, 'ELA', 'Elastos PGP ECO Chain', StandardCoinName.ETHECO);
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosECOChainTransactionProvider(this);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    try {
      this.mainTokenSubWallet = new EcoSubWallet(this);
      this.subWallets[StandardCoinName.ETHECO] = this.mainTokenSubWallet;
    } catch (err) {
      Logger.error('wallet', 'Can not Create Elastos ECO subwallets ', err);
    }

    return;
  }
}
