import { StandardCoinName } from '../../../../coin';
import { AnySubWalletTransactionProvider } from '../../../../tx-providers/subwallet.provider';
import { TransactionProvider } from '../../../../tx-providers/transaction.provider';
import { ElastosTransaction } from '../../../../tx-providers/transaction.types';
import { AnySubWallet } from '../../../base/subwallets/subwallet';
import { AnyEVMNetworkWallet } from '../../../evms/networkwallets/evm.networkwallet';
import { ERC20SubWallet } from '../../../evms/subwallets/erc20.subwallet';
import { AnyMainCoinEVMSubWallet } from '../../../evms/subwallets/evm.subwallet';
import { EtherscanEVMSubWalletInternalTransactionProvider } from '../../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider';
import { ElastosTokenSubWalletProvider } from '../esc/tx-providers/token.subwallet.provider';
import { ElastosEVMSubWallet } from '../subwallets/standard/elastos.evm.subwallet';
import { ElastosEvmRechargeTransactionProvider } from './evm.recharge.tx.provider';
import { ElastosEvmSubWalletProvider } from './evm.subwallet.provider';

// For ESC and ECO chains
export class ElastosEVMChainTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private mainSubWallet: ElastosEVMSubWallet;
  private sideChain: StandardCoinName;
  private evmProvider: ElastosEvmSubWalletProvider;
  private tokenProvider: ElastosTokenSubWalletProvider;

  private internalTXProvider: EtherscanEVMSubWalletInternalTransactionProvider<AnyMainCoinEVMSubWallet> = null;
  private rechargeTransactionProvider: ElastosEvmRechargeTransactionProvider;

  constructor(networkWallet: AnyEVMNetworkWallet, sideChain: StandardCoinName) {
    super(networkWallet);

    this.sideChain = sideChain;
    this.mainSubWallet = this.networkWallet.getSubWallet(sideChain) as ElastosEVMSubWallet;
  }

  public async start(): Promise<void> {
    super.start();

    this.mainSubWallet = this.networkWallet.getSubWallet(this.sideChain) as ElastosEVMSubWallet;

    // No ETHSC in LRW
    if (this.mainSubWallet) {
      this.evmProvider = new ElastosEvmSubWalletProvider(this, this.mainSubWallet as ElastosEVMSubWallet);
      await this.evmProvider.initialize();

      this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.mainSubWallet, this.sideChain);
      await this.tokenProvider.initialize();

      this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, this.mainSubWallet);
      await this.internalTXProvider.initialize();

      this.rechargeTransactionProvider = new ElastosEvmRechargeTransactionProvider(this, this.mainSubWallet);
      await this.rechargeTransactionProvider.initialize();

      // Discover new transactions globally for all tokens at once, in order to notify user
      // of NEW tokens received, and NEW payments received for existing tokens.
      this.refreshEvery(() => this.tokenProvider.discoverTokens(), 60000);
    }
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof ElastosEVMSubWallet) return this.evmProvider;
    else if (subWallet instanceof ERC20SubWallet) return this.tokenProvider;
    else
      throw new Error('Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!');
  }

  protected getSubWalletInternalTransactionProvider(subWallet: ERC20SubWallet): AnySubWalletTransactionProvider {
    return this.internalTXProvider;
  }

  protected getSubWalletRechargeTransactionProvider(subWallet: ElastosEVMSubWallet): AnySubWalletTransactionProvider {
    return this.rechargeTransactionProvider;
  }
}
