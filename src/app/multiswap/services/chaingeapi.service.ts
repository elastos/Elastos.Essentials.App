import { Injectable } from "@angular/core";
import { Logger } from "src/app/logger";
import { AggregateQuote, AmountTooLowException, ChainGasUsd, CrossChainQuote, ErrorCode, NoRouteException, Order, Response, SupportedChain, SupportedTokenByChain, UnspecifiedException, UnsupportedChainException, UnsupportedTokenOrChainException } from "../model/chainge.types";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";

const CHAINGE_API_URL = 'https://api2.chainge.finance/v1/'

type ChainAssets = {
  [key: string]: any
};

@Injectable({
  providedIn: "root"
})
export class ChaingeApiService {
  public static instance: ChaingeApiService;
  private chainAssetsCache: ChainAssets[] = [];
  private chainCache: SupportedChain[] = [];

  constructor() {
    ChaingeApiService.instance = this;
  }

  public async getChain(): Promise<SupportedChain[]> {
    if (this.chainCache.length > 0) {
      return this.chainCache;
    }

    let result: Response<any>;
    try {
        // https://api2.chainge.finance/v1/getChain
        let url = CHAINGE_API_URL + 'getChain';
        result = await GlobalJsonRPCService.instance.httpGet(url, "default", 30000);
    }
    catch (e) {
        Logger.warn('ChaingeSwap', 'getChain exception', e);
        throw new UnspecifiedException();
    }

    if (result.code === ErrorCode.SUCCESS && result.data.list) {
        Logger.log('ChaingeSwap', 'getChain', result.data.list)
        this.chainCache = result.data.list
        return result.data.list;
    } else {
        Logger.warn('ChaingeSwap', 'getChain error:', result);
        throw this.apiResponseToException(result);
    }
  }

  //
  public async getAssetsByChain(fromChain: string): Promise<SupportedTokenByChain[]> {
    if (this.chainAssetsCache[fromChain]) {
      return this.chainAssetsCache[fromChain];
    }

    let result: Response<any>;
    try {
        // https://api2.chainge.finance/v1/getAssetsByChain?chain=ARB
        let url = CHAINGE_API_URL + 'getAssetsByChain?' + 'chain=' + fromChain;
        result = await GlobalJsonRPCService.instance.httpGet(url, "default", 30000);
    }
    catch (e) {
        Logger.warn('ChaingeSwap', 'getAssetsByChain exception', e);
        throw new UnspecifiedException();
    }

    if (result.code === ErrorCode.SUCCESS && result.data.list) {
        Logger.log('ChaingeSwap', 'getAssetsByChain', result.data.list)
        this.chainAssetsCache[fromChain] = result.data.list
        return result.data.list;
    } else {
        Logger.warn('ChaingeSwap', 'getAssetsByChain error:', result);
        throw this.apiResponseToException(result);
    }
  }

  public async getChainGasUsd(): Promise<ChainGasUsd[]> {
    let result: Response<any>;
    try {
        // 1.https://api2.chainge.finance/v1/getChainGasUsd
        let url = CHAINGE_API_URL + 'getChainGasUsd';
        result = await GlobalJsonRPCService.instance.httpGet(url, "default", 30000);
    }
    catch (e) {
        Logger.warn('ChaingeSwap', 'getChainGasUsd exception', e);
        throw new UnspecifiedException();
    }

    if (result.code === ErrorCode.SUCCESS && result.data) {
        Logger.log('ChaingeSwap', 'getChainGasUsd', result.data)
        return result.data;
    } else {
        Logger.warn('ChaingeSwap', 'getChainGasUsd error:', result);
        throw this.apiResponseToException(result);
    }
  }

  public async getCrossChainQuote(amount: string, feeLevel: number, fromChain: string, toChain: string, token: string): Promise<CrossChainQuote> {
    let result: Response<any>;
    try {
        // https://api2.chainge.finance/v1/getBridgeQuote?symbol=USDT&amount=10000000&fromChain=ARB&toChain=BNB&channelFeeRate=10
        let url = CHAINGE_API_URL + 'getBridgeQuote?' + 'symbol=' + token + '&amount=' + amount + '&fromChain=' + fromChain + '&toChain=' + toChain + '&channelFeeRate=' + feeLevel;
        Logger.log('ChaingeSwap', 'getCrossChainQuote url', url)
        result = await GlobalJsonRPCService.instance.httpGet(url);
    }
    catch (e) {
        Logger.warn('ChaingeSwap', 'getCrossChainQuote exception', e);
        throw new UnspecifiedException();
    }

    if (result.code === ErrorCode.SUCCESS && result.data) {
        Logger.log('ChaingeSwap', 'getCrossChainQuote', result.data)
        return result.data;
    } else {
        Logger.warn('ChaingeSwap', 'getCrossChainQuote error:', result);
        throw this.apiResponseToException(result);
    }
  }

  public async getAggregateQuote(feeLevel: number, fromChain: string, fromAmount: string, fromTokenSymbol: string, toChain: string, toTokenSymbol: string): Promise<AggregateQuote> {
    let assertsFromChain = await this.getAssetsByChain(fromChain);
    let fromToken = assertsFromChain?.find( t => t.symbol == fromTokenSymbol)
    if (!fromToken) {
      throw new UnsupportedTokenOrChainException();
    }

    let assertsToChain = await this.getAssetsByChain(toChain);
    let toToken = assertsToChain?.find( t => t.symbol == toTokenSymbol)
    if (!toToken) {
      throw new UnsupportedTokenOrChainException();
    }

    let result: Response<any>;
    try {
      // https://api2.chainge.finance/v1/getAggregateQuote?fromChain=BNB&fromTokenAddress=0x55d398326f99059ff775485246999027b3197955&fromDecimal=18&fromAmount=1000000000000000000&toChain=FSN&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toDecimal=18&channelFeeRate=10
      let url = CHAINGE_API_URL + 'getAggregateQuote?' + '&fromChain=' + fromChain + '&fromTokenAddress=' + fromToken.contractAddress + '&fromDecimal=' + fromToken.decimals + '&fromAmount=' + fromAmount + '&toChain=' + toChain + '&toTokenAddress=' + toToken.contractAddress + '&fromDecimal=' + toToken.decimals + '&channelFeeRate=' + feeLevel;
      Logger.log('ChaingeSwap', 'getAggregateQuote url', url)
      result = await GlobalJsonRPCService.instance.httpGet(url);
    }
    catch (e) {
      Logger.warn('ChaingeSwap', 'getAggregateQuote exception', e);
      throw new UnspecifiedException();
    }

    if (result.code === ErrorCode.SUCCESS && result.data) {
      Logger.log('ChaingeSwap', 'getAggregateQuote', result.data)
      return result.data;
    } else {
      Logger.warn('ChaingeSwap', 'getAggregateQuote error:', result);
      throw this.apiResponseToException(result);
    }
  }


  private apiResponseToException(response: Response<any>): Error {
    switch (response.code) {
        case ErrorCode.NO_ROUTE: return new NoRouteException();
        case ErrorCode.CHAIN_NOT_SUPPORTED: return new UnsupportedChainException();
        case ErrorCode.TOKEN_CHAIN_NOT_SUPPORTED: return new UnsupportedTokenOrChainException();
        case ErrorCode.AGGREGATE_AMOUNT_TOO_LOW:
        case ErrorCode.CROSS_CHAIN_AMOUNT_TOO_LOW:
            return new AmountTooLowException();
        default: return new UnspecifiedException();
    }
  }
}