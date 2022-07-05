import { Injectable } from '@angular/core';
import type { Currency, NativeCurrency, Token, TradeType } from "@uniswap/sdk-core";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import BigNumber from 'bignumber.js';
import { lazyCustomUniswapSDKImport, lazyUniswapSDKCoreImport } from 'src/app/helpers/import.helper';
import { Logger } from 'src/app/logger';
import { Pair, Router, Trade } from 'src/app/thirdparty/custom-uniswap-v2-sdk/src';
import { EVMSafe } from 'src/app/wallet/model/networks/evms/safes/evm.safe';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { AddressUsage } from 'src/app/wallet/model/safes/addressusage';
import { Transfer } from 'src/app/wallet/services/cointransfer.service';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { EVMNetwork } from '../../wallet/model/networks/evms/evm.network';
import { AnyNetwork } from '../../wallet/model/networks/network';
import { EVMService } from '../../wallet/services/evm/evm.service';
import { BridgeableToken } from '../model/bridgeabletoken';
import { AnyNetworkNativeCurrency } from '../model/nativecurrency';

const MAX_SLIPPAGE_PERCENT = 5;

/**
 * Service used to get tokens conversion rates and swap on the main DEX of a given network.
 */
@Injectable({
  providedIn: 'root'
})
export class UniswapService {
  public static instance: UniswapService = null;

  private stopService = false;

  constructor(
    private evmService: EVMService,
    private erc20CoinService: ERC20CoinService
  ) {
    UniswapService.instance = this;
  }

  init(): Promise<void> {
    this.stopService = false;
    return;
  }

  stop() {
    this.stopService = true;
  }

  async computeSwap(network: EVMNetwork, sourceToken: BridgeableToken, sourceAmount: BigNumber, destToken: BridgeableToken): Promise<Trade<any, any, TradeType.EXACT_INPUT>> {
    let currencyProvider = network.getUniswapCurrencyProvider();
    if (!currencyProvider)
      throw new Error('computeSwap(): No currency provider found');

    Logger.log('easybridge', "estimateSwap", sourceToken.symbol, sourceToken.address);

    let chainId = network.getMainChainID();
    let swapFactoryAddress = currencyProvider.getFactoryAddress();
    let swapFactoryInitCodeHash = currencyProvider.getFactoryInitCodeHash();

    //let referenceUSDcoin = currencyProvider.getReferenceUSDCoin();
    let wrappedNativeCoin = currencyProvider.getWrappedNativeCoin();

    const { Token } = await lazyUniswapSDKCoreImport();
    //let stableCoinUSDToken = new Token(chainId, referenceUSDcoin.getContractAddress(), referenceUSDcoin.getDecimals(), referenceUSDcoin.getID(), referenceUSDcoin.getName());
    let wrappedNativeCoinToken = new Token(chainId, wrappedNativeCoin.getContractAddress(), wrappedNativeCoin.getDecimals(), wrappedNativeCoin.getID(), wrappedNativeCoin.getName());

    // NOTE: For this service, source is always a token as we just used the bridge to get tokens and that's not native ELA,
    // so we don't deal with native currencies here for now (very basic swap)
    let sourceUniswapToken: Token;
    if (sourceToken.isNative)
      sourceUniswapToken = wrappedNativeCoinToken; // Replace the native coin with the wrapped version in order to swap from the native coin
    else
      sourceUniswapToken = new Token(chainId, sourceToken.address, sourceToken.decimals, sourceToken.symbol, sourceToken.name);

    let destinationUniswapToken: Token; // any token
    let outputCurrency: Currency;
    if (destToken.isNative) {
      destinationUniswapToken = wrappedNativeCoinToken; // Replace the native coin with the wrapped version in order to swap to the native coin
      outputCurrency = await this.uniswapNativeCurrency(network);
    }
    else {
      destinationUniswapToken = new Token(chainId, destToken.address, destToken.decimals, destToken.symbol, destToken.name);
      outputCurrency = destinationUniswapToken;
    }

    let tradingPairs: Pair[] = [];

    try {
      let tokensForPairs: Token[] = [
        sourceUniswapToken,
        destinationUniswapToken,
        ...currencyProvider.getUsualSwapCoinsForPairs().map(t => new Token(chainId, t.getContractAddress(), t.getDecimals(), t.getID(), t.getName()))
      ];

      // Combine all tokens with others into pairs
      for (let t1 of tokensForPairs) {
        for (let t2 of tokensForPairs) {
          if (t1 === t2)
            continue;

          await this.fetchAndAddPair(t1, t2, tradingPairs, network, swapFactoryAddress, swapFactoryInitCodeHash);
        }
      }

      Logger.log('easybridge', "Computed Trading Pairs:", tradingPairs);
    }
    catch (e) {
      Logger.warn("easybridge", "Failed to fetch uniswap pairs to get token pricing:", sourceUniswapToken, network);
      return null;
    }

    if (tradingPairs.length == 0)
      return null; // No appropriate pairs could be built - should not happen

    const { Trade } = await lazyCustomUniswapSDKImport();

    const { CurrencyAmount } = await lazyUniswapSDKCoreImport();
    let currencyAmountIn = CurrencyAmount.fromRawAmount(sourceUniswapToken, sourceAmount.times(new BigNumber(10).pow(sourceUniswapToken.decimals)).toString(10));
    let trades = Trade.bestTradeExactIn(tradingPairs, currencyAmountIn, outputCurrency, { maxHops: 3, maxNumResults: 3 });
    //Logger.log('easybridge', "TOKENS:", evaluatedToken.name, stableCoinUSDToken.name, wrappedNativeCoinToken.name);
    if (trades.length > 0) {
      trades.forEach(trade => {
        Logger.log('easybridge', "------");
        Logger.log('easybridge', "TRADE:", trade);
        Logger.log('easybridge', "TRADE ROUTE MIDPRICE:", trade.route.midPrice.toSignificant(6)) // 201.306
        Logger.log('easybridge', "TRADE EXECPRICE:", trade.executionPrice.toSignificant(6)) // 201.306
        Logger.log('easybridge', "TRADE IN AMOUNT:", trade.inputAmount.toSignificant(6)) // 201.306
        Logger.log('easybridge', "TRADE OUT AMOUNT:", trade.outputAmount.toSignificant(6)) // 201.306
        Logger.log('easybridge', "TRADE PRICE IMPACT:", trade.priceImpact.toSignificant(6), "%") // 201.306
      });

      // Find the best trade
      let bestTrade = trades[0];
      for (let trade of trades) {
        // as we use exact inputs, the best trade is the one that gives us the more tokens as output
        if (trade.outputAmount.greaterThan(bestTrade.outputAmount))
          bestTrade = trade;
      }

      return bestTrade;
    }
    else {
      Logger.log("easybridge", "No trade found using pairs", tradingPairs);
    }

    return null; // No info found
  }

