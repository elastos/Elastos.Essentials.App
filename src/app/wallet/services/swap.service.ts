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
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { DAppBrowser, IABExitData, InAppBrowserClient } from 'src/app/model/dappbrowser/dappbrowser';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { ERC20SubWallet } from '../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../model/wallets/subwallet';

export type SwapProvider = {
    logo: string; // Path to a local logo for this provider. Approx 200x200
    name: string; // User friendly name - ex: FilDA
    projectUrl: string; // Root project url - ex: anyswap.exchange
    swapUrl?: string; // Specific target url to swap a specific coin
    swappableTokenContracts: string[]; // List of coins that can be swapped (contract addresses)
};

/**
 * Service responsible for managing token swap features (swap internally inside a network - not bridge)
 *
 * Analysis:
 *
 * Example of anyswap list of swappable tokens on HECO: https://github.com/anyswap/anyswap-frontend/blob/vi-new/src/contexts/Tokens/tokens/huobi.js
 *
 * TODO: UNISWAP/ETHEREUM: https://tokenlists.org/token-list?url=https://gateway.ipfs.io/ipns/tokens.uniswap.org
 */
@Injectable({
    providedIn: 'root'
})
export class SwapService implements InAppBrowserClient {
    public static instance: SwapService = null;

    private swapProviders: { [networkName: string]: SwapProvider[] } = {
        "heco": [
            {
                // https://github.com/anyswap/anyswap-frontend/blob/vi-new/src/contexts/Tokens/tokens/huobi.js
                logo: "/assets/wallet/earn/anyswap.png",
                name: "AnySwap",
                projectUrl: "https://anyswap.exchange/",
                swapUrl: "https://huobi.anyswap.exchange/swap?inputCurrency=${inputCurrency}&theme=${theme}",
                swappableTokenContracts: [
                    // TODO: How to handle "HT" ?
                    "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", // hBTC
                    "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", // hETH
                ]
            },
            {
                logo: "/assets/wallet/earn/o3swap.png",
                name: "O3 Swap",
                projectUrl: "https://o3swap.com",
                swapUrl: "https://o3swap.com/swap",
                swappableTokenContracts: [
                    "0xe36ffd17b2661eb57144ceaef942d95295e637f0", // Filda
                ]
            },
            {
                logo: "/assets/wallet/earn/mdex.png",
                name: "MDEX",
                projectUrl: "https://www.mdex.co",
                swapUrl: "https://ht.mdex.co/#/swap?inputCurrency=${inputCurrency}",
                swappableTokenContracts: [
                    "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b" // hUSDC
                ]
            },
        ]
    }

    constructor(
        public httpClient: HttpClient, // InAppBrowserClient implementation
        public theme: GlobalThemeService, // InAppBrowserClient implementation
        public iab: InAppBrowser) {// InAppBrowserClient implementation

        SwapService.instance = this;

        // Make sure all info in earn provides use lowercase contract addresses
        this.fixContractAddresses();
    }

    private fixContractAddresses() {
        for (let network of Object.values(this.swapProviders)) {
            network.forEach(p => {
                p.swappableTokenContracts = p.swappableTokenContracts.map(contractAddress => contractAddress.toLowerCase());
            });
        }
    }

    // TODO: optimize performance
    public getAvailableSwapProviders(subWallet: AnySubWallet): SwapProvider[] {
        let network = subWallet.networkWallet.network;
        let networkKey = network.key;

        if (networkKey in this.swapProviders) {
            if (subWallet.isStandardSubWallet()) {
                /* TODO let possibleProviders = this.swapProviders[networkKey].filter(p => {
                    // Let's find the only coin info, if any, without no underlyingERC20Contract (== main token)
                    let matchingCoin = p.swappableTokenContracts.find(cc => cc.underlyingERC20Contract === null);
                    return !!matchingCoin;
                });
                return possibleProviders; */
                return [];
            }
            else {
                // ERC20
                let erc20SubWallet = subWallet as ERC20SubWallet;
                let possibleProviders = this.swapProviders[networkKey].filter(p => {
                    return p.swappableTokenContracts.indexOf(erc20SubWallet.coin.getContractAddress()) >= 0;
                });
                return possibleProviders;
            }
        }
        else {
            return [];
        }
    }

    public openSwapProvider(provider: SwapProvider, subWallet?: AnySubWallet) {
        // Use the swap url (more accurate), if any, otherwise the default project url
        let targetUrl = provider.swapUrl || provider.projectUrl;

        // Check if the url contains specific tag that we can replace for better UX (ex: directly open the right screen)
        if (subWallet) {
            if (subWallet instanceof ERC20SubWallet) {
                targetUrl = targetUrl.replace("${inputCurrency}", subWallet.coin.getContractAddress());
                targetUrl = targetUrl.replace("${theme}", this.theme.darkMode ? "dark" : "light");
            }
        }

        void DAppBrowser.open(this, targetUrl, provider.name);
    }

    // On DAppBrowser exit
    onExit(data: IABExitData) {

    }
}
