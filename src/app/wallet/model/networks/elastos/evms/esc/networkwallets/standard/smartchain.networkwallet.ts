import { Logger } from 'src/app/logger';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { StandardCoinName } from '../../../../../../coin';
import { StandardMasterWallet } from '../../../../../../masterwallets/masterwallet';
import { TransactionProvider } from '../../../../../../tx-providers/transaction.provider';
import { ElastosStandardEVMNetworkWallet } from '../../../networkwallets/standard/standard.evm.networkwallet';
import { ElastosEVMChainTransactionProvider } from '../../../tx-providers/elastos.evm.tx.provider';
import { ElastosEscMainSubWallet } from '../../subwallets/elastos.esc.main.subwallet';

export class ElastosSmartChainStandardNetworkWallet extends ElastosStandardEVMNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: EVMNetwork) {
    super(masterWallet, network, 'ELA', 'Elastos Smart Chain');
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
