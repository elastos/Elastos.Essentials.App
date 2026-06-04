import { Logger } from 'src/app/logger';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import { EVMNetwork } from 'src/app/wallet/model/networks/evms/evm.network';
import { TransactionProvider } from 'src/app/wallet/model/tx-providers/transaction.provider';
import { ElastosLedgerEVMNetworkWallet } from '../../../networkwallets/ledger/ledger.evm.networkwallet';
import { EidSubWallet } from '../../subwallets/standard/eid.evm.subwallet';
import { ElastosIdentityTransactionProvider } from '../../tx-providers/elastos.eid.tx.provider';

export class ElastosIdentityChainLedgerNetworkWallet extends ElastosLedgerEVMNetworkWallet {
  constructor(masterWallet: LedgerMasterWallet, network: EVMNetwork) {
    super(masterWallet, network, 'ELA', 'Elastos ID Chain', StandardCoinName.ETHDID);
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return new ElastosIdentityTransactionProvider(this);
  }

  protected prepareStandardSubWallets(): Promise<void> {
    try {
      this.mainTokenSubWallet = new EidSubWallet(this);
      this.subWallets[StandardCoinName.ETHDID] = this.mainTokenSubWallet;
    } catch (err) {
      Logger.error('wallet', 'Can not Create Elastos EID subwallet', err);
    }
    return;
  }
}
