import { Logger } from 'src/app/logger';
import { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { StandardCoinName } from '../../../../../../coin';
import { TransactionProvider } from '../../../../../../tx-providers/transaction.provider';
import { ElastosLedgerEVMNetworkWallet } from '../../../networkwallets/ledger/ledger.evm.networkwallet';
import { ElastosEVMChainTransactionProvider } from '../../../tx-providers/elastos.evm.tx.provider';
import { ElastosEscMainSubWallet } from '../../subwallets/elastos.esc.main.subwallet';

export class ElastosSmartChainLedgerNetworkWallet extends ElastosLedgerEVMNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: EVMNetwork) {
    super(masterWallet, network, 'ELA', 'Elastos Smart Chain', StandardCoinName.ETHSC);
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosEVMChainTransactionProvider(this, StandardCoinName.ETHSC);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    try {
      this.mainTokenSubWallet = new ElastosEscMainSubWallet(this);
      this.subWallets[StandardCoinName.ETHSC] = this.mainTokenSubWallet;
    } catch (err) {
      Logger.error('wallet', 'Can not Create Elastos Smart Chain subwallets ', err);
    }

    return;
  }
}
