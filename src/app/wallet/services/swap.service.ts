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

import { Injectable } from '@angular/core';
import { DappBrowserService } from 'src/app/dappbrowser/services/dappbrowser.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { SwapProvider } from '../model/earn/swapprovider';
import { ERC20SubWallet } from '../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../model/wallets/subwallet';

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
    ) {

        SwapService.instance = this;
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

        void this.dappbrowserService.open(targetUrl, provider.baseProvider.name);
    }

}
