import { CoinID, StandardCoinName } from 'src/app/wallet/model/coin';
import { LedgerMasterWallet } from 'src/app/wallet/model/masterwallets/ledger.masterwallet';
import { ElastosMainChainWalletNetworkOptions } from 'src/app/wallet/model/masterwallets/wallet.types';
import { TransactionProvider } from 'src/app/wallet/model/tx-providers/transaction.provider';
import { WalletAddressInfo } from '../../../../base/networkwallets/networkwallet';
import { AnySubWallet } from '../../../../base/subwallets/subwallet';
import { EVMNetwork } from '../../../../evms/evm.network';
import { LedgerEVMNetworkWallet } from '../../../../evms/networkwallets/ledger/ledger.evm.networkwallet';
import { ElastosEVMSubWallet } from '../../subwallets/standard/elastos.evm.subwallet';

export class ElastosLedgerEVMNetworkWallet extends LedgerEVMNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public sideChain: StandardCoinName;

  constructor(
    masterWallet: LedgerMasterWallet,
    network: EVMNetwork,
    coinID: CoinID,
    friendlyName: string,
    sideChain: StandardCoinName
  ) {
    super(masterWallet, network, coinID, friendlyName);
    this.sideChain = sideChain;
  }

  protected createTransactionDiscoveryProvider(): TransactionProvider<any> {
    return null;
  }

  public getAddresses(): WalletAddressInfo[] {
    let addresses = [];

    // No ETHSC in LRW.
    if (this.subWallets[this.sideChain]) {
      addresses.push({
        title: 'EVM',
        address: this.subWallets[this.sideChain].getCurrentReceiverAddress()
      });
    }
    return addresses;
  }

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
