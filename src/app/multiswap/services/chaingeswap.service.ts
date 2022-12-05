import { Injectable } from "@angular/core";
import BigNumber from "bignumber.js";
import { Logger } from "src/app/logger";
import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { NetworkTemplateStore } from "src/app/services/stores/networktemplate.store";
import { Coin } from "src/app/wallet/model/coin";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { AnyNetwork } from "src/app/wallet/model/networks/network";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { ChaingeSwap } from "../model/chainge";
import { ErrorCode, Order, UnsupportedTokenOrChainException } from "../model/chainge.types";

const ESSENTIALS_SWAP_FEES = 2; // Must be an integer - https://chainge-finance.gitbook.io/chainge-finance/get-started-1/fee-structure

@Injectable({
  providedIn: "root"
})
export class ChaingeSwapService {
  public static instance: ChaingeSwapService;

  //private chainge: { [networkKey:string]: ChaingeSwap} = {};

  constructor(
    private networkService: WalletNetworkService
  ) {
    ChaingeSwapService.instance = this;
  }

  /**
   * Returns the cached chainge instance (one per network) for the given network
   */
  /* private getChainge(network: Network): ChaingeSwap {

  } */

  /* async testGetInfo() {
    let chains = await chainge.getSupportChains();
    // let tokens = await chainge.getSupportTokens('FSN');
    await chainge.getSupportTokens('HECO');
    await chainge.getSupportTokens('ELA');
  } */

  /**
   * Returns the list of supported networks that can be used with the chainge API.
   */
  public getSupportedNetworks(): AnyNetwork[] {
    if (NetworkTemplateStore.networkTemplate !== MAINNET_TEMPLATE) {
      return [];
    }

    let networks: AnyNetwork[] = [];
    for (let essNetwork of this.networkService.getAvailableNetworks()) {
      let chaingeChaingeName = this.essentialsToChaingeChainName(essNetwork);
      if (chaingeChaingeName)
        networks.push(essNetwork);
    }

    return networks;
  }

  public isNetworkSupported(network: AnyNetwork): boolean {
    let networks = this.getSupportedNetworks();
    return !!networks.find(n => n.equals(network));
  }

  /**
   * Converts essentials network names to chainge ones.
   * EG: "elastossmartchain" -> 'ELA'
   *
   * 2022.10.18: getSupportChains() = FSN ETH BSC HECO OKT MATIC AVAX ARB CRO CUBE OP ETHW FTM ELA ETC
   */
  public essentialsToChaingeChainName(network: AnyNetwork): string {
    switch (network.key) {
      case "fusion": return "FSN";
      case "ethereum": return "ETH";
      case "bsc": return "BSC";
      case "heco": return "HECO";
      case "polygon": return "MATIC";
      case "avalanchecchain": return "AVAX";
      case "arbitrum": return "ARB";
      case "cronos": return "CRO";
      case "fantom": return "FTM";
      // TOO HIGH SLIPPAGE - NO LIQUIDITY - RESTORE WHEN LIQUIDITY PROBLEM SOLVED - case "elastossmartchain": return "ELA";
      default: return null;
    }
  }

  private chaingeToEssentialsChainName(chaingeChain: string): string {
    switch (chaingeChain) {
      case "FSN": return "fusion";
      case "ETH": return "ethereum";
      case "BSC": return "bsc";
      case "HECO": return "heco";
      case "MATIC": return "polygon";
      case "AVAX": return "avalanchecchain";
      case "ARB": return "arbitrum";
      case "CRO": return "cronos";
      case "FTM": return "fantom";
      // TOO HIGH SLIPPAGE - NO LIQUIDITY - RESTORE WHEN LIQUIDITY PROBLEM SOLVED - case "ELA": return "elastossmartchain";
      default: return null;
    }
  }

