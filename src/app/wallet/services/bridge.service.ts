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

export type BridgeProvider = {
    logo: string; // Path to a local logo for this provider. Approx 200x200
    name: string; // User friendly name - ex: FilDA
    projectUrl: string; // Root project url - ex: anyswap.exchange
    bridgeUrl?: string; // Specific target url to bridge a specific coin
    bridgeableTokenContracts: string[]; // List of coins that can be bridged (contract addresses)
};

/**
 * Service responsible for managing token bridge features (bridge across different networks)
 *
 * Analysis:
 *
 */
@Injectable({
    providedIn: 'root'
})
export class BridgeService implements InAppBrowserClient {
    public static instance: BridgeService = null;

    private bridgeProviders: { [networkName: string]: BridgeProvider[] } = {
        "heco": [
            {
                logo: "/assets/wallet/earn/o3swap.png",
                name: "O3 Swap",
                projectUrl: "https://o3swap.com",
                bridgeUrl: "https://o3swap.com/hub",
                bridgeableTokenContracts: [
                    "0x0298c2b32eae4da002a15f36fdf7615bea3da047", // hUSD
                    "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd" // hETH
                ]
            },
        ]
    }

    /**
     * List of associated tokens on different networks. Used to suggest user that they can possibly
     * bridge and stake there.
     * 
     * TODO: later
     */
    /* private tokensMapping = [
        [
            // USDC
            { network: "heco", contract: "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b" },
            { network: "bsc", contract: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d" }
        ]
    ] */

    constructor(
        public httpClient: HttpClient, // InAppBrowserClient implementation
        public theme: GlobalThemeService, // InAppBrowserClient implementation
        public iab: InAppBrowser) {// InAppBrowserClient implementation

        BridgeService.instance = this;

        // Make sure all info in earn provides use lowercase contract addresses
        this.fixContractAddresses();
    }

    private fixContractAddresses() {
        for (let network of Object.values(this.bridgeProviders)) {
            network.forEach(p => {
                p.bridgeableTokenContracts = p.bridgeableTokenContracts.map(contractAddress => contractAddress.toLowerCase());
            });
        }
    }

    // TODO: optimize performance
    public getAvailableBridgeProviders(subWallet: AnySubWallet): BridgeProvider[] {
        let network = subWallet.networkWallet.network;
        let networkKey = network.key;

        if (networkKey in this.bridgeProviders) {
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
                let possibleProviders = this.bridgeProviders[networkKey].filter(p => {
                    return p.bridgeableTokenContracts.indexOf(erc20SubWallet.coin.getContractAddress()) >= 0;
                });
                return possibleProviders;
            }
        }
        else {
            return [];
        }
    }

    public openBridgeProvider(provider: BridgeProvider) {
        // Use the swap url (more accurate), if any, otherwise the default project url
        let targetUrl = provider.bridgeUrl || provider.projectUrl;

        void DAppBrowser.open(this, targetUrl, provider.name);
    }

    // On DAppBrowser exit
    onExit(data: IABExitData) {

    }
}
