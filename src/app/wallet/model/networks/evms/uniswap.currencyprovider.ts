import { ERC20Coin } from "../../coin";

/**
 * Base class implemented by each network in order to provide necessary information to fetch
 * ERC20 tokens valuation (ex: USD price) using the uniswap protocol.
 */
export abstract class UniswapCurrencyProvider {
  public abstract getFactoryAddress(): string;

  /**
   * Address of the router contract for this uniswap v2 DEX.
   * None defined by default. Used only for swap operations (easy elastos bridge on ESC) for now
   */
  public getRouterAddress(): string {
    return null;
  }

  /**
   * Returns swap fees (percentage, eg: 0.25 for 0.25%) used by this DEX while doing token swaps.
   * Used only for swap operations (easy elastos bridge on ESC) for now.
   */
  public getSwapFees(): number {
    return 0;
  }

  // NOTE: The init code hash can be find on the block explorer, on the factory contract, INIT_CODE_PAIR_HASH
  public abstract getFactoryInitCodeHash(): string;

  /**
   * ERC20 token used as reference to compute other ERC20 tokens on this network.
   * Usually, USDT, BUSD, USDC, etc (pegged to Fiat USD value).
   */
  public abstract getReferenceUSDCoin(): ERC20Coin;

  /**
   * Wrapped "ETH" for the network, used for swap operations and as art of a "mandatory" liquidity 
   * pair to compute trades.
   */
  public abstract getWrappedNativeCoin(): ERC20Coin;

  /**
   * Returns a list of coins that may be used to build swap pairs while computing trade routes.
   * - The wrapped coin doesn't need to be returned.
   */
  public getUsualSwapCoinsForPairs(): ERC20Coin[] {
    return [];
  }
}