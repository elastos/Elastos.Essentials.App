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
import { AnySubWallet } from '../model/wallets/subwallet';

/**
 * Service responsible for managing staking/earn features.
 */
@Injectable({
    providedIn: 'root'
})
export class EarnService {
    constructor() {
    }

    public canEarn(subWallet: AnySubWallet): boolean {
        let network = subWallet.networkWallet.network;

        // staking capabilities
        let config = {
            earnProviders: {
                "heco": [
                    {
                        name: "FilDA",
                        projectUrl: "https://filda.io",
                        stakingUrl: "https://filda.io/stake?coin=${coin}", // ability to have dynamic url formats
                        compoundCoins: [ // List of coins supporting the compound protocol
                            {
                                // can stake the main heco token
                                id: "ht"
                            },
                            {
                                // Filda USDT -> Heco USDT
                                cContract: "0xAab0C9561D5703e84867670Ac78f6b5b4b40A7c1", // fUSDT contract
                                underlyingContract: "0xa71edc38d189767582c38a3145b5873052c3e47a"
                                // This contract holds Heco USDT (21m$) == "Available Liquidity" on filda.io
                                // Heco USDT contract is at 0xa71edc38d189767582c38a3145b5873052c3e47a
                                // fUSDT contract has address 0xa71edc38d189767582c38a3145b5873052c3e47a in field "underlying"
                                // "underlying" is a field in the "CErc20Storage" contract inside the fUSDT contract. This
                                // is a part of the "compound" protocol for defi projects. cToken means "compound token" and is
                                // used to track the main token (ex: Heco USDT). Here, fUSDT is the cToken, HecoUSDT is fUSDT's underlying token

                                // Compound protocol github: https://github.com/compound-finance/compound-protocol
                                // When we stake HT, we sent HT to the fHT contract. Appears as main HT balance
                                // When we stake USDT, we sent USDT to the fUSDT contract. Appears in "tokens"->USDT's balance

                                // List of cTokens for the "heco channels project": https://channelsofficial.gitbook.io/channels-finance-english/overview/introduction-1/ctoken-smart-contract-address

                                //exchangeRate: 46.84299306114743, // 1 HUSD = 46.84299306114743 fHUSD
                            }
                        ]
                    }
                ]
            },
            crossnetworkrelated: [
                {
                    // USDT
                    "heco": "0x123",
                    "elastos": "0x234",
                    "bsc": "0x123"
                },
                {
                    // BNB
                    "heco": "0xaaa",
                    "bsc": "0xaaa"
                }
            ]
        }



    }
}


subwallet -> can earn: find coin address in earn providers for this network -> list of projects urls who
can stake