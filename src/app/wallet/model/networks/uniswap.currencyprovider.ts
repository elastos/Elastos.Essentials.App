import { ERC20Coin } from "../coin";

/**
 * Base class implemented by each network in order to provide necessary information to fetch
 * ERC20 tokens valuation (ex: USD price) using the uniswap protocol.
 */
export abstract class UniswapCurrencyProvider {
  public abstract getFactoryAddress(): string;

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
}