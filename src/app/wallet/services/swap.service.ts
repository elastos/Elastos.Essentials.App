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
 * Uniswap custom linking integration: https://docs.uniswap.org/protocol/V2/guides/interface-integration/custom-interface-linking
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
                // TODO: HT
                swappableTokenContracts: [
                    "0x25d2e80cb6b86881fd7e07dd263fb79f4abe033c", // MDX
                    "0x22c54ce8321a4015740ee1109d9cbc25815c46e6", // UNI
                    "0x0298c2b32eae4da002a15f36fdf7615bea3da047", // HUSD
                    "0xa71edc38d189767582c38a3145b5873052c3e47a", // USDT
                    "0x843af718ef25708765a8e0942f89edeae1d88df0", // ADA
                    "0x3d760a45d0887dfd89a2f5385a236b29cb46ed2a", // DAI
                    "0x40280E26A572745B1152A54D1D44F365DaA51618", // DOGE
                    "0xef3cebd77e0c52cb6f60875d9306397b5caca375", // HBCH
                    "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", // HDOT
                    "0xae3a768f9ab104c69a7cd6041fe16ffa235d1810", // HFIL
                    "0xecb56cf772b5c9a6907fb7d32387da2fcbfb63b4", // HLTC
                    "0x9e004545c59d359f6b7bfb06a26390b087717b42", // LINK
                    "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", // USDC
                    "0x5545153ccfca01fbd7dd11c0b23ba694d9509a6f", // WHT
                    "0xa2f3c2446a3e20049708838a779ff8782ce6645a", // XRP
                ]
            },
        ],
        "bsc": [
            {
                logo: "/assets/wallet/earn/mdex.png",
                name: "MDEX",
                projectUrl: "https://bsc.mdex.co/",
                swapUrl: "https://bsc.mdex.co/#/swap?inputCurrency=${inputCurrency}",
                // TODO: BNB
                swappableTokenContracts: [
                    "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
                    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
                    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
                    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
                    "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", // ADA
                    "0x8ff795a6f4d97e7887c79bea79aba5cc76444adf", // BCH
                    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // CAKE
                    "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", // DAI
                    "0xba2ae424d960c26247dd6c32edc70b295c744c43", // DOGE
                    "0x7083609fce4d1d8dc0c979aab8c869ea2c873402", // DOT
                    "0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153", // FIL
                    "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", // XRP
                    "0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd", // LINK
                    "0x9C65AB58d8d978DB963e63f2bfB7121627e3a739", // MDX
                    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // CAKE
                    "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", // UNI
                    "0x55d398326f99059ff775485246999027b3197955", // USDT
                    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
                    "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", // LTC
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
