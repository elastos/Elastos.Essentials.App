import { Config } from 'src/app/wallet/config/Config';
import { StandardCoinName } from '../../../../../coin';
import { AnyEVMNetworkWallet } from '../../../../evms/networkwallets/evm.networkwallet';
import { ElastosEVMSubWallet } from '../../subwallets/standard/elastos.evm.subwallet';

export class EcoSubWallet extends ElastosEVMSubWallet {
  constructor(networkWallet: AnyEVMNetworkWallet) {
    super(networkWallet, StandardCoinName.ETHECO, 'Elastos PGP ECO Chain');
  }

  public async initialize() {
    await super.initialize();

    this.withdrawContractAddress = Config.ETHECO_WITHDRAW_ADDRESS.toLowerCase();
  }

  public supportRechargeTransactions(): boolean {
    return true;
  }
}