  private async fetchAndAddPair(tokenA: Token, tokenB: Token, pairs: Pair[], network: AnyNetwork, factoryAddress: string, initCodeHash: string) {
    // Check if the pair already exists. If it does, do nothing
    if (pairs.find(p =>
      p.token0.address === tokenA.address && p.token1.address === tokenB.address ||
      p.token1.address === tokenA.address && p.token0.address === tokenB.address))
      return;

    let pair = await this.fetchPairData(tokenA, tokenB, network, factoryAddress, initCodeHash);
    if (pair)
      pairs.push(pair);
  }

  /**
   * Fetches information about a liquidity pair and constructs a pair from the given two tokens.
   */
  private async fetchPairData(tokenA: Token, tokenB: Token, network: AnyNetwork, factoryAddress: string, initCodeHash: string): Promise<Pair> {
    // Can't fetch a pair made of a single token...
    if (tokenA.address === tokenB.address) {
      return null;
    }

    try {
      const { Pair } = await lazyCustomUniswapSDKImport();

      var address = Pair.getAddress(tokenA, tokenB, factoryAddress, initCodeHash);

      let uniswapPairContract = new (await EVMService.instance.getWeb3(network)).eth.Contract(<any>IUniswapV2Pair.abi, address);
      let _ref = await uniswapPairContract.methods.getReserves().call();

      var reserves0 = _ref[0],
        reserves1 = _ref[1];
      var balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0];

      const { CurrencyAmount } = await lazyUniswapSDKCoreImport();
      let currencyAmount0 = CurrencyAmount.fromRawAmount(tokenA, balances[0]);
      let currencyAmount1 = CurrencyAmount.fromRawAmount(tokenB, balances[1]);

      return new Pair(currencyAmount0, currencyAmount1, factoryAddress, initCodeHash);
    } catch (e) {
      // Silent, cause some pair combinations may not exist and this is normal.
      // Logger.log('easybridge', 'fetchPairData error', tokenA, tokenB, e);
      return null;
    }
  }

  /**
   * Executes the given swap on chain.
   * Returns the transaction ID, if published.
   */
  public async executeSwapTrade(mainCoinSubWallet: AnyMainCoinEVMSubWallet, sourceSwapToken: BridgeableToken, trade: Trade<any, any, TradeType.EXACT_INPUT>): Promise<string> {
    let network = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(sourceSwapToken.chainId);

    let walletAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);

    let currencyProvider = network.getUniswapCurrencyProvider();
    if (!currencyProvider)
      throw new Error('executeSwapTrade(): No currency provider found');

    const { Percent } = await lazyUniswapSDKCoreImport();
    let swapParams = Router.swapCallParameters(trade, {
      feeOnTransfer: true,
      allowedSlippage: new Percent(MAX_SLIPPAGE_PERCENT),
      recipient: walletAddress,
      ttl: 120 // 2 minutes validity
    });

    // TEST ONLY - TO RESET APPROVAL TO 0
    //await this.erc20CoinService.setSpendingApproval(mainCoinSubWallet, sourceSwapToken.address, sourceSwapToken.decimals, currencyProvider.getRouterAddress(), new BigNumber(0));
    //await sleep(10000)

    let amount = new BigNumber(trade.inputAmount.toExact()); // Human readable amount
    let chainAmount = this.erc20CoinService.toChainAmount(amount);
    await this.erc20CoinService.approveSpendingIfNeeded(mainCoinSubWallet, sourceSwapToken.address, sourceSwapToken.decimals, currencyProvider.getRouterAddress(), chainAmount);

    //return null; // TEST ONLY - TO RESET APPROVAL TO 0

    if (!swapParams)
      throw new Error("Unable to compute swap call parameters");

    let IUniswapV2Router02ABI = (await import('@uniswap/v2-periphery/build/IUniswapV2Router02.json')).abi as any;
    let contract = new (await this.evmService.getWeb3(network)).eth.Contract(IUniswapV2Router02ABI, currencyProvider.getRouterAddress(), { from: walletAddress });

    let swapMethod = await contract.methods[swapParams.methodName](...swapParams.args);

    // Estimate gas cost - don't catch, we need a real estimation from chain
    Logger.log("easybridge", "Estimating gas for the swap token method", walletAddress, swapMethod, swapParams);
    let gasTemp = await swapMethod.estimateGas({
      from: walletAddress,
      value: swapParams.value
    });
    // '* 1.5': Make sure the gaslimit is big enough - add a bit of margin for fluctuating gas price
    let gasLimit = Math.ceil(gasTemp * 1.5).toString();

    Logger.log("easybridge", "Getting nonce");
    let nonce = await this.evmService.getNonce(network, walletAddress);

    Logger.log("easybridge", "Getting gas price");
    const gasPrice = await this.evmService.getGasPrice(network);

    Logger.log("easybridge", "Creating unsigned transaction");
    let safe = <EVMSafe><unknown>mainCoinSubWallet.networkWallet.safe;
    let unsignedTx = await safe.createContractTransaction(currencyProvider.getRouterAddress(), swapParams.value, gasPrice, gasLimit, nonce, swapMethod.encodeABI());

    Logger.log("easybridge", "Created unsigned transaction", unsignedTx);

    Logger.log("easybridge", "Signing and sending transaction");
    const transfer = new Transfer();
    Object.assign(transfer, {
      masterWalletId: mainCoinSubWallet.networkWallet.masterWallet.id,
      subWalletId: mainCoinSubWallet.id,
    });
    let sendResult = await mainCoinSubWallet.signAndSendRawTransaction(unsignedTx, transfer, false, false, false);
    Logger.log("easybridge", "Signing and sending transaction result:", sendResult);

    if (!sendResult || !sendResult.published) {
      return null; // Failed to publish
    }
    else {
      return sendResult.txid;
    }
  }

  /**
   * Returns the given NativeCurrendy object, needed by the uniswap SDK to represent a native chain coin during swap
   * operations.
   */
  private async uniswapNativeCurrency(network: EVMNetwork): Promise<NativeCurrency> {
    let nativeCurrency = new AnyNetworkNativeCurrency(network);
    await nativeCurrency.initialize();
    return nativeCurrency;
  }
}