  /**
   * Returns the total transfer cost, in source network
   */
  public async getSwapQuote(mainCoinSubWallet: AnyMainCoinEVMSubWallet, from: Coin, amountIn: BigNumber, to: Coin): Promise<{ fees: number, slippage: number, amountOut: number }> {
    let chainge = await ChaingeSwap.create(mainCoinSubWallet);

    let chaingeFromChain = this.essentialsToChaingeChainName(from.network);
    if (!chaingeFromChain)
      throw new UnsupportedTokenOrChainException(`Unsupported chainge swap network ${from.network.key} for the source token`);

    let chaingeToChain = this.essentialsToChaingeChainName(to.network);
    if (!chaingeToChain)
      throw new UnsupportedTokenOrChainException(`Unsupported chainge swap network ${to.network.key} for the destination token`);

    let sameToken = from.getSymbol() === to.getSymbol();
    let fees: number;
    let amountOut: number; // TODO: Why ain't that a string in chainge API ?
    let slippage: number; // % slippage, for aggregated swaps that involve DEXes.
    if (sameToken) {
      // Same token, just crossing chain
      let quote = await chainge.getCrossChainQuote(
        amountIn.toString(10),
        ESSENTIALS_SWAP_FEES,
        chaingeFromChain,
        chaingeToChain,
        from.getSymbol()
      );
      Logger.warn('chainge', 'getCrossChainQuote', quote);

      fees = quote.fee + quote.gas;
      slippage = null;
      amountOut = quote.amountOut;
    }
    else {
      // More complex operation than a simple bridge
      let quote = await chainge.getAggregateQuote(ESSENTIALS_SWAP_FEES, amountIn.toString(10), from.getSymbol(), chaingeToChain, to.getSymbol());
      Logger.warn('chainge', 'getAggregateQuote ', quote);

      fees = quote.fee + quote.gas;
      slippage = quote.slippage;
      amountOut = quote.amountOut;
    }

    return { fees, slippage, amountOut };
  }

  /**
   * Executes ths possibly multi steps swap by the chainge sdk.
   *
   * This method returns when the order ID is received, so that this ID can be saved and checked later, even after coming back to the screen.
   * The callback sends intermediate and additional events such as when the swap is completed (fully completed, or failure somewhere) - TODO.
   */
  public async executeSwap(mainCoinSubWallet: AnyMainCoinEVMSubWallet, from: Coin, amountIn: BigNumber, to: Coin): Promise<string> {
    let chainge = await ChaingeSwap.create(mainCoinSubWallet);

    // await chainge.setFeeToInfo(1, '0x01a14bC0018fc97e2fdB14ace069F50b1C44eE86')
    // await chainge.getFeeToInfo();
    // await chainge.getFeeLevelInfo();

    let chaingeFromChain = this.essentialsToChaingeChainName(from.network);
    if (!chaingeFromChain)
      throw new UnsupportedTokenOrChainException(`Unsupported chainge swap network ${from.network.key} for the source token`);

    let chaingeToChain = this.essentialsToChaingeChainName(to.network);
    if (!chaingeToChain)
      throw new UnsupportedTokenOrChainException(`Unsupported chainge swap network ${to.network.key} for the destination token`);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      /**
       * If the token is the same, use executeCrossChain.
       * If the token is different, use executeAggregate
       **/
      let sameToken = from.getSymbol() === to.getSymbol();
      let resolved = false;
      if (sameToken) {
        // Same token, just crossing chain
        let ret = await chainge.executeCrossChain(ESSENTIALS_SWAP_FEES, amountIn.toString(10), chaingeFromChain, from.getSymbol(), chaingeToChain, (result, action) => {
          Logger.warn('chainge', 'executeCrossChain callback', result, action);

          // TODO: handle errors as well
          if (result.certHash && !resolved) {
            resolved = true;
            resolve(result.certHash);
          }
        });
        Logger.warn('chainge', 'executeCrossChain ret', ret);
      }
      else {
        // More complex operation than a simple bridge
        await chainge.executeAggregate(ESSENTIALS_SWAP_FEES, amountIn.toString(10), chaingeFromChain, from.getSymbol(), chaingeToChain, to.getSymbol(), (result, action) => {
          Logger.log('chainge', 'executeAggregate submit order callback:', result, action);

          /// TODO IMPORTANT: handle errors here in case or error during submission
        }, result => {
          Logger.log('chainge', 'executeAggregate track order progress callback:', result);

          // Return the order SN (ID) as soon as we get it.
          if (!resolved) {
            if (result.code !== ErrorCode.SUCCESS) {
              resolved = true;
              reject("Track order - failure - error code " + result.code);
            }
            else if (result.data) {
              resolved = true;
              resolve(result.data.order.sn);
            }
          }
        });
        Logger.log('chainge', 'executeAggregate returns');
      }
    });
  }

  public async getOrderDetails(mainCoinSubWallet: AnyMainCoinEVMSubWallet, sn: string): Promise<Order> {
    let chainge = await ChaingeSwap.create(mainCoinSubWallet);
    return chainge.getOrderDetails(sn);
  }
}