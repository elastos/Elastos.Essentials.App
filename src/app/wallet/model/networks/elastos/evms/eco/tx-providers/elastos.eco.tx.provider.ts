import { StandardCoinName } from '../../../../../coin';
import { AnySubWalletTransactionProvider } from '../../../../../tx-providers/subwallet.provider';
import { TransactionProvider } from '../../../../../tx-providers/transaction.provider';
import { ElastosTransaction } from '../../../../../tx-providers/transaction.types';
import { AnySubWallet } from '../../../../base/subwallets/subwallet';
import { ERC20SubWallet } from '../../../../evms/subwallets/erc20.subwallet';
import { AnyMainCoinEVMSubWallet } from '../../../../evms/subwallets/evm.subwallet';
import { EtherscanEVMSubWalletInternalTransactionProvider } from '../../../../evms/tx-providers/etherscan.evm.subwallet.internaltx.provider';
import { ElastosEvmRechargeTransactionProvider } from '../../tx-providers/evm.recharge.tx.provider';
import { EcoSubWallet } from '../subwallets/eco.evm.subwallet';
import { EcoSubWalletProvider } from './eco.subwallet.provider';
import { ElastosTokenSubWalletProvider } from './token.subwallet.provider';

export class ElastosECOChainTransactionProvider extends TransactionProvider<ElastosTransaction> {
  private elaECOSubWallet: EcoSubWallet;

  private elaECOProvider: EcoSubWalletProvider;
  private tokenProvider: ElastosTokenSubWalletProvider;
  private rechargeTransactionProvider: ElastosEvmRechargeTransactionProvider;

  private internalTXProvider: EtherscanEVMSubWalletInternalTransactionProvider<AnyMainCoinEVMSubWallet> = null;

  public async start(): Promise<void> {
    super.start();

    this.elaECOSubWallet = this.networkWallet.getSubWallet(StandardCoinName.ETHECO) as EcoSubWallet;

    if (this.elaECOSubWallet) {
      this.elaECOProvider = new EcoSubWalletProvider(this, this.elaECOSubWallet);
      await this.elaECOProvider.initialize();

      this.tokenProvider = new ElastosTokenSubWalletProvider(this, this.elaECOSubWallet);
      await this.tokenProvider.initialize();

      this.internalTXProvider = new EtherscanEVMSubWalletInternalTransactionProvider(this, this.elaECOSubWallet);
      await this.internalTXProvider.initialize();

      this.rechargeTransactionProvider = new ElastosEvmRechargeTransactionProvider(this, this.elaECOSubWallet);
      await this.rechargeTransactionProvider.initialize();

      // Discover new transactions globally for all tokens at once, in order to notify user
      // of NEW tokens received, and NEW payments received for existing tokens.
      this.refreshEvery(() => this.tokenProvider.discoverTokens(), 60000);
    }
  }

  protected getSubWalletTransactionProvider(subWallet: AnySubWallet): AnySubWalletTransactionProvider {
    if (subWallet instanceof EcoSubWallet) return this.elaECOProvider;
    else if (subWallet instanceof ERC20SubWallet) return this.tokenProvider;
    else
      throw new Error('Transactions provider: getSubWalletTransactionProvider() is called with an unknown subwallet!');
  }

  protected getSubWalletInternalTransactionProvider(subWallet: EcoSubWallet): AnySubWalletTransactionProvider {
    return this.internalTXProvider;
  }

  protected getSubWalletRechargeTransactionProvider(subWallet: EcoSubWallet): AnySubWalletTransactionProvider {
    return this.rechargeTransactionProvider;
  }
}
