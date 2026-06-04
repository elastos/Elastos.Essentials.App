import { Logger } from 'src/app/logger';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { StandardCoinName } from '../../../../../../coin';
import { StandardMasterWallet } from '../../../../../../masterwallets/masterwallet';
import { TransactionProvider } from '../../../../../../tx-providers/transaction.provider';
import { WalletAddressInfo } from '../../../../../base/networkwallets/networkwallet';
import { ElastosStandardEVMNetworkWallet } from '../../../networkwallets/standard/standard.evm.networkwallet';
import { EcoSubWallet } from '../../subwallets/eco.evm.subwallet';
import { ElastosECOChainTransactionProvider } from '../../tx-providers/elastos.eco.tx.provider';

export class ElastosECOChainStandardNetworkWallet extends ElastosStandardEVMNetworkWallet {
  constructor(masterWallet: StandardMasterWallet, network: EVMNetwork) {
    super(masterWallet, network, 'ELA', 'Elastos PGP ECO Chain');
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
    return Promise.resolve();
  }
}
