import { Logger } from 'src/app/logger';
import { AccountAbstractionMasterWallet } from 'src/app/wallet/model/masterwallets/account.abstraction.masterwallet';
import { StandardCoinName } from '../../../../../../coin';
import { TransactionProvider } from '../../../../../../tx-providers/transaction.provider';
import { ElastosEVMNetwork } from '../../../../network/elastos.evm.network';
import { ElastosAccountAbstractionEVMNetworkWallet } from '../../../networkwallets/account-abstraction/account-abstraction.evm.networkwallet';
// import { EcoAccountAbstractionSubWallet } from '../../../subwallets/account-abstraction/eco.aa.subwallet';
import { EcoSubWallet } from '../../subwallets/eco.evm.subwallet';
import { ElastosECOChainTransactionProvider } from '../../tx-providers/elastos.eco.tx.provider';

export class ElastosECOAccountAbstractionNetworkWallet extends ElastosAccountAbstractionEVMNetworkWallet {
  constructor(masterWallet: AccountAbstractionMasterWallet, network: ElastosEVMNetwork<any>) {
    super(masterWallet, network);
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosECOChainTransactionProvider(this);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    try {
      this.mainTokenSubWallet = new EcoSubWallet(this);
      this.subWallets[StandardCoinName.ETHECO] = this.mainTokenSubWallet;
    } catch (err) {
      Logger.error('wallet', 'Can not Create Elastos ECO AA subwallets ', err);
    }

    return;
  }
}
