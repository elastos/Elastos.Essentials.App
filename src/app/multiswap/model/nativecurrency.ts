import type { Currency, NativeCurrency, Token } from "@uniswap/sdk-core";
import { lazyUniswapSDKCoreImport } from "src/app/helpers/import.helper";
import type { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";

export class AnyNetworkNativeCurrency implements NativeCurrency {
  private wrappedToken: Token;

  isNative: true = true;
  isToken: false = false;

  public chainId: number;
  decimals = 18;
  symbol = 'Ether';
  name = 'Native coin on EVM chain';

  constructor(private network: EVMNetwork) {
    this.chainId = network.getMainChainID();
  }

  public async initialize(): Promise<void> {
    const { Token } = await lazyUniswapSDKCoreImport();
    let wrappedNativeCoin = this.network.getUniswapCurrencyProvider().getWrappedNativeCoin();
    this.wrappedToken = new Token(this.chainId, wrappedNativeCoin.getContractAddress(), wrappedNativeCoin.getDecimals(), wrappedNativeCoin.getID(), wrappedNativeCoin.getSymbol());
  }

  equals(other: Currency): boolean {
    return this.isNative && other.isNative || this.wrapped.address === this.wrappedToken.address;
  }

  get wrapped(): Token {
    return this.wrappedToken;
  }
}