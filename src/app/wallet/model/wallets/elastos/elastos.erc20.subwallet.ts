import { Logger } from "src/app/logger";
import { GlobalElastosAPIService } from "src/app/services/global.elastosapi.service";
import { GlobalLanguageService } from "src/app/services/global.language.service";
import { CoinID, StandardCoinName } from "../../Coin";
import { EthTransaction } from "../../evm.types";
import { ERC20SubWallet } from "../erc20.subwallet";
import { NetworkWallet } from "../networkwallet";

/**
 * Subwallet for Elastos-ERC20 tokens.
 */
export class ElastosERC20SubWallet extends ERC20SubWallet {
  constructor(networkWallet: NetworkWallet, coinID: CoinID) {
    let rpcApiUrl = GlobalElastosAPIService.instance.getApiUrlForChainCode(StandardCoinName.ETHSC);
    super(networkWallet, coinID, rpcApiUrl);

    this.elastosChainCode = StandardCoinName.ETHSC;
  }

  public getMainIcon(): string {
    return "assets/wallet/coins/ela-gray.svg";
  }

  public getSecondaryIcon(): string {
    return "assets/wallet/coins/eth-purple.svg";
  }

  public getDisplayableERC20TokenInfo(): string {
    return GlobalLanguageService.instance.translate('wallet.ela-erc20');
  }

  protected async getTransactionsByRpc() {
    Logger.log('wallet', 'getTransactionByRPC (elastos erc20):', this.masterWallet.id, ' ', this.id)
    const contractAddress = this.coin.getContractAddress().toLowerCase();
    const tokenAccountAddress = await this.getTokenAccountAddress();
    let result = await GlobalElastosAPIService.instance.getERC20TokenTransactions(
      StandardCoinName.ETHSC,
      tokenAccountAddress);
    // Logger.test('wallet', 'getTransactionByRPC:', this.masterWallet.id, ' ', this.id, ' result:', result)
    if (result) {
      let allTx = result.filter((tx)=> {
        return tx.contractAddress === contractAddress
      })
      this.transactions = {totalcount:allTx.length, txhistory:allTx};
      await this.saveTransactions(this.transactions.txhistory as EthTransaction[]);
    }
}
}