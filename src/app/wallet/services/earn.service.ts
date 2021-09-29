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
import { EarnProvider } from '../model/earn/earnprovider';
import { ERC20SubWallet } from '../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../model/wallets/subwallet';

/**
 * Service responsible for managing staking/earn features.
 *
 * Analysis:
 *
 * Many Defi projects use the "compound protocol" for staking
 * The compound protocol provides a set of contract interfacesto define the compound token (fUSDT) and its underlying (USDT)

 * If cToken contracts, the amount of held Heco USDT (for example) is the "Available Liquidity" (ex: on filda.io)
 * cContracts hold the main token address in "underlying"
 * "underlying" is a field in the "CErc20Storage" contract inside the fUSDT contract. This
 * is a part of the "compound" protocol for defi projects. cToken means "compound token" and is
 * used to track the main token (ex: Heco USDT). Here, fUSDT is the cToken, HecoUSDT is fUSDT's underlying token
 *
 * Compound protocol github: https://github.com/compound-finance/compound-protocol
 *    When we stake HT, we sent HT to the fHT contract. Appears as main HT balance
 *    When we stake USDT, we sent USDT to the fUSDT contract. Appears in "tokens"->USDT's balance
 *
 * For main tokens (ex: HT on heco), a CEther contract ie deployed (CToken which wraps Ether)
 * For ERC20 tokens, CErc20Delegator is deployed (CTokens which wrap an EIP-20 underlying and delegate to an implementation)
 *
 * Exchange rate can be (probably) found by calling "exchangeRateStored". Ex: 1 HUSD = 46.84299306114743 fHUSD
 */
@Injectable({
    providedIn: 'root'
})
export class EarnService implements InAppBrowserClient {
    public static instance: EarnService = null;

    constructor(
        public httpClient: HttpClient, // InAppBrowserClient implementation
        public theme: GlobalThemeService, // InAppBrowserClient implementation
        public iab: InAppBrowser) {// InAppBrowserClient implementation

        EarnService.instance = this;
    }

    // TODO: optimize performance
    public getAvailableEarnProviders(subWallet: AnySubWallet): EarnProvider[] {
        let network = subWallet.networkWallet.network;
        let networkKey = network.key;

        if (subWallet.isStandardSubWallet()) {
            let possibleProviders = network.earnProviders.filter(p => {
                // Let's find the only coin info, if any, without no underlyingERC20Contract (== main token)
                let matchingCoin = p.compoundCoins.find(cc => cc.underlyingERC20Contract === undefined);
                return !!matchingCoin;
            });
            return possibleProviders;
        }
        else {
            // ERC20
            let erc20SubWallet = subWallet as ERC20SubWallet;
            let possibleProviders = network.earnProviders.filter(p => {
                // Compound contracts
                let matchingCoin = p.compoundCoins.find(cc => {
                    return cc.underlyingERC20Contract == erc20SubWallet.coin.getContractAddress()
                });
                if (!matchingCoin) {
                    // Additional ERC20 coins that can be handled but not using the compound protocol
                    if ("additionalCoins" in p) {
                        if (p.additionalCoins.indexOf(erc20SubWallet.coin.getContractAddress()) >= 0)
                            return true;
                    }
                }

                return !!matchingCoin;
            });
            return possibleProviders;
        }
    }

    public openEarnProvider(provider: EarnProvider) {
        // Use the staking url (more accurate), if any, otherwise the default project url
        let targetUrl = provider.depositUrl || provider.baseProvider.projectUrl;

        void DAppBrowser.open(this, targetUrl, provider.baseProvider.name);
    }

    // On DAppBrowser exit
    onExit(data: IABExitData) {

    }
}
