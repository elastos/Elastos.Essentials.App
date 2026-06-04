import { ElastosMainChainWalletNetworkOptions } from 'src/app/wallet/model/masterwallets/wallet.types';
import { StandardEVMNetworkWallet } from '../../../../evms/networkwallets/standard/standard.evm.networkwallet';
import { AnySubWallet } from '../../../../base/subwallets/subwallet';
import { ElastosEVMSubWallet } from '../../subwallets/standard/elastos.evm.subwallet';

export abstract class ElastosStandardEVMNetworkWallet extends StandardEVMNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public getMainEvmSubWallet(): ElastosEVMSubWallet {
    return this.mainTokenSubWallet as ElastosEVMSubWallet;
  }

  public getMainTokenSubWallet(): AnySubWallet {
    return this.mainTokenSubWallet;
  }

  public getAverageBlocktime(): number {
    return 5;
  }
}
