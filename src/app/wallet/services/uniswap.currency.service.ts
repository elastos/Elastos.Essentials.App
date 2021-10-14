import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Contract } from "@ethersproject/contracts";
import { JsonRpcProvider } from "@ethersproject/providers";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import { Pair, Trade } from 'custom-uniswap-v2-sdk';
import Web3 from 'web3';
import { ERC20Coin } from '../model/coin';
import { Network } from '../model/networks/network';
import { LocalStorage } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class UniswapCurrencyService {
  public static instance: UniswapCurrencyService = null;

  private stopService = false;

  constructor(
    private http: HttpClient,
    private storage: LocalStorage
  ) {
    UniswapCurrencyService.instance = this;
  }

  init(): Promise<void> {
    this.stopService = false;
    return;
  }

  stop() {
    this.stopService = true;
  }

  /**
   * Approximate USD valuation of a given token.
   *
   * - Objective:
   *    We try to make a trade of X USDT (or other relevant USD 1:1 stable coin) and see how many
   *    tokens Y we can get. This gives us the current approximate USD price of token Y.
   * - Algorithm:
   *    - Build the list of all potential liquidity pool pairs that can lead from Token Y to USDT.
   *      - To build a Pair, we need to know the current amount of each token in the pool (call to getReserve())
   *      - As most tokens won't have a LP to USDT, we add Pairs that could lead to that. For instance, we may
   *        not be able to trade TELOS -> USDT directly, but if we add pairs TELOS-BNB and BNB-USDT, we can get a TELOS -> BNB -> USDT route for a trade.
   *
   * Note: trades use the wrapped versions of the native currency (ether, bnb, etc), not directly the native token.
   */
  async getTokenUSDValue(network: Network, erc20coin: ERC20Coin): Promise<number> {
    let currencyProvider = network.getUniswapCurrencyProvider();
    if (!currencyProvider)
      return 0;

    //Logger.log('walletdebug', "getTokenUSDValue", erc20coin.getName(), erc20coin.getContractAddress());

    let chainId = network.getMainChainID();
    let swapFactoryAddress = currencyProvider.getFactoryAddress();
    let swapFactoryInitCodeHash = currencyProvider.getFactoryInitCodeHash();
    let referenceUSDcoin = currencyProvider.getReferenceUSDCoin();
    let wrappedNativeCoin = currencyProvider.getWrappedNativeCoin();

    let evaluatedToken = new Token(chainId, erc20coin.getContractAddress(), erc20coin.getDecimals(), erc20coin.getID(), erc20coin.getName());
    let stableCoinUSDToken = new Token(chainId, referenceUSDcoin.getContractAddress(), referenceUSDcoin.getDecimals(), referenceUSDcoin.getID(), referenceUSDcoin.getName());
    let wrappedNativeCoinToken = new Token(chainId, wrappedNativeCoin.getContractAddress(), wrappedNativeCoin.getDecimals(), wrappedNativeCoin.getID(), wrappedNativeCoin.getName());

    let etherjsProvider = new JsonRpcProvider({ url: network.getMainEvmRpcApiUrl() });

    let tradingPairs: Pair[] = [];
    // Direct pair: Evaluated coin <-> USD stable coin
    await this.fetchAndAddPair(evaluatedToken, stableCoinUSDToken, tradingPairs, etherjsProvider, swapFactoryAddress, swapFactoryInitCodeHash);
    // Evaluated token against wrapped native token (ex: ADA <-> WBNB).
    // Note: later we can add more liquidity pairs here, not only including the wrapped native token, in order
    // to increase the possible routes.
    await this.fetchAndAddPair(evaluatedToken, wrappedNativeCoinToken, tradingPairs, etherjsProvider, swapFactoryAddress, swapFactoryInitCodeHash);
    // USD stable coin against wrapped native token (ex: USDT <-> WBNB).
    await this.fetchAndAddPair(stableCoinUSDToken, wrappedNativeCoinToken, tradingPairs, etherjsProvider, swapFactoryAddress, swapFactoryInitCodeHash);
    //Logger.log('walletdebug', "Computed Trading Pairs:", tradingPairs);

    let currencyAmountOut = CurrencyAmount.fromRawAmount(stableCoinUSDToken, Web3.utils.toWei("10")); // Fictive trade: purchase 10 USD worth of the token
    let trades = Trade.bestTradeExactOut(tradingPairs, evaluatedToken, currencyAmountOut, { maxHops: 3, maxNumResults: 1 });
    //Logger.log('walletdebug', "TRADES:", trades);
    if (trades.length > 0) {
      /* trades.forEach(trade => {
        Logger.log('walletdebug', "------");
        Logger.log('walletdebug', "TRADE:", trade);
        Logger.log('walletdebug', "TRADE ROUTE MIDPRICE:", trade.route.midPrice.toSignificant(6)) // 201.306
        Logger.log('walletdebug', "TRADE EXECPRICE:", trade.executionPrice.toSignificant(6)) // 201.306
        Logger.log('walletdebug', "TRADE IN AMOUNT:", trade.inputAmount.toSignificant(6)) // 201.306
        Logger.log('walletdebug', "TRADE OUT AMOUNT:", trade.outputAmount.toSignificant(6)) // 201.306
        Logger.log('walletdebug', "TRADE PRICE IMPACT:", trade.priceImpact.toSignificant(6), "%") // 201.306
      }); */

      return parseFloat(trades[0].executionPrice.toSignificant(6)); // NOTE: For display only! Not accurate
    }

    return 0; // No info found
  }

  private async fetchAndAddPair(tokenA: Token, tokenB: Token, pairs: Pair[], provider: JsonRpcProvider, factoryAddress: string, initCodeHash: string) {
    let pair = await this.fetchPairData(tokenA, tokenB, provider, factoryAddress, initCodeHash);
    if (pair)
      pairs.push(pair);
  }

  /**
     * Fetches information about a liquidity pair and constructs a pair from the given two tokens.
     */
  private async fetchPairData(tokenA: Token, tokenB: Token, provider: JsonRpcProvider, factoryAddress: string, initCodeHash: string): Promise<Pair> {
    try {
      var address = Pair.getAddress(tokenA, tokenB, factoryAddress, initCodeHash);
      let _ref = await new Contract(address, IUniswapV2Pair.abi, provider).getReserves();
      var reserves0 = _ref[0],
        reserves1 = _ref[1];
      var balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0];
      let currencyAmount0 = CurrencyAmount.fromRawAmount(tokenA, balances[0]);
      let currencyAmount1 = CurrencyAmount.fromRawAmount(tokenB, balances[1]);
      return new Pair(currencyAmount0, currencyAmount1, factoryAddress, initCodeHash);
    } catch (e) {
      return null;
    }
  }
}
