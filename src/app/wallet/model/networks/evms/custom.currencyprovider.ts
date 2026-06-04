import { ERC20Coin } from '../../coin';

/**
 * Base class implemented by each network in order to fetch
 * ERC20 tokens valuation using custom methods.
 */
export abstract class CustomCurrencyProvider {
  /**
   * Fetches (do not cache) the price of the given ERC20 token in any custom way needed.
   * For pricing coming from uniswap DEXs, use uniswap currency providers instead.
   *
   * @returns the current price of the token in USD, or undefined if no way to find it / failed.
   */
  public abstract getTokenPrice(erc20Token: ERC20Coin): Promise<number>;

  /**
   * Wrapped "ETH" for the network, used for swap operations and as art of a "mandatory" liquidity
   * pair to compute trades.
   */
  public abstract getWrappedNativeCoin(): ERC20Coin;
}
