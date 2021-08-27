import { MasterWallet } from "../masterwallet";
import { NetworkWallet } from "../networkwallet";
import { HECOChainSubWallet } from "./heco.subwallet";
import { StandardCoinName } from "../../Coin";
import { Network } from "../../networks/network";
import { StandardEVMSubWallet } from "../evm.subwallet";
import { ERC20TokenInfo, EthTokenTransaction } from "../../evm.types";
import { HecoAPI, HecoApiType } from "./heco.api";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { Logger } from "src/app/logger";

export class HecoNetworkWallet extends NetworkWallet {
  private mainTokenSubWallet: HECOChainSubWallet = null;

  constructor(masterWallet: MasterWallet, network: Network) {
    super(masterWallet, network);
  }

  protected async prepareStandardSubWallets(): Promise<void> {
    this.mainTokenSubWallet = new HECOChainSubWallet(this);
    this.subWallets[StandardCoinName.ETHHECO] = this.mainTokenSubWallet;
    await this.masterWallet.walletManager.spvBridge.createSubWallet(this.masterWallet.id, StandardCoinName.ETHHECO);
  }

  public getDisplayTokenName(): string {
    return 'HT';
  }

  public getMainEvmSubWallet(): StandardEVMSubWallet {
    return this.mainTokenSubWallet;
  }

  public async getERCTokensList(): Promise<ERC20TokenInfo[]> {
    // It will cost some time if there are lot of transactions.
    let tokenTransactions = await this.getHRC20TokenTransferEvents(0);
    return this.getERCTokensFromTransferEvents(tokenTransactions);
  }

  /**
   * Can not get the token list directly, So get the token list by token transfer events.
   */
  private getERCTokensFromTransferEvents(transferEvents: EthTokenTransaction[]) {
    let ercTokens: ERC20TokenInfo[] = [];
    let ercTokenSymbols = [];
    for (let i = 0, len = transferEvents.length; i < len; i++) {
      if (-1 === ercTokenSymbols.indexOf(transferEvents[i].tokenSymbol)) {
        ercTokenSymbols.push(transferEvents[i].tokenSymbol);
        let token: ERC20TokenInfo = {
          balance: '',
          contractAddress: transferEvents[i].contractAddress,
          decimals: transferEvents[i].tokenDecimal,
          name: transferEvents[i].tokenName,
          symbol: transferEvents[i].tokenSymbol,
          type : 'ERC-20',
        }
        ercTokens.push(token);
      }
    }
    Logger.log('wallet', ' HRC20 Tokens:', ercTokens)
    return ercTokens;
  }

  private async getHRC20TokenTransferEvents(startblock:number, endblock = 9999999999): Promise<EthTokenTransaction[]> {
    let tokenSubWallet = this.getMainEvmSubWallet();
    const address = await tokenSubWallet.getTokenAddress();
    const rpcApiUrl = HecoAPI.getApiUrl(HecoApiType.ACCOUNT_RPC);
    if (rpcApiUrl === null) {
      return null;
    }
    let hecoTokensEventUrl = rpcApiUrl + '/api?module=account&action=tokentx&address=' + address
          + '&startblock=' + startblock + '&endblock=' + endblock;
    try {
      let result = await GlobalJsonRPCService.instance.httpGet(hecoTokensEventUrl);
      return result.result as EthTokenTransaction[];
    } catch (e) {
      Logger.error('wallet', 'getHRC20TokenTransferEvents error:', e)
    }
  }
}