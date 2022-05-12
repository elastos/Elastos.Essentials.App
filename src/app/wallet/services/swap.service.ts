/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import moment from 'moment';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { SwapProvider } from '../model/earn/swapprovider';
import { Network } from '../model/networks/network';
import { ERC20SubWallet } from '../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../model/wallets/subwallet';
import { WalletNetworkService } from './network.service';

type TokenListCacheEntry = {
    fetchTime: number; // Unix timestamp
    tokenAddresses: string[]; // List of swappable token addresses
}

type TokenListResponse = {
    keywords: string[]; // ie elkk, defi...
    logoURI: string;
    name: string; // List name - ie "Elk ELASTOS Tokens"
    timestamp: string; // last updated - ie "2021-10-17T15:43:53+00:00"
    tokens: {
        address: string; // ie "0xE1C110E1B1b4A1deD0cAf3E42BfBdbB7b5d7cE1C"
        chainId: number; // ie 20
        decimals: number; // ie 18
        logoURI: string; // ie "https://raw.githubusercontent.com/elkfinance/tokens/main/logos/elastos/0xE1C110E1B1b4A1deD0cAf3E42BfBdbB7b5d7cE1C/logo.png"
        name: string; // ie "Elk",
        symbol: string; // ie "ELK"
    }[]
}

const TOKEN_LIST_CACHE_REFRESH_MIN_TIME = (1 * 24 * 60 * 60); // Min duration between updates of a token list content, seconds

/**
 * Service responsible for managing token swap features (swap internally inside a network - not bridge)
 *
 * Analysis:
 *
 * Uniswap custom linking integration: https://docs.uniswap.org/protocol/V2/guides/interface-integration/custom-interface-linking
 *
 * Example of anyswap list of swappable tokens on HECO: https://github.com/anyswap/anyswap-frontend/blob/vi-new/src/contexts/Tokens/tokens/huobi.js
 *
 * TODO: UNISWAP/ETHEREUM: https://tokenlists.org/token-list?url=https://gateway.ipfs.io/ipns/tokens.uniswap.org
 */
@Injectable({
    providedIn: 'root'
})
export class SwapService {
    public static instance: SwapService = null;

    constructor(
        public theme: GlobalThemeService,
        public dappbrowserService: DappBrowserService,
        private networkService: WalletNetworkService,
        private storage: GlobalStorageService,
        private http: HttpClient
    ) {
        SwapService.instance = this;
    }

    public init() {
        this.networkService.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork) this.onActiveNetworkChanged(activeNetwork);
        });
    }

    // TODO: optimize performance
    public getAvailableSwapProviders(subWallet: AnySubWallet): SwapProvider[] {
        let network = subWallet.networkWallet.network;

        if (subWallet.isStandardSubWallet()) {
            let possibleProviders = network.swapProviders.filter(p => p.canSwapNativeToken);
            return possibleProviders;
        }
        else {
            // ERC20
            let erc20SubWallet = subWallet as ERC20SubWallet;
            let possibleProviders = network.swapProviders.filter(p => {
                return p.swappableTokenContracts.indexOf(erc20SubWallet.coin.getContractAddress()) >= 0;
            });
            return possibleProviders;
        }
    }

    public openSwapProvider(provider: SwapProvider, subWallet?: AnySubWallet) {
        // Use the swap url (more accurate), if any, otherwise the default project url
        let targetUrl = provider.swapUrl || provider.baseProvider.projectUrl;

        // Check if the url contains specific tag that we can replace for better UX (ex: directly open the right screen)
        var inputCurrency = "";
        if (subWallet && subWallet instanceof ERC20SubWallet) {
            inputCurrency = subWallet.coin.getContractAddress();
        }
        targetUrl = targetUrl.replace("${inputCurrency}", inputCurrency);
        targetUrl = targetUrl.replace("${theme}", this.theme.darkMode ? "dark" : "light");

        void this.dappbrowserService.openForBrowseMode(targetUrl, provider.baseProvider.name);
    }

    /**
     * Handle network changes so that we can refresh token lists tokens sometimes.
     */
    private onActiveNetworkChanged(network: Network) {
        void this.updateTokenLists(network);
    }

    private async updateTokenLists(network: Network) {
        let activeUserDID = GlobalDIDSessionsService.signedInDIDString;
        let currentTime = moment().unix();

        for (let provider of network.swapProviders) {
            for (let tokenListUrl of provider.swappableTokenLists) {
                let listCacheKey = network.key + tokenListUrl;
                let cacheEntry = await this.storage.getSetting<TokenListCacheEntry>(activeUserDID, "wallet", listCacheKey, null);
                if (!cacheEntry || moment.unix(cacheEntry.fetchTime).add(TOKEN_LIST_CACHE_REFRESH_MIN_TIME, "seconds").isBefore(currentTime)) {
                    // No cache, or expired cache: fetch the tokens list
                    Logger.log("wallet", "Fetching swap tokens list for", provider.baseProvider.name, "on network", network.name, tokenListUrl);
                    try {
                        let tokenListResponse = await this.http.get<TokenListResponse>(tokenListUrl).toPromise();
                        if (tokenListResponse) {
                            let tokensToSave = tokenListResponse.tokens.map(t => t.address.toLowerCase());

                            cacheEntry = {
                                fetchTime: currentTime,
                                tokenAddresses: tokensToSave
                            }

                            Logger.log("wallet", "Saving swap tokens list to cache", cacheEntry);
                            await this.storage.setSetting(activeUserDID, "wallet", listCacheKey, cacheEntry);
                        }
                    }
                    catch (e) {
                        // debugger;
                        Logger.warn("wallet", "Token list fetch failed:", e);
                    }
                }

                // Append token lists to provider's token addresses
                if (cacheEntry) {
                    cacheEntry.tokenAddresses.forEach(addr => {
                        if (provider.swappableTokenContracts.indexOf(addr) < 0)
                            provider.swappableTokenContracts.push(addr);
                    });
                }
            }
        }
    }
}