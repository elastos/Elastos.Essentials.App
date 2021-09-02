import { StandardCoinName } from '../../Coin';
import { NetworkWallet } from '../networkwallet';
import { EthTransaction } from '../../evm.types';
import { StandardEVMSubWallet } from '../evm.subwallet';
import { HecoAPI, HecoApiType } from './heco.api';
import { GlobalEthereumRPCService } from 'src/app/services/global.ethereum.service';

/**
 * Specialized standard sub wallet for the HECO sidechain.
 */
export class HECOChainSubWallet extends StandardEVMSubWallet {
  constructor(networkWallet: NetworkWallet) {
    super(networkWallet, StandardCoinName.ETHHECO, HecoAPI.getApiUrl(HecoApiType.RPC));

    void this.initialize();
  }

  protected async initialize() {
    await super.initialize();
  }

  public getMainIcon(): string {
    return "assets/wallet/networks/hecochain.png";
  }

  public getSecondaryIcon(): string {
    return null
  }

  public getFriendlyName(): string {
    return "Huobi Token";
  }

  public getDisplayTokenName(): string {
    return "HT";
  }

  public async getTransactionDetails(txid: string): Promise<EthTransaction> {
    let result = await GlobalEthereumRPCService.instance.eth_getTransactionByHash(HecoAPI.getApiUrl(HecoApiType.RPC), txid);
    if (!result) {
      // Remove error transaction.
      // TODO await this.removeInvalidTransaction(txid);
    }
    return result;
  }

  public async createWithdrawTransaction(toAddress: string, toAmount: number, memo: string): Promise<string> {
    return await '';
  }
}
