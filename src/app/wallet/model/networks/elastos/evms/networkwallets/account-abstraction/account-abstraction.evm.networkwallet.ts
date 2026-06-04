import { AccountAbstractionMasterWallet } from 'src/app/wallet/model/masterwallets/account.abstraction.masterwallet';
import { AccountAbstractionNetworkWallet } from '../../../../evms/networkwallets/account-abstraction.networkwallet';
import { AccountAbstractionSafe } from '../../../../evms/safes/account-abstraction.safe';
import { ElastosEVMNetwork } from '../../../network/elastos.evm.network';

export abstract class ElastosAccountAbstractionEVMNetworkWallet extends AccountAbstractionNetworkWallet {
  constructor(masterWallet: AccountAbstractionMasterWallet, network: ElastosEVMNetwork<any>) {
    super(masterWallet, network, new AccountAbstractionSafe(masterWallet), 'ELA', network.getEffectiveName());
  }
}
