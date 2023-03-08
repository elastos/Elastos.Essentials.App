import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import type { ERC20Coin } from '../../model/coin';
import type { EVMNetwork } from '../../model/networks/evms/evm.network';

const DexScreenerApi = 'https://api.dexscreener.com/latest/dex/tokens/';

@Injectable({
  providedIn: 'root'
})
export class DexScreenerCurrencyService {
  private limitatorName = 'dexscreener';

  constructor() {
    // Register a limitator to limit api requests speed.
    // API calls are limited to 300 requests per minute.
    GlobalJsonRPCService.instance.registerLimitator(this.limitatorName, {
        minRequestsInterval: 220 // 5 req per sec max = 1 request / 200 ms + some margin
    });
  }

  async getTokenUSDValue(network: EVMNetwork, erc20coin: ERC20Coin): Promise<number> {
    let coinAddress = erc20coin.getContractAddress();

    let currencyProvider = network.getDexScreenerCurrencyProvider();
    if (currencyProvider) {
        let referenceUSDCoin = currencyProvider.getReferenceUSDCoin();
        if (referenceUSDCoin.getContractAddress() == coinAddress) {
            return 1;
        }
    }

    try {
        let result = await this.fetchPairData(erc20coin);
        if (result && result.pairs) {
            for (let i = 0; i < result.pairs.length; i++) {
                let pair = result.pairs[i];
                if ((pair.chainId == network.key) && pair.priceUsd && (pair.baseToken.address.toLowerCase() === coinAddress)) {
                    // Check liquidity > 1000$
                    if (pair.liquidity && pair.liquidity.usd > 1000) {
                        return Number(pair.priceUsd);
                    }
                }
            }
        }
    } catch (e) {
        Logger.warn('DexScreenerCurrencyService', 'fetchPairData exception:', e);
    }
    return 0; // No info found
  }

  private async fetchPairData(erc20coin: ERC20Coin) {
    let contract = erc20coin.getContractAddress();
    let url = DexScreenerApi + contract;
    let result : {
        schemaVersion: string
        pairs : DexScreenerPair[]
    } = await GlobalJsonRPCService.instance.httpGet(url, this.limitatorName);
    return result;
  }
}


type Token = {
    address: string,
    name: string,
    symbol: string,
}

type DexScreenerPair = {
    chainId: string,
    dexId: string,
    url: string,
    pairAddress: string,
    baseToken: Token,
    quoteToken: Token,
    priceNative: string,
    priceUsd?: string,
    txns: {
        m5: {
            buys: number;
            sells: number;
        };
        h1: {
            buys: number;
            sells: number;
        };
        h6: {
            buys: number;
            sells: number;
        };
        h24: {
            buys: number;
            sells: number;
        };
    },
    volume: {
        h24: number,
        h6: number,
        h1: number,
        m5: number
    },
    priceChange: {
        h24: number,
        h6: number,
        h1: number,
        m5: number
    },
    liquidity?: {
        usd?: number,
        base: number,
        quote: number,
    },
    fdv?: number,
    pairCreateAt?: number,
}
