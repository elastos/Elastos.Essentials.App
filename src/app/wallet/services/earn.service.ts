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
import { ERC20SubWallet } from '../model/wallets/erc20.subwallet';
import { AnySubWallet } from '../model/wallets/subwallet';

type CompoundCoinInfo = {
    cContract: string; // Ex: fUSDT contract address -
    underlyingERC20Contract?: string; // Ex: USDT contract address - No underlying contract means main token. Matches with ERC20 contracts
}

export type EarnProvider = {
    logo: string; // Path to a local logo for this provider. Approx 200x200
    name: string; // User friendly name - ex: FilDA
    projectUrl: string; // Root project url - ex: filda.io
    stakingUrl?: string; // Specific target url to stake a specific coin
    compoundCoins: CompoundCoinInfo[]; // List of coins that can be staked using the compound protocol
};

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
 * List of cTokens for the "heco channels project": https://channelsofficial.gitbook.io/channels-finance-english/overview/introduction-1/ctoken-smart-contract-address
 *
 * Exchange rate can be (probably) found by calling "exchangeRateStored". Ex: 1 HUSD = 46.84299306114743 fHUSD
 */
@Injectable({
    providedIn: 'root'
})
export class EarnService {
    public static instance: EarnService = null;

    // TODO: Move to each network
    private earnProviders: { [networkName: string]: EarnProvider[] } = {
        "heco": [
            {
                logo: "/assets/wallet/earn/filda.png",
                name: "FilDA",
                projectUrl: "https://filda.io",
                stakingUrl: "https://filda.io/stake?coin=${coin}", // Ability to have dynamic url formats
                compoundCoins: [
                    {
                        cContract: "0x824151251B38056d54A15E56B73c54ba44811aF8", // fHT contract
                    },
                    {
                        cContract: "0xAab0C9561D5703e84867670Ac78f6b5b4b40A7c1", // fUSDT contract
                        underlyingERC20Contract: "0xa71edc38d189767582c38a3145b5873052c3e47a" // Heco USDT contract
                    }
                ]
            },
            {
                logo: "/assets/wallet/earn/channels.png",
                name: "Channels",
                projectUrl: "https://app.channels.finance",
                stakingUrl: "https://app.channels.finance",
                compoundCoins: [
                    {
                        cContract: "0x3dA74C09ccb8faBa3153b7f6189dDA9d7F28156A", // cUSDT contract
                        underlyingERC20Contract: "0xa71edc38d189767582c38a3145b5873052c3e47a" // Heco USDT contract
                    }
                ]
            }
        ]
    }
    // staking capabilities
    /* let config = {

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
    } */

    constructor() {
        EarnService.instance = this;

        // Make sure all info in earn provides use lowercase contract addresses
        this.fixContractAddresses();
    }

    private fixContractAddresses() {
        for (let network of Object.values(this.earnProviders)) {
            network.forEach(p => {
                p.compoundCoins.forEach(cc => {
                    cc.cContract = cc.cContract.toLowerCase();
                    if (cc.underlyingERC20Contract)
                        cc.underlyingERC20Contract = cc.underlyingERC20Contract.toLowerCase();
                })
            });
        }
    }

    // TODO: optimize performance
    public getAvailableEarnProviders(subWallet: AnySubWallet): EarnProvider[] {
        let network = subWallet.networkWallet.network;
        let networkKey = network.key;

        if (networkKey in this.earnProviders) {
            if (subWallet.isStandardSubWallet()) {
                let possibleProviders = this.earnProviders[networkKey].filter(p => {
                    // Let's find the only coin info, if any, without no underlyingERC20Contract (== main token)
                    let matchingCoin = p.compoundCoins.find(cc => cc.underlyingERC20Contract === null);
                    return !!matchingCoin;
                });
                return possibleProviders;
            }
            else {
                // ERC20
                let erc20SubWallet = subWallet as ERC20SubWallet;
                let possibleProviders = this.earnProviders[networkKey].filter(p => {
                    let matchingCoin = p.compoundCoins.find(cc => {
                        return cc.underlyingERC20Contract == erc20SubWallet.coin.getContractAddress()
                    });

                    return !!matchingCoin;
                });
                return possibleProviders;
            }
        }
        else {
            return [];
        }
    }
}
