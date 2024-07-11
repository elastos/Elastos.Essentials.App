import { Injectable } from "@angular/core";
import BigNumber from "bignumber.js";
import { Logger } from "src/app/logger";
import { MAINNET_TEMPLATE } from "src/app/services/global.networks.service";
import { NetworkTemplateStore } from "src/app/services/stores/networktemplate.store";
import { Coin, ERC20Coin } from "src/app/wallet/model/coin";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { AnyNetwork } from "src/app/wallet/model/networks/network";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { ChaingeSwap } from "../model/chainge";
import { ErrorCode, Order, SupportedChain, UnsupportedChainException, UnsupportedTokenOrChainException } from "../model/chainge.types";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { ChaingeApiService } from "./chaingeapi.service";

const ESSENTIALS_SWAP_FEES = 2; // Must be an integer - https://chainge-finance.gitbook.io/chainge-finance/get-started-1/fee-structure

@Injectable({
  providedIn: "root"
})
export class ChaingeSwapService {
  public static instance: ChaingeSwapService;

  constructor(
    private networkService: WalletNetworkService
  ) {
    ChaingeSwapService.instance = this;
  }

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
      case "bsc": return "BNB";
      case "polygon": return "POLYGON";
      case "avalanchecchain": return "AVAXC";
      case "arbitrum": return "ARB";
      case "cronos": return "CRO";
      case "fantom": return "FTM";
      case "telos": return "TELOSEVM";
      // case "tron": return "TRX"; // Need to set output address
      case "elastossmartchain": return "ELA";
      default: return null;
    }
  }

  private chaingeToEssentialsChainName(chaingeChain: string): string {
    switch (chaingeChain) {
      case "FSN": return "fusion";
      case "ETH": return "ethereum";
      case "BNB": return "bsc";
      case "POLYGON": return "polygon";
      case "AVAXC": return "avalanchecchain";
      case "ARB": return "arbitrum";
      case "CRO": return "cronos";
      case "FTM": return "fantom";
      case "TELOS": return "telos";
      // case "TRX": return "tron"; // Need to set output address
      case "ELA": return "elastossmartchain";
      default: return null;
    }
  }

  /**
   * Returns the total transfer cost, in source network
   */
  public async getSwapQuote(mainCoinSubWallet: AnyMainCoinEVMSubWallet, from: Coin, amountIn: BigNumber, to: Coin): Promise<{ fees: number, slippage: number, priceImpact: number, amountOut: string, amountOutWei: string }> {
    let chaingeFromChain = this.essentialsToChaingeChainName(from.network);
    if (!chaingeFromChain)
      throw new UnsupportedTokenOrChainException(`Unsupported chainge swap network ${from.network.key} for the source token`);

    let chaingeToChain = this.essentialsToChaingeChainName(to.network);
    if (!chaingeToChain)
      throw new UnsupportedTokenOrChainException(`Unsupported chainge swap network ${to.network.key} for the destination token`);

    let fromTokenDecimal = 18; // TODO
    if (from instanceof ERC20Coin) {
      fromTokenDecimal = from.getDecimals();
    }
    let amountInWei = parseUnits(amountIn.toString(), fromTokenDecimal).toString()

    let sameToken = from.getSymbol() === to.getSymbol();
    let fees: number;
    let amountOut: string;
    let amountOutWei: string;
    let slippage: number; // % slippage, for aggregated swaps that involve DEXes.
    let priceImpact: number;

    if (sameToken) {
      // Same token, just crossing chain
      let quote = await ChaingeApiService.instance.getCrossChainQuote(
        amountInWei,
        ESSENTIALS_SWAP_FEES,
        chaingeFromChain,
        chaingeToChain,
        from.getSymbol()
      );

      let toTokenDecimal = 18; // TODO
      if (to instanceof ERC20Coin) {
        toTokenDecimal = to.getDecimals();
      }

      fees = parseFloat(formatUnits((new BigNumber(quote.gasFee).plus(quote.serviceFee)).toString(), toTokenDecimal))
      slippage = null;
      priceImpact = null;
      amountOutWei = (new BigNumber(quote.outAmount)).minus(quote.gasFee).minus(quote.serviceFee).toString()
      amountOut = formatUnits(amountOutWei, toTokenDecimal)
    }
    else {
      // More complex operation than a simple bridge
      let quote = await ChaingeApiService.instance.getAggregateQuote(ESSENTIALS_SWAP_FEES, chaingeFromChain, amountInWei, from.getSymbol(), chaingeToChain, to.getSymbol());

      fees = parseFloat(formatUnits((new BigNumber(quote.gasFee).plus(quote.serviceFee)).toString(), quote.chainDecimal))
      slippage = parseInt(quote.slippage)
      priceImpact = parseFloat(quote.priceImpact)
      amountOutWei = (new BigNumber(quote.outAmount)).minus(quote.gasFee).minus(quote.serviceFee).toString()
      amountOut = formatUnits(amountOutWei, quote.chainDecimal)
    }

    return { fees, slippage, priceImpact, amountOut, amountOutWei };
  }

  /**
   * Executes ths possibly multi steps swap by the chainge sdk.
   *
   * This method returns when the order ID is received, so that this ID can be saved and checked later, even after coming back to the screen.
   * The callback sends intermediate and additional events such as when the swap is completed (fully completed, or failure somewhere) - TODO.
   */
  public async executeSwap(mainCoinSubWallet: AnyMainCoinEVMSubWallet, from: Coin, amountIn: BigNumber, to: Coin, estimatedReceivedAmountWei: string): Promise<string> {
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
        // let ret = await chainge.executeCrossChain(ESSENTIALS_SWAP_FEES, amountIn.toString(10), chaingeFromChain, from.getSymbol(), chaingeToChain, (result, action) => {
        //   Logger.warn('ChaingeSwap', 'executeCrossChain callback', result, action);

        //   // TODO: handle errors as well
        //   if (result.certHash && !resolved) {
        //     resolved = true;
        //     resolve(result.certHash);
        //   }
        // });

        let ret = await this.executeCrossChain(ESSENTIALS_SWAP_FEES, amountIn.toString(10), chaingeFromChain, from.getSymbol(), chaingeToChain, estimatedReceivedAmountWei)
        Logger.warn('ChaingeSwap', 'executeCrossChain ret', ret);
      }
      else {
        // TODO
        // More complex operation than a simple bridge
        // await chainge.executeAggregate(ESSENTIALS_SWAP_FEES, amountIn.toString(10), chaingeFromChain, from.getSymbol(), chaingeToChain, to.getSymbol(), (result, action) => {
        //   Logger.log('ChaingeSwap', 'executeAggregate submit order callback:', result, action);

        //   /// TODO IMPORTANT: handle errors here in case or error during submission
        // }, result => {
        //   Logger.log('ChaingeSwap', 'executeAggregate track order progress callback:', result);

        //   // Return the order SN (ID) as soon as we get it.
        //   if (!resolved) {
        //     if (result.code !== ErrorCode.SUCCESS) {
        //       resolved = true;
        //       reject("Track order - failure - error code " + result.code);
        //     }
        //     else if (result.data) {
        //       resolved = true;
        //       resolve(result.data.order.sn);
        //     }
        //   }
        // });
        // Logger.log('ChaingeSwap', 'executeAggregate returns');
      }
    });
  }

  public async getOrderDetails(mainCoinSubWallet: AnyMainCoinEVMSubWallet, sn: string): Promise<Order> {
    // TOODO
    // let chainge = await ChaingeSwap.create(mainCoinSubWallet);
    // return chainge.getOrderDetails(sn);
    return null;
  }

  public async executeCrossChain(feeLevel: number, fromAmount: string, fromChain: string, fromToken: string, toChain: string, estimatedReceivedAmountWei: string): Promise<any> {
    let assertsFromChain = await ChaingeApiService.instance.getAssetsByChain(fromChain);
    let fromTokenInfo = assertsFromChain?.find( t => t.symbol == fromToken)
    if (!fromTokenInfo) {
      throw new UnsupportedTokenOrChainException();
    }

    let assertsToChain = await ChaingeApiService.instance.getAssetsByChain(toChain);
    let toTokenInfo = assertsToChain?.find( t => t.symbol == fromToken)
    if (!toTokenInfo) {
      throw new UnsupportedTokenOrChainException();
    }

    const amount = parseUnits(fromAmount, fromTokenInfo.decimals).toString()

    Logger.warn('ChaingeSwap', ' estimatedReceivedAmountWei:', estimatedReceivedAmountWei);

    let chainList = ChaingeApiService.instance.getChain();
    let fromChainInfo = (await chainList).find( c => c.nickName == fromChain);
    if (!fromChainInfo) {
      throw new UnsupportedChainException();
    }

    Logger.warn('ChaingeSwap', ' fromChainInfo:', fromChainInfo);
    let v2ContractForFromChain = fromChainInfo.builtInMinterProxyV2;

    // // 1_Expected value;2_Third party profit ratio;3_version;4_Mini Amount;5_Execution chain
    // const extra = `1_${receiveAmountForExtra};${thirdAmountForExtra};3_2;4_${receiveAmountForExtra};5_BNB`
    // // submit order
    // const sourceCerts = {
    //     fromAmount: amount,
    //     fromIndex: ETHTokenForEth.index, // eth
    //     fromChain: 'ETH',
    //     fromAddr: userAddress,
    //     certHash: '',
    //     fromPublicKey: '', // default
    //     signature: '123456' // default '123456'
    // }

  }
}